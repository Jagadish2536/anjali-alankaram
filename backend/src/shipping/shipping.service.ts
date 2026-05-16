import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private async getAuthToken() {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    const email = this.config.get('SHIPROCKET_EMAIL');
    const password = this.config.get('SHIPROCKET_PASSWORD');

    if (!email || !password) {
      this.logger.warn('Shiprocket credentials not configured');
      return null;
    }

    try {
      const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
        email,
        password,
      });

      this.token = response.data.token;
      // Shiprocket tokens usually expire in 10 days, setting it to 9 days to be safe
      this.tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000; 
      return this.token;
    } catch (error) {
      this.logger.error('Failed to authenticate with Shiprocket', error.message);
      return null;
    }
  }

  async createShipment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        user: true,
      },
    });

    if (!order) return;

    const token = await this.getAuthToken();
    if (!token) return;

    try {
      const payload = {
        order_id: order.orderNumber,
        order_date: order.createdAt.toISOString().split('T')[0],
        pickup_location: "Primary",
        billing_customer_name: order.address.name,
        billing_last_name: "",
        billing_address: order.address.line1,
        billing_address_2: order.address.line2 || "",
        billing_city: order.address.city,
        billing_pincode: order.address.pincode,
        billing_state: order.address.state,
        billing_country: order.address.country,
        billing_email: order.user.email || 'customer@anjalialankaram.com',
        billing_phone: order.address.phone,
        shipping_is_billing: true,
        order_items: order.items.map(item => ({
          name: item.productName,
          sku: (item.variantInfo as any).size,
          units: item.quantity,
          selling_price: Number(item.unitPrice),
        })),
        payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
        shipping_charges: Number(order.shippingCharge),
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: Number(order.discountAmount),
        sub_total: Number(order.totalAmount),
        length: 10,
        breadth: 10,
        height: 10,
        weight: 0.5 * order.items.reduce((sum, item) => sum + item.quantity, 0), // Estimate 500g per item
      };

      const response = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.order_id) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            shiprocketOrderId: response.data.order_id.toString(),
            shiprocketShipmentId: response.data.shipment_id?.toString(),
          }
        });
      }
    } catch (error) {
      this.logger.error(`Failed to create shipment for order ${orderId}`, error.message);
    }
  }

  async trackShipment(awbCode: string) {
     const token = await this.getAuthToken();
     if (!token) return null;

     try {
       const response = await axios.get(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awbCode}`, {
         headers: { Authorization: `Bearer ${token}` }
       });
       return response.data;
     } catch (error) {
       this.logger.error(`Failed to track AWB ${awbCode}`, error.message);
       return null;
     }
  }
}

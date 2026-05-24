import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

// ─── Mock shipping providers ────────────────────────────────────────
// Structure is designed so real providers (Delhivery, BlueDart, DTDC)
// can be swapped in by implementing the ShippingProvider interface.

interface ShippingProvider {
  name: string;
  createShipment(data: any): Promise<{ awb: string; trackingUrl: string; label?: string }>;
  trackShipment(awb: string): Promise<TrackingEvent[]>;
}

export interface TrackingEvent {
  status: string;
  location: string;
  timestamp: Date;
  description: string;
}

// ─── Mock Provider ────────────────────────────────────────────────

class MockShippingProvider implements ShippingProvider {
  name = 'MockCourier';

  async createShipment(data: any) {
    // Simulate AWB generation
    const awb = `MC${Date.now()}${Math.floor(Math.random() * 10000)}`;
    return {
      awb,
      trackingUrl: `https://mock-tracking.anjalialankaram.com/track/${awb}`,
    };
  }

  async trackShipment(awb: string): Promise<TrackingEvent[]> {
    // Mock tracking events
    return [
      {
        status: 'Shipment Picked Up',
        location: 'Warehouse',
        timestamp: new Date(Date.now() - 86400000 * 2),
        description: 'Package picked up from warehouse',
      },
      {
        status: 'In Transit',
        location: 'Delhi Hub',
        timestamp: new Date(Date.now() - 86400000),
        description: 'Package in transit to destination',
      },
      {
        status: 'Out for Delivery',
        location: 'Local Hub',
        timestamp: new Date(Date.now() - 3600000 * 2),
        description: 'Package out for delivery',
      },
      {
        status: 'Delivered',
        location: 'Customer Doorstep',
        timestamp: new Date(Date.now() - 600000),
        description: 'Package successfully delivered to customer',
      },
    ];
  }
}

// ─── Shiprocket Provider ──────────────────────────────────────────

class ShiprocketProvider implements ShippingProvider {
  name = 'Shiprocket';
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private logger = new Logger('ShiprocketProvider');

  constructor(private email: string, private password: string) {}

  private async getToken() {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;
    try {
      const res = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
        email: this.email, password: this.password,
      });
      this.token = res.data.token;
      this.tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
      return this.token;
    } catch (e) {
      this.logger.error('Shiprocket auth failed', e.message);
      return null;
    }
  }

  async createShipment(data: any) {
    const token = await this.getToken();
    if (!token) throw new Error('Shiprocket auth failed');

    const res = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
      data, { headers: { Authorization: `Bearer ${token}` } },
    );

    return {
      awb: res.data.awb_code || `SR${res.data.order_id}`,
      trackingUrl: `https://shiprocket.co/tracking/${res.data.awb_code}`,
    };
  }

  async trackShipment(awb: string): Promise<TrackingEvent[]> {
    const token = await this.getToken();
    if (!token) return [];
    const res = await axios.get(
      `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return res.data?.tracking_data?.shipment_track_activities?.map((a: any) => ({
      status: a['sr-status-label'],
      location: a.location,
      timestamp: new Date(a.date),
      description: a.activity,
    })) ?? [];
  }
}

// ─── Main Shipping Service ────────────────────────────────────────

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private provider: ShippingProvider;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const email = config.get('SHIPROCKET_EMAIL');
    const password = config.get('SHIPROCKET_PASSWORD');

    if (email && password) {
      this.provider = new ShiprocketProvider(email, password);
      this.logger.log('Using Shiprocket shipping provider');
    } else {
      this.provider = new MockShippingProvider();
      this.logger.warn('Using Mock shipping provider (no Shiprocket credentials)');
    }
  }

  async createShipment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, address: true, user: true },
    });
    if (!order) return;

    try {
      // Build provider-agnostic payload
      const payload = {
        order_id: order.orderNumber,
        order_date: order.createdAt.toISOString().split('T')[0],
        pickup_location: 'Primary',
        billing_customer_name: order.address.name,
        billing_address: order.address.line1,
        billing_address_2: order.address.line2 || '',
        billing_city: order.address.city,
        billing_pincode: order.address.pincode,
        billing_state: order.address.state,
        billing_country: order.address.country,
        billing_email: order.user?.email || 'customer@anjalialankaram.com',
        billing_phone: order.address.phone,
        shipping_is_billing: true,
        order_items: order.items.map((item) => ({
          name: item.productName,
          sku: item.sku || (item.variantInfo as any)?.size,
          units: item.quantity,
          selling_price: Number(item.unitPrice),
        })),
        payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
        sub_total: Number(order.totalAmount),
        length: 25, breadth: 20, height: 10,
        weight: 0.5 * order.items.reduce((s, i) => s + i.quantity, 0),
      };

      const result = await this.provider.createShipment(payload);

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          awbCode: result.awb,
          trackingUrl: result.trackingUrl,
          courierName: this.provider.name,
          status: 'SHIPPED',
          shippedAt: new Date(),
        },
      });

      this.logger.log(`Shipment created for order ${orderId}: AWB ${result.awb}`);
      return result;
    } catch (e) {
      this.logger.error(`Shipment creation failed for ${orderId}: ${e.message}`);
    }
  }

  async trackShipment(awb: string) {
    try {
      return await this.provider.trackShipment(awb);
    } catch (e) {
      this.logger.error(`Tracking failed for AWB ${awb}: ${e.message}`);
      return [];
    }
  }

  // ─── Delivery estimation by pincode zone ─────────────────────────

  async estimateDelivery(pincode: string): Promise<{ days: number; date: Date; zone: string }> {
    // Zone-based estimation (can be replaced with real courier API)
    const zone = this.getPincodeZone(pincode);
    const days = zone === 'LOCAL' ? 1 : zone === 'REGIONAL' ? 3 : zone === 'NATIONAL' ? 5 : 7;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + days);

    return { days, date: deliveryDate, zone };
  }

  private getPincodeZone(pincode: string): string {
    const prefix = pincode.substring(0, 2);
    // Simplified Indian postal zone mapping
    if (['11', '12', '13'].includes(prefix)) return 'LOCAL';         // Delhi NCR
    if (['40', '41', '42', '43'].includes(prefix)) return 'LOCAL';   // Mumbai
    if (['56', '57', '58'].includes(prefix)) return 'LOCAL';         // Bangalore
    if (prefix >= '10' && prefix <= '59') return 'REGIONAL';
    return 'NATIONAL';
  }
}

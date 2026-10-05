import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TrackingEvent } from './shipping.service';

export interface DtdcCreateShipmentResult {
  awb: string;
  referenceNumber: string;
  trackingUrl: string;
  raw: any;
}

export interface DtdcCancelResult {
  success: boolean;
  referenceNumber?: string;
  raw: any;
}

@Injectable()
export class DtdcService {
  private readonly logger = new Logger(DtdcService.name);

  // Cached tracking auth token with TTL (2 hours)
  private trackingToken: string | null = null;
  private trackingTokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  /**
   * Determine if running in staging or production
   */
  get isProduction(): boolean {
    const env = (this.config.get<string>('DTDC_ENV') || 'staging').toLowerCase();
    return env === 'production' || env === 'prod' || env === 'live';
  }

  /**
   * Shipsy Base URL (Consignment creation, label, cancel)
   */
  get consignmentBaseUrl(): string {
    return this.isProduction
      ? 'https://pxapi.dtdc.in'
      : 'https://alphademodashboardapi.shipsy.io';
  }

  /**
   * Tracking API Base URLs
   */
  get trackingAuthUrl(): string {
    return this.isProduction
      ? 'https://blktracksvc.dtdc.com/dtdc-api/api/dtdc/authenticate'
      : 'https://dtdcstagingapi.dtdc.com/dtdc-api/api/dtdc/authenticate';
  }

  get trackingDetailsUrl(): string {
    return this.isProduction
      ? 'https://blktracksvc.dtdc.com/dtdc-api/rest/JSONCnTrk/getTrackDetails'
      : 'https://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/rest/JSONCnTrk/getTrackDetails';
  }

  get apiKey(): string {
    return this.config.get<string>('DTDC_API_KEY') || '';
  }

  get customerCode(): string {
    return this.config.get<string>('DTDC_CUSTOMER_CODE') || 'anjalialankaram001';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.customerCode);
  }

  getConfigStatus() {
    return {
      environment: this.isProduction ? 'production' : 'staging',
      consignmentBaseUrl: this.consignmentBaseUrl,
      customerCode: this.customerCode,
      hasApiKey: Boolean(this.apiKey),
      hasTrackingCreds: Boolean(
        this.config.get('DTDC_TRACKING_USERNAME') &&
        this.config.get('DTDC_TRACKING_PASSWORD'),
      ),
      originWarehouse: {
        name: this.config.get('DTDC_ORIGIN_NAME') || 'Anjali Alankaram',
        phone: this.config.get('DTDC_ORIGIN_PHONE') || '8919045363',
        pincode: this.config.get('DTDC_ORIGIN_PINCODE') || '535002',
        city: this.config.get('DTDC_ORIGIN_CITY') || 'Vizianagaram',
        state: this.config.get('DTDC_ORIGIN_STATE') || 'Andhra Pradesh',
      },
    };
  }

  /**
   * 1. DTDC Order Upload / Softdata API (Ver 2.0)
   * Creates a forward consignment and returns the generated AWB number.
   */
  async createShipment(
    order: any,
    options?: {
      serviceType?: string;
      weightKg?: number;
      length?: number;
      width?: number;
      height?: number;
      declaredValue?: number;
      description?: string;
    },
  ): Promise<DtdcCreateShipmentResult> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'DTDC API key or customer code is not configured. Please check DTDC environment variables.',
      );
    }

    const isCod = order.paymentMethod === 'COD';
    const totalAmount = Number(order.totalAmount || 0);

    // Calculate dimensions & weight
    const totalItemsCount = order.items?.reduce((s: number, i: any) => s + (i.quantity || 1), 0) || 1;
    const computedWeight = options?.weightKg || Math.max(0.5, totalItemsCount * 0.4);
    const weightStr = computedWeight.toFixed(2);

    const lengthStr = (options?.length || 20).toString();
    const widthStr = (options?.width || 15).toString();
    const heightStr = (options?.height || 10).toString();

    const declaredValue = (options?.declaredValue || totalAmount || 500).toFixed(2);
    const serviceType = options?.serviceType || 'B2C PRIORITY';

    // Format invoice date e.g. "14 Oct 2026"
    const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const invoiceDateStr = orderDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const originName = this.config.get('DTDC_ORIGIN_NAME') || 'Anjali Alankaram';
    const originPhone = this.config.get('DTDC_ORIGIN_PHONE') || '8919045363';
    const originPincode = this.config.get('DTDC_ORIGIN_PINCODE') || '535002';
    const originCity = this.config.get('DTDC_ORIGIN_CITY') || 'Vizianagaram';
    const originState = this.config.get('DTDC_ORIGIN_STATE') || 'Andhra Pradesh';
    const originAddress =
      this.config.get('DTDC_ORIGIN_ADDRESS_LINE1') ||
      'Pusapatirega, Near DTDC Franchise VF1657';

    // Destination address from order
    const dest = order.address || {};
    const destPhone = (dest.phone || order.user?.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10);
    const destName = dest.name || order.user?.name || 'Valued Customer';
    const destPincode = (dest.pincode || '').replace(/[^0-9]/g, '');
    const destCity = dest.city || 'Destination';
    const destState = dest.state || 'India';
    const destLine1 = dest.line1 || dest.address || 'Address line 1';
    const destLine2 = dest.line2 || '';

    const consignmentPayload = {
      consignments: [
        {
          customer_code: this.customerCode,
          service_type_id: serviceType,
          load_type: 'NON-DOCUMENT',
          consignment_type: 'Forward',
          description: options?.description || `Order ${order.orderNumber} - Anjali Alankaram`,
          dimension_unit: 'cm',
          length: lengthStr,
          width: widthStr,
          height: heightStr,
          weight_unit: 'kg',
          weight: weightStr,
          declared_value: declaredValue,
          num_pieces: '1',
          origin_details: {
            name: originName,
            phone: originPhone,
            alternate_phone: '',
            address_line_1: originAddress,
            address_line_2: '',
            pincode: originPincode,
            city: originCity,
            state: originState,
          },
          destination_details: {
            name: destName,
            phone: destPhone,
            alternate_phone: '',
            address_line_1: destLine1,
            address_line_2: destLine2,
            pincode: destPincode,
            city: destCity,
            state: destState,
          },
          return_details: {
            name: originName,
            phone: originPhone,
            address_line_1: originAddress,
            address_line_2: '',
            pincode: originPincode,
            city_name: originCity,
            state_name: originState,
          },
          customer_reference_number: order.orderNumber,
          cod_collection_mode: isCod ? 'CASH' : '',
          cod_amount: isCod ? totalAmount.toFixed(2) : '',
          commodity_id: 'Apparel',
          is_risk_surcharge_applicable: false,
          invoice_number: `INV-${order.orderNumber}`,
          invoice_date: invoiceDateStr,
          reference_number: '',
        },
      ],
    };

    const url = `${this.consignmentBaseUrl}/api/customer/integration/consignment/softdata`;
    this.logger.log(`Booking DTDC consignment for order ${order.orderNumber} at ${url}`);

    try {
      const response = await axios.post(url, consignmentPayload, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        timeout: 20000,
      });

      const responseData = response.data;
      const consignmentRes = responseData?.data?.[0];

      if (!consignmentRes || consignmentRes.success === false) {
        const errorReason =
          consignmentRes?.message ||
          consignmentRes?.error ||
          JSON.stringify(responseData);
        throw new Error(`DTDC consignment rejected: ${errorReason}`);
      }

      const awb = consignmentRes.reference_number;
      if (!awb) {
        throw new Error(
          `DTDC returned success but no reference_number (AWB) found: ${JSON.stringify(responseData)}`,
        );
      }

      const trackingUrl = `https://www.dtdc.in/tracking/tracking-results.xhtml?shipmentNumber=${awb}`;

      this.logger.log(
        `Successfully booked DTDC consignment for order ${order.orderNumber}: AWB ${awb}`,
      );

      return {
        awb,
        referenceNumber: awb,
        trackingUrl,
        raw: responseData,
      };
    } catch (e: any) {
      const errMsg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      this.logger.error(`DTDC createShipment failed for ${order.orderNumber}: ${errMsg}`);
      throw new BadRequestException(`DTDC Booking Failed: ${errMsg}`);
    }
  }

  /**
   * 2. DTDC Shipping Label API (Ver 2.0)
   * Streams raw PDF or base64 representation of shipping label.
   */
  async getShippingLabel(
    awb: string,
    labelCode: string = 'SHIP_LABEL_4X6',
    format: 'pdf' | 'base64' = 'pdf',
  ): Promise<{ data: Buffer | string; contentType: string; filename: string }> {
    if (!this.apiKey) {
      throw new BadRequestException('DTDC_API_KEY is not configured');
    }

    const cleanAwb = awb.trim();
    const url = `${this.consignmentBaseUrl}/api/customer/integration/consignment/shippinglabel/stream`;

    try {
      if (format === 'base64') {
        const res = await axios.get(url, {
          params: {
            reference_number: cleanAwb,
            label_code: labelCode,
            label_format: 'base64',
          },
          headers: { 'api-key': this.apiKey },
          timeout: 20000,
        });

        return {
          data: res.data?.label || res.data,
          contentType: 'application/json',
          filename: `DTDC-${cleanAwb}-${labelCode}.json`,
        };
      }

      // Default: Raw PDF stream
      const res = await axios.get(url, {
        params: {
          reference_number: cleanAwb,
          label_code: labelCode,
          label_format: 'pdf',
        },
        headers: { 'api-key': this.apiKey },
        responseType: 'arraybuffer',
        timeout: 25000,
      });

      return {
        data: Buffer.from(res.data),
        contentType: 'application/pdf',
        filename: `DTDC-Label-${cleanAwb}.pdf`,
      };
    } catch (e: any) {
      const errMsg = e.response?.data
        ? Buffer.isBuffer(e.response.data)
          ? e.response.data.toString('utf8')
          : JSON.stringify(e.response.data)
        : e.message;
      this.logger.error(`DTDC getShippingLabel failed for ${cleanAwb}: ${errMsg}`);
      throw new BadRequestException(`DTDC Label Download Failed: ${errMsg}`);
    }
  }

  /**
   * 3. DTDC Cancellation API (Ver 2.0)
   * Cancels booked consignment prior to dispatch.
   */
  async cancelShipment(awb: string): Promise<DtdcCancelResult> {
    if (!this.isConfigured()) {
      throw new BadRequestException('DTDC API key or customer code is not configured');
    }

    const cleanAwb = awb.trim();
    const url = `${this.consignmentBaseUrl}/api/customer/integration/consignment/cancel`;

    try {
      const res = await axios.post(
        url,
        {
          AWBNo: [cleanAwb],
          customerCode: this.customerCode,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
          },
          timeout: 15000,
        },
      );

      const successItem = res.data?.successConsignments?.find(
        (c: any) => c.reference_number === cleanAwb || c.success === true,
      );

      return {
        success: Boolean(res.data?.success || successItem?.success),
        referenceNumber: successItem?.reference_number || cleanAwb,
        raw: res.data,
      };
    } catch (e: any) {
      const errMsg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      this.logger.error(`DTDC cancelShipment failed for ${cleanAwb}: ${errMsg}`);
      throw new BadRequestException(`DTDC Cancellation Failed: ${errMsg}`);
    }
  }

  /**
   * 4. DTDC REST Tracking V4 API (JSON Based)
   */
  private async getTrackingToken(): Promise<string | null> {
    const username = this.config.get<string>('DTDC_TRACKING_USERNAME');
    const password = this.config.get<string>('DTDC_TRACKING_PASSWORD');

    if (!username || !password) {
      this.logger.warn('DTDC tracking credentials (username/password) are not set');
      return null;
    }

    if (this.trackingToken && Date.now() < this.trackingTokenExpiresAt) {
      return this.trackingToken;
    }

    try {
      const url = `${this.trackingAuthUrl}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const res = await axios.get(url, { timeout: 10000 });

      // Token is returned in body either as a string or in JSON { token: '...' }
      const token = typeof res.data === 'string' ? res.data.trim() : res.data?.token || res.data?.access_token;
      if (token) {
        this.trackingToken = token;
        // Expire in 2 hours
        this.trackingTokenExpiresAt = Date.now() + 2 * 60 * 60 * 1000;
        return this.trackingToken;
      }
      return null;
    } catch (e: any) {
      this.logger.error(`DTDC tracking auth failed: ${e.message}`);
      return null;
    }
  }

  /**
   * Query tracking details for a consignment number
   */
  async trackShipment(awb: string): Promise<TrackingEvent[]> {
    const cleanAwb = awb.trim();
    const token = await this.getTrackingToken();

    if (!token) return [];

    try {
      const res = await axios.post(
        this.trackingDetailsUrl,
        {
          trkType: 'cnno',
          strcnno: cleanAwb,
          addtnlDtl: 'Y',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': token,
          },
          timeout: 15000,
        },
      );

      const body = res.data;
      if (!body || body.statusFlag === false) {
        return [];
      }

      const events: TrackingEvent[] = [];
      const trackDetails = body.trackDetails || [];

      for (const item of trackDetails) {
        // strActionDate is DDMMYYYY e.g. "28052026", strActionTime is HHMM e.g. "1943"
        let timestamp = new Date();
        if (item.strActionDate && item.strActionDate.length >= 8) {
          const d = item.strActionDate;
          const day = parseInt(d.substring(0, 2), 10);
          const month = parseInt(d.substring(2, 4), 10) - 1;
          const year = parseInt(d.substring(4, 8), 10);
          let hours = 12;
          let mins = 0;
          if (item.strActionTime && item.strActionTime.length >= 4) {
            hours = parseInt(item.strActionTime.substring(0, 2), 10);
            mins = parseInt(item.strActionTime.substring(2, 4), 10);
          }
          timestamp = new Date(year, month, day, hours, mins);
        }

        events.push({
          status: item.strAction || item.strCode || 'In Transit',
          location: item.strOrigin || item.strDestination || '',
          timestamp,
          description: item.sTrRemarks || item.strAction || '',
        });
      }

      // If trackHeader exists and has header status (e.g. Delivered)
      if (events.length === 0 && body.trackHeader?.strStatus) {
        events.push({
          status: body.trackHeader.strStatus,
          location: body.trackHeader.strDestination || body.trackHeader.strOrigin || '',
          timestamp: new Date(),
          description: body.trackHeader.strRemarks || body.trackHeader.strStatus,
        });
      }

      return events.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } catch (e: any) {
      this.logger.warn(`DTDC trackShipment failed for ${cleanAwb}: ${e.message}`);
      return [];
    }
  }
}

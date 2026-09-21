import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  async webhook(
    @Req() req: any,
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    // Use raw body buffer for HMAC — re-serializing parsed JSON breaks Razorpay signature
    return this.paymentsService.verifyWebhook(req.rawBody ?? Buffer.from(JSON.stringify(body)), body, signature);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify payment on frontend callback (client-side verification)' })
  async verifyPayment(@Body() body: any) {
    const razorpayOrderId = body.razorpayOrderId || body.razorpay_order_id;
    const razorpayPaymentId = body.razorpayPaymentId || body.razorpay_payment_id;
    const razorpaySignature = body.razorpaySignature || body.razorpay_signature;
    const orderId = body.orderId || body.order_id;
    return this.paymentsService.verifyPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderId,
    });
  }
}

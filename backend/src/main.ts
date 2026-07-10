import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import * as path from 'path';
const helmet = require('helmet');
const compression = require('compression');
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

const startTime = Date.now();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // ── Request ID & Tracing Middleware ──────────────────────────────
  app.use((req: any, res: any, next: () => void) => {
    const reqId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || require('crypto').randomUUID();
    req.id = reqId;
    res.setHeader('x-request-id', reqId);
    next();
  });

  // ── Trust ALB Proxy ───────────────────────────────────────────────
  // Required when behind AWS ALB — allows correct IP forwarding, rate limiting,
  // and HTTPS detection from X-Forwarded-* headers
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // ── Security Headers ─────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Allow popups (required for Google Sign-In one-tap flow)
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      // CSP is not needed on a REST API (JSON only, no HTML pages served)
      contentSecurityPolicy: false,
      hsts: configService.get('NODE_ENV') === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // ── Compression ──────────────────────────────────────────────────
  app.use(compression({ threshold: 512 }));

  // ── Body size limits ────────────────────────────────────────────
  // Preserve raw body for Razorpay webhook signature verification.
  // Razorpay signs the exact raw bytes — re-serializing parsed JSON breaks the HMAC.
  app.use(
    express.json({
      limit: '15mb', // Increased for AI image uploads
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // ── CORS ────────────────────────────────────────────────────────
  const allowedOrigins = configService
    .get('ALLOWED_ORIGINS', 'http://localhost:3001')
    .split(',')
    .map((o: string) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-razorpay-signature'],
  });

  // ── Global Validation ────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── API prefix ───────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Static file serving (development / local storage) ───────────
  app.use('/api/v1/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ── Swagger (dev only) ───────────────────────────────────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Anjali Alankaram API')
      .setDescription('Fashion eCommerce REST API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Products', 'Product catalog endpoints')
      .addTag('Cart', 'Shopping cart endpoints')
      .addTag('Orders', 'Order management endpoints')
      .addTag('Payments', 'Payment endpoints')
      .addTag('Admin', 'Admin management endpoints')
      .addTag('AI Images', 'AI product image generation endpoints')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Health check ─────────────────────────────────────────────────
  // ECS container health check targets: /health (port-level/ALB) and /api/v1/health (container level)
  app.use('/health', (_req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.use('/api/v1/health', (_req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0'); // bind to all interfaces (required in Docker)
  logger.log(`🚀 Anjali Alankaram API running on port ${port}`, 'Bootstrap');
  logger.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`, 'Bootstrap');
  logger.log(`⚡ Startup time: ${Date.now() - startTime}ms`, 'Bootstrap');
  if (configService.get('NODE_ENV') !== 'production') {
    logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}

bootstrap();

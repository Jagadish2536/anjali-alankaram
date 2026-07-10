import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Pose configurations for the 4 generated images
const POSES = [
  {
    label: 'Front Standing',
    prompt:
      'front-facing, standing elegantly, looking directly at camera with a natural warm smile, both hands relaxed at sides, full body visible from head to toe',
  },
  {
    label: '45-Degree Left Angle',
    prompt:
      '45-degree left angle pose, one hand gently touching dupatta or fabric, natural graceful smile, full body visible from head to toe',
  },
  {
    label: '45-Degree Right Angle',
    prompt:
      '45-degree right angle, luxury fashion editorial pose, confident and elegant, full body visible from head to toe',
  },
  {
    label: 'Walking Pose',
    prompt:
      'dynamic walking pose, natural movement with fabric flowing naturally, premium fashion photography energy, full body visible from head to toe',
  },
];

// Background options — randomly chosen per generation session
const BACKGROUNDS = [
  'inside a luxury Indian boutique store with warm ambient lighting and rich wooden shelving',
  'inside a premium clothing store with elegant white interior and soft spotlights',
  'minimal beige studio with seamless backdrop and professional diffused lighting',
  'upscale Indian fashion store with traditional decorative elements and warm golden light',
  'elegant indoor studio with soft warm lighting and neutral tones',
  'luxury wooden interior showroom with warm amber lighting',
];

@Injectable()
export class AiImagesService {
  private readonly logger = new Logger(AiImagesService.name);
  private s3: AWS.S3;
  private sqs: AWS.SQS | null = null;
  private queueUrl: string | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.s3 = new AWS.S3({ region: this.config.get('AWS_REGION') });
    
    this.queueUrl = this.config.get<string>('AWS_SQS_QUEUE_URL') || null;
    if (this.queueUrl) {
      this.sqs = new AWS.SQS({ region: this.config.get('AWS_REGION') });
      this.logger.log(`Initialized SQS Queue: ${this.queueUrl}`);
    } else {
      this.logger.warn('AWS_SQS_QUEUE_URL is not set. Falling back to local background processing.');
    }
  }

  // ── Initiate AI product image generation (Queue / Async) ────────────────────
  async generateImages(
    faceImageBuffer: Buffer,
    faceImageMime: string,
    productImageBuffer: Buffer,
    productImageMime: string,
    adminId: string,
    productId?: string,
    customPrompt?: string,
  ): Promise<{
    sessionId: string;
    status: string;
  }> {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');

    if (!geminiKey) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables.',
      );
    }

    const sessionId = uuidv4();
    const sessionKey = `temp-ai-images/${sessionId}`;

    // Upload reference images to S3
    const faceExt = faceImageMime.includes('png') ? 'png' : 'jpg';
    const productExt = productImageMime.includes('png') ? 'png' : 'jpg';
    const faceRefKey = `${sessionKey}/refs/face.${faceExt}`;
    const productRefKey = `${sessionKey}/refs/product.${productExt}`;

    await Promise.all([
      this.s3
        .putObject({
          Bucket: bucket,
          Key: faceRefKey,
          Body: faceImageBuffer,
          ContentType: faceImageMime,
        })
        .promise(),
      this.s3
        .putObject({
          Bucket: bucket,
          Key: productRefKey,
          Body: productImageBuffer,
          ContentType: productImageMime,
        })
        .promise(),
    ]);

    const background = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create session in QUEUED state
    await this.prisma.aiImageSession.create({
      data: {
        id: sessionId,
        productId: productId || null,
        adminId,
        sessionKey,
        status: 'QUEUED',
        faceRefKey,
        productRefKey,
        customPrompt: customPrompt || null,
        generatedKeys: [],
        approvedKeys: [],
        background,
        expiresAt,
      },
    });

    if (this.sqs && this.queueUrl) {
      // SQS Mode (Production)
      try {
        await this.sqs
          .sendMessage({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify({
              sessionId,
              adminId,
              productId,
              customPrompt,
            }),
          })
          .promise();
        this.logger.log(`Enqueued AI image job to SQS: ${sessionId}`);
      } catch (err: any) {
        this.logger.error(`Failed to publish message to SQS: ${err.message}. Falling back to inline execution.`);
        // Fallback to inline background execution if SQS publish fails
        setImmediate(() => this.processSession(sessionId, adminId, productId, customPrompt));
      }
    } else {
      // Local Fallback Mode
      setImmediate(() => this.processSession(sessionId, adminId, productId, customPrompt));
    }

    return {
      sessionId,
      status: 'QUEUED',
    };
  }

  // ── Worker generation processing flow (Sequentially generates 4 poses) ──
  async processSession(
    sessionId: string,
    adminId: string,
    productId?: string,
    customPrompt?: string,
  ): Promise<void> {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');

    this.logger.log(`Starting AI Image Generation for session: ${sessionId}`);

    try {
      // Update session status to GENERATING
      await this.prisma.aiImageSession.update({
        where: { id: sessionId },
        data: { status: 'GENERATING' },
      });

      const session = await this.prisma.aiImageSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) throw new Error('Session record not found');

      // Download reference images from S3 to get base64 data
      const [faceObj, productObj] = await Promise.all([
        this.s3.getObject({ Bucket: bucket, Key: session.faceRefKey }).promise(),
        this.s3.getObject({ Bucket: bucket, Key: session.productRefKey }).promise(),
      ]);

      const faceBody = faceObj.Body;
      const productBody = productObj.Body;
      if (!faceBody || !productBody) {
        throw new Error('Reference images empty or not found in S3');
      }

      const faceBase64 = Buffer.isBuffer(faceBody) 
        ? faceBody.toString('base64') 
        : Buffer.from(faceBody as any).toString('base64');
      const productBase64 = Buffer.isBuffer(productBody)
        ? productBody.toString('base64')
        : Buffer.from(productBody as any).toString('base64');

      // Build Prompt and multimodal parts
      const buildParts = (pose: (typeof POSES)[0]) => {
        return [
          {
            inlineData: {
              mimeType: session.faceRefKey.endsWith('png') ? 'image/png' : 'image/jpeg',
              data: faceBase64,
            },
          },
          {
            inlineData: {
              mimeType: session.productRefKey.endsWith('png') ? 'image/png' : 'image/jpeg',
              data: productBase64,
            },
          },
          {
            text: `Create an ultra-realistic fashion ecommerce photograph combining the provided model face reference and the product/dress reference.
            
Requirements:
1. Wear the exact same clothing from the product/dress reference image. Preserve all details: color, patterns, design, print, texture, necklines, sleeves, borders, fit, and style. Do not change or hallucinate any garment details.
2. Put this dress on the exact same model from the face reference image. Keep the face, skin tone, features, eyes, lips, nose, hairline, and hair style identical to the face reference image.
3. Pose: ${pose.prompt}.
4. Background: ${session.background}.
5. Style: Professional DSLR fashion photography, sharp focus, soft lighting. No blurs, no watermarks, no duplicate body parts. Full body from head to toe must be visible.
${customPrompt ? `Additional instructions: ${customPrompt}` : ''}`,
          },
        ];
      };

      const generatedKeys: string[] = [];

      // Sequentially generate the 4 poses
      for (let i = 0; i < POSES.length; i++) {
        const pose = POSES[i];
        this.logger.log(`Session ${sessionId}: generating pose ${i + 1}/${POSES.length} (${pose.label})`);

        try {
          // Call Google Gemini API
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${geminiKey}`,
            {
              contents: [
                {
                  parts: buildParts(pose),
                },
              ],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                  aspectRatio: '2:3',
                  imageSize: '1K',
                },
              },
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 180000, // 3 min timeout per call
            },
          );

          const parts = response.data?.candidates?.[0]?.content?.parts || [];
          const imagePart = parts.find(
            (p: any) => p.inlineData?.data && p.inlineData.mimeType?.startsWith('image/'),
          );

          if (!imagePart) {
            const textPart = parts.find((p: any) => p.text);
            throw new Error(
              textPart?.text || 'No image data returned from Gemini API. Response: ' + JSON.stringify(response.data),
            );
          }

          const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
          const imageKey = `${session.sessionKey}/generated/pose-${i + 1}.webp`;

          await this.s3
            .putObject({
              Bucket: bucket,
              Key: imageKey,
              Body: imageBuffer,
              ContentType: 'image/webp',
              CacheControl: 'private, max-age=86400',
            })
            .promise();

          generatedKeys.push(imageKey);

          // Update generatedKeys list in DB in real-time so client can see incremental progress
          await this.prisma.aiImageSession.update({
            where: { id: sessionId },
            data: { generatedKeys },
          });

        } catch (err: any) {
          const errMsg = err.response?.data?.error?.message || err.message;
          this.logger.error(`Session ${sessionId}: Pose ${i + 1} failed: ${errMsg}`);
          // Continue generating other poses even if one fails
        }
      }

      if (generatedKeys.length === 0) {
        throw new Error('All pose generations failed.');
      }

      // Mark session as READY
      await this.prisma.aiImageSession.update({
        where: { id: sessionId },
        data: { status: 'READY' },
      });

      this.logger.log(`Session ${sessionId} completed successfully with ${generatedKeys.length} images`);

      // Write audit log
      await this.writeAuditLog({
        adminId,
        action: 'AI_GENERATE',
        entityType: 'AI_SESSION',
        entityId: sessionId,
        metadata: {
          productId,
          poseCount: generatedKeys.length,
          background: session.background,
          customPrompt,
        },
      });

    } catch (error: any) {
      this.logger.error(`Session ${sessionId} worker generation failed: ${error.message}`);
      
      // Update session status to FAILED
      await this.prisma.aiImageSession.update({
        where: { id: sessionId },
        data: { status: 'FAILED' },
      });

      await this.writeAuditLog({
        adminId,
        action: 'AI_GENERATE',
        entityType: 'AI_SESSION',
        entityId: sessionId,
        success: false,
        errorMsg: error.message,
        metadata: { productId, customPrompt },
      });
    }
  }

  // ── Approve a single generated image ────────────────────────────────────────
  async approveImage(
    sessionId: string,
    imageKey: string,
    productId: string | undefined,
    adminId: string,
  ): Promise<{ newImageUrl: string; newImageKey: string }> {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    const cfDomain = this.config.get<string>('CLOUDFRONT_DOMAIN') || 'du327q4g8zq25.cloudfront.net';

    const session = await this.prisma.aiImageSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('AI image session not found');
    if (!session.generatedKeys.includes(imageKey)) {
      throw new BadRequestException('Image key does not belong to this session');
    }

    // Move image from temp to product folder (use products/draft for new products)
    const targetFolder = productId ? `products/${productId}` : 'products/draft';
    const newKey = `${targetFolder}/ai-${uuidv4()}.webp`;

    await this.s3
      .copyObject({
        Bucket: bucket,
        CopySource: `${bucket}/${imageKey}`,
        Key: newKey,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
        MetadataDirective: 'REPLACE',
      })
      .promise();

    // Delete the temp copy
    await this.s3
      .deleteObject({ Bucket: bucket, Key: imageKey })
      .promise()
      .catch(() => {});

    // Build new URL
    const baseUrl = `https://${cfDomain}`;
    const newImageUrl = `${baseUrl}/${newKey}`;

    // Append image URL to product.images[] if product exists
    if (productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (product) {
        const updatedImages = [...(product.images || []), newImageUrl];
        await this.prisma.product.update({
          where: { id: productId },
          data: { images: updatedImages },
        });
      }
    }

    // Update session record
    await this.prisma.aiImageSession.update({
      where: { id: sessionId },
      data: {
        status: 'APPROVED',
        generatedKeys: session.generatedKeys.filter((k) => k !== imageKey),
        approvedKeys: [...session.approvedKeys, newKey],
      },
    });

    await this.writeAuditLog({
      adminId,
      action: 'AI_APPROVE',
      entityType: productId ? 'PRODUCT' : 'DRAFT_PRODUCT',
      entityId: productId || sessionId,
      s3Key: newKey,
      metadata: { sessionId, originalKey: imageKey },
    });

    return { newImageUrl, newImageKey: newKey };
  }

  // ── Reject (delete) a single generated image ─────────────────────────────────
  async rejectImage(
    sessionId: string,
    imageKey: string,
    adminId: string,
  ): Promise<void> {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');

    const session = await this.prisma.aiImageSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('AI image session not found');

    // Delete from S3
    await this.s3
      .deleteObject({ Bucket: bucket, Key: imageKey })
      .promise()
      .catch((err) => {
        this.logger.warn(`Could not delete temp image ${imageKey}: ${err.message}`);
      });

    // Update session
    const remaining = session.generatedKeys.filter((k) => k !== imageKey);
    await this.prisma.aiImageSession.update({
      where: { id: sessionId },
      data: {
        generatedKeys: remaining,
        status: remaining.length === 0 ? 'REJECTED' : session.status,
      },
    });

    await this.writeAuditLog({
      adminId,
      action: 'AI_REJECT',
      entityType: 'AI_SESSION',
      entityId: sessionId,
      s3Key: imageKey,
    });
  }

  // ── Delete entire session ────────────────────────────────────────────────────
  async deleteSession(sessionId: string, adminId: string): Promise<void> {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');

    const session = await this.prisma.aiImageSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) return;

    const keysToDelete = [
      session.faceRefKey,
      session.productRefKey,
      ...session.generatedKeys,
    ].filter(Boolean);

    if (keysToDelete.length > 0) {
      await this.s3
        .deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: keysToDelete.map((k) => ({ Key: k })),
            Quiet: true,
          },
        })
        .promise()
        .catch((err) => {
          this.logger.warn(`Batch delete for session ${sessionId} partially failed: ${err.message}`);
        });
    }

    await this.prisma.aiImageSession.update({
      where: { id: sessionId },
      data: { status: 'REJECTED' },
    });

    await this.writeAuditLog({
      adminId,
      action: 'AI_REJECT',
      entityType: 'AI_SESSION',
      entityId: sessionId,
      metadata: { deletedKeys: keysToDelete.length },
    });
  }

  // ── Get session details (for poll/refresh) ─────────────────────────────────
  async getSession(sessionId: string) {
    const session = await this.prisma.aiImageSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    const cfDomain = this.config.get<string>('CLOUDFRONT_DOMAIN') || 'du327q4g8zq25.cloudfront.net';
    const baseUrl = `https://${cfDomain}`;

    return {
      ...session,
      generatedUrls: session.generatedKeys.map((k) => ({
        key: k,
        url: `${baseUrl}/${k}`,
      })),
      approvedUrls: session.approvedKeys.map((k) => ({
        key: k,
        url: `${baseUrl}/${k}`,
      })),
    };
  }

  // ── Get AI stats for admin dashboard ─────────────────────────────────────────
  async getAiStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSessions, monthlySessions, approvedCount, expiredCount] =
      await Promise.all([
        this.prisma.aiImageSession.count(),
        this.prisma.aiImageSession.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.aiImageSession.count({ where: { status: 'APPROVED' } }),
        this.prisma.aiImageSession.count({ where: { status: 'EXPIRED' } }),
      ]);

    const estimatedCreditsUsed = monthlySessions * 4;

    return {
      totalSessions,
      monthlySessions,
      approvedCount,
      expiredCount,
      estimatedCreditsUsed,
      estimatedCostUsd: (estimatedCreditsUsed * 0.04).toFixed(2),
      estimatedCostInr: (estimatedCreditsUsed * 0.04 * 83.5).toFixed(2),
    };
  }

  // ── Scheduled: Clean up expired temp sessions (runs every hour) ─────────────
  @Cron('0 * * * *')
  async cleanupExpiredSessions() {
    this.logger.log('Starting hourly AI session cleanup...');
    const bucket = this.config.get<string>('AWS_S3_BUCKET');

    const expiredSessions = await this.prisma.aiImageSession.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { in: ['PENDING', 'QUEUED', 'GENERATING', 'READY'] },
      },
    });

    this.logger.log(`Found ${expiredSessions.length} expired AI sessions to clean up`);

    for (const session of expiredSessions) {
      const keysToDelete = [
        session.faceRefKey,
        session.productRefKey,
        ...session.generatedKeys,
      ].filter(Boolean);

      if (keysToDelete.length > 0) {
        await this.s3
          .deleteObjects({
            Bucket: bucket,
            Delete: {
              Objects: keysToDelete.map((k) => ({ Key: k })),
              Quiet: true,
            },
          })
          .promise()
          .catch((err) => {
            this.logger.warn(
              `Could not delete objects for expired session ${session.id}: ${err.message}`,
            );
          });
      }

      await this.prisma.aiImageSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
    }

    this.logger.log(`AI session cleanup complete. Cleaned up ${expiredSessions.length} sessions.`);
  }

  // ── Helper: Write audit log ─────────────────────────────────────────────────
  async writeAuditLog(params: {
    adminId: string;
    action: string;
    entityType: string;
    entityId?: string;
    s3Key?: string;
    metadata?: Record<string, any>;
    success?: boolean;
    errorMsg?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          s3Key: params.s3Key || null,
          metadata: params.metadata || null,
          success: params.success !== false,
          errorMsg: params.errorMsg || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to write audit log: ${err.message}`);
    }
  }
}

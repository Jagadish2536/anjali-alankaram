import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();

    const { method, url, user, body } = request;

    // Only log write/mutation requests (POST, PUT, PATCH, DELETE)
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!isMutation) {
      return next.handle();
    }

    // Skip public paths or endpoints that shouldn't be logged
    const isPublicPing = url.includes('visitor-ping');
    const isHeartbeat = url.includes('/viewers');
    if (isPublicPing || isHeartbeat) {
      return next.handle();
    }

    // We only log if the user has an admin/staff role
    const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF', 'ORDER_MANAGER', 'STOCK_MANAGER'];
    const isAdmin = user && adminRoles.includes(user.role);

    // If not logged in as admin/staff, we skip general audit logging
    if (!isAdmin) {
      return next.handle();
    }

    let oldEntity: any = null;
    try {
      const cleanUrl = url.split('?')[0]; // strip query string
      const pathSegments = cleanUrl.split('/').filter(Boolean);

      // Extract path segments to map entity
      let primarySegment = pathSegments[0];
      let routeParams = pathSegments.slice(1);

      if (primarySegment === 'api') {
        if (pathSegments[1] === 'v1') {
          primarySegment = pathSegments[2];
          routeParams = pathSegments.slice(3);
        } else {
          primarySegment = pathSegments[1];
          routeParams = pathSegments.slice(2);
        }
      }

      const entityId = routeParams[0] || null;
      const isSettingsPost = primarySegment === 'settings' && method === 'POST';
      const isUpdateOrDelete = ['PUT', 'PATCH', 'DELETE'].includes(method) || isSettingsPost;

      if (isUpdateOrDelete) {
        if (primarySegment === 'products' && entityId) {
          oldEntity = await this.prisma.product.findUnique({
            where: { id: entityId },
            include: { variants: true },
          });
        } else if (primarySegment === 'categories' && entityId) {
          oldEntity = await this.prisma.category.findUnique({
            where: { id: entityId },
          });
        } else if (primarySegment === 'settings') {
          oldEntity = await this.prisma.storeSettings.findFirst();
        } else if (primarySegment === 'coupons' && entityId) {
          oldEntity = await this.prisma.coupon.findUnique({
            where: { id: entityId },
          });
        } else if (primarySegment === 'offers' && entityId) {
          oldEntity = await this.prisma.offer.findUnique({
            where: { id: entityId },
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Error fetching old entity before mutation: ${err.message}`);
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          await this.logAction(user, method, url, body, responseBody, true, undefined, oldEntity);
        } catch (err: any) {
          this.logger.error(`Error writing audit log: ${err.message}`);
        }
      }),
      catchError((error) => {
        // Log failures as well
        this.logAction(
          user,
          method,
          url,
          body,
          null,
          false,
          error.message || error.response?.message || 'Unknown error',
          oldEntity,
        ).catch((err) => this.logger.error(`Error writing failed audit log: ${err.message}`));
        return throwError(() => error);
      }),
    );
  }

  private async logAction(
    user: any,
    method: string,
    url: string,
    body: any,
    responseBody: any,
    success: boolean,
    errorMsg?: string,
    oldEntity?: any,
  ) {
    let entityType = 'SYSTEM';
    let action = 'UPDATE';
    let entityId: string | null = null;
    let description = '';

    // Extract path segments to map entity
    // We clean leading/trailing slashes and split
    const cleanUrl = url.split('?')[0]; // strip query string
    const pathSegments = cleanUrl.split('/').filter(Boolean);

    // Determine basic action type
    if (method === 'POST') action = 'CREATE';
    else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
    else if (method === 'DELETE') action = 'DELETE';

    // The first segment after API prefix if nested (e.g. /api/v1/products -> products)
    let primarySegment = pathSegments[0];
    let routeParams = pathSegments.slice(1);

    // Check if URL prefix includes api/v1 or similar
    if (primarySegment === 'api') {
      if (pathSegments[1] === 'v1') {
        primarySegment = pathSegments[2];
        routeParams = pathSegments.slice(3);
      } else {
        primarySegment = pathSegments[1];
        routeParams = pathSegments.slice(2);
      }
    }

    if (!primarySegment) return;
    entityId = routeParams[0] || null;

    // Fetch the new entity state from db if update was successful
    let newEntity: any = null;
    if (success && oldEntity) {
      try {
        if (primarySegment === 'products' && entityId) {
          newEntity = await this.prisma.product.findUnique({
            where: { id: entityId },
            include: { variants: true },
          });
        } else if (primarySegment === 'categories' && entityId) {
          newEntity = await this.prisma.category.findUnique({
            where: { id: entityId },
          });
        } else if (primarySegment === 'settings') {
          newEntity = await this.prisma.storeSettings.findFirst();
        } else if (primarySegment === 'coupons' && entityId) {
          newEntity = await this.prisma.coupon.findUnique({
            where: { id: entityId },
          });
        } else if (primarySegment === 'offers' && entityId) {
          newEntity = await this.prisma.offer.findUnique({
            where: { id: entityId },
          });
        }
      } catch (err: any) {
        this.logger.error(`Error fetching new entity for diff: ${err.message}`);
      }
    }

    switch (primarySegment) {
      case 'products':
        entityType = 'PRODUCT';
        if (action === 'CREATE') {
          description = `Created product: ${responseBody?.name || body?.name || 'unknown'}`;
        } else if (action === 'UPDATE') {
          description = `Updated product: ${newEntity?.name || oldEntity?.name || body?.name || entityId || 'unknown'}`;
        } else if (action === 'DELETE') {
          description = `Deleted product: ${oldEntity?.name || entityId || 'unknown'}`;
        }
        break;

      case 'categories':
        entityType = 'CATEGORY';
        if (action === 'CREATE') {
          description = `Created category: ${responseBody?.name || body?.name || 'unknown'}`;
        } else if (action === 'UPDATE') {
          description = `Updated category: ${newEntity?.name || oldEntity?.name || body?.name || entityId || 'unknown'}`;
        } else if (action === 'DELETE') {
          description = `Deleted category: ${oldEntity?.name || entityId || 'unknown'}`;
        }
        break;

      case 'coupons':
        entityType = 'COUPON';
        if (action === 'CREATE') {
          description = `Created coupon: ${responseBody?.code || body?.code || 'unknown'}`;
        } else if (action === 'UPDATE') {
          description = `Updated coupon: ${newEntity?.code || oldEntity?.code || body?.code || entityId || 'unknown'}`;
        } else if (action === 'DELETE') {
          description = `Deleted coupon: ${oldEntity?.code || entityId || 'unknown'}`;
        }
        break;

      case 'offers':
        entityType = 'OFFER';
        if (action === 'CREATE') {
          description = `Created offer: ${responseBody?.title || body?.title || 'unknown'}`;
        } else if (action === 'UPDATE') {
          description = `Updated offer: ${newEntity?.title || oldEntity?.title || body?.title || entityId || 'unknown'}`;
        } else if (action === 'DELETE') {
          description = `Deleted offer: ${oldEntity?.title || entityId || 'unknown'}`;
        }
        break;

      case 'settings':
        entityType = 'SETTINGS';
        description = 'Updated store settings';
        break;

      case 'feature-flags':
        entityType = 'FEATURE_FLAG';
        entityId = routeParams[0] || body?.key || null;
        if (action === 'CREATE') {
          description = `Created feature flag: ${entityId}`;
        } else if (action === 'DELETE') {
          description = `Deleted feature flag: ${entityId}`;
        } else {
          description = `Updated feature flag: ${entityId}`;
        }
        break;

      case 'reviews':
        entityType = 'REVIEW';
        if (action === 'DELETE') {
          description = `Deleted review ID: ${entityId}`;
        } else {
          description = `Updated review ID: ${entityId}`;
        }
        break;

      case 'orders':
        entityType = 'ORDER';
        if (url.includes('/cancel')) {
          action = 'CANCEL_ORDER';
          description = `Cancelled order ID: ${entityId}. Reason: ${body?.reason || 'none'}`;
        } else if (url.includes('/return')) {
          action = 'RETURN_ORDER';
          description = `Requested return for order ID: ${entityId}`;
        } else if (url.includes('/status')) {
          action = 'UPDATE_STATUS';
          description = `Updated order ID ${entityId} status to: ${body?.status || 'unknown'}`;
        } else if (url.includes('/assign-courier')) {
          action = 'ASSIGN_COURIER';
          description = `Assigned courier to order ID: ${entityId}`;
        } else {
          description = `Updated order ID: ${entityId}`;
        }
        break;

      case 'users':
        entityType = 'USER';
        if (url.includes('/role')) {
          action = 'UPDATE_ROLE';
          description = `Changed user ID ${entityId} role to: ${body?.role || 'unknown'}`;
        } else if (action === 'CREATE') {
          description = `Created user: ${body?.email || body?.phone || 'unknown'}`;
        } else if (action === 'UPDATE') {
          description = `Updated user: ${body?.email || entityId || 'unknown'}`;
        } else if (action === 'DELETE') {
          description = `Deleted user ID: ${entityId}`;
        }
        break;

      case 'warehouse':
        entityType = 'WAREHOUSE';
        if (url.includes('/inventory/')) {
          action = 'UPDATE_INVENTORY';
          description = `Adjusted inventory in warehouse for variant: ${routeParams[2] || 'unknown'}`;
        } else if (url.includes('/pick')) {
          action = 'PICK_ITEM';
          description = `Picked item ID: ${routeParams[1]}`;
        } else if (url.includes('/pack')) {
          action = 'PACK_ITEM';
          description = `Packed item ID: ${routeParams[1]}`;
        } else if (action === 'CREATE') {
          description = `Created warehouse: ${body?.name || 'unknown'}`;
        } else if (action === 'UPDATE') {
          description = `Updated warehouse: ${body?.name || entityId || 'unknown'}`;
        }
        break;

      case 'admin':
        entityType = 'ADMIN';
        if (url.includes('/fix-reserved-stock')) {
          action = 'FIX_STOCK';
          description = 'Fixed negative reserved stock';
        } else {
          description = `Admin action on ${url}`;
        }
        break;

      default:
        entityType = primarySegment ? primarySegment.toUpperCase() : 'SYSTEM';
        description = `Admin performed ${method} on ${url}`;
        break;
    }

    // Generate changes/diffs
    const changes: any[] = [];
    if (success && oldEntity && newEntity) {
      if (entityType === 'PRODUCT') {
        const generalChanges = this.diffObjects(oldEntity, newEntity, ['variants']);
        const oldVars = oldEntity.variants || [];
        const newVars = newEntity.variants || [];
        const variantChanges = this.diffProductVariants(oldVars, newVars);
        changes.push(...generalChanges, ...variantChanges);
      } else if (entityType === 'CATEGORY' || entityType === 'SETTINGS' || entityType === 'COUPON' || entityType === 'OFFER') {
        changes.push(...this.diffObjects(oldEntity, newEntity));
      }
    }

    // Prepare metadata for visual rendering
    const metadata: any = {
      adminName: user.name || 'Admin',
      adminEmail: user.email || 'admin@anjalialankaram.com',
      adminRole: user.role,
      requestUrl: url,
      requestMethod: method,
      description,
    };

    if (changes.length > 0) {
      metadata.changes = changes;
    }

    if (body) {
      const sanitizedBody = { ...body };
      delete sanitizedBody.password;
      delete sanitizedBody.token;
      delete sanitizedBody.refreshToken;
      delete sanitizedBody.razorpayKeySecret;
      delete sanitizedBody.razorpayWebhookSecret;

      metadata.payload = sanitizedBody;
    }

    await this.auditLogService.writeLog({
      adminId: user.id,
      action,
      entityType,
      entityId,
      metadata,
      success,
      errorMsg,
    });
  }

  private diffObjects(
    oldObj: any,
    newObj: any,
    excludeKeys: string[] = [],
  ): Array<{ field: string; old: any; new: any }> {
    const changes: Array<{ field: string; old: any; new: any }> = [];
    if (!oldObj || !newObj) return changes;

    const standardExclude = [
      'id',
      'createdAt',
      'updatedAt',
      'adminId',
      'variants',
      'password',
      'token',
      'refreshToken',
      'razorpayKeySecret',
      'razorpayWebhookSecret',
    ];
    const actualExclude = [...standardExclude, ...excludeKeys];

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      if (actualExclude.includes(key)) continue;

      const oldVal = oldObj[key];
      const newVal = newObj[key];

      // Normalize null/undefined/empty string
      const oldValNormalized =
        oldVal === null || oldVal === undefined ? '' : oldVal;
      const newValNormalized =
        newVal === null || newVal === undefined ? '' : newVal;

      if (
        typeof oldValNormalized === 'object' ||
        typeof newValNormalized === 'object'
      ) {
        if (JSON.stringify(oldValNormalized) !== JSON.stringify(newValNormalized)) {
          changes.push({
            field: key,
            old: oldVal,
            new: newVal,
          });
        }
      } else if (oldValNormalized !== newValNormalized) {
        changes.push({
          field: key,
          old: oldVal,
          new: newVal,
        });
      }
    }

    return changes;
  }

  private diffProductVariants(oldVariants: any[], newVariants: any[]): Array<any> {
    const changes: Array<any> = [];
    const oldActive = (oldVariants || []).filter((v) => v.isActive);
    const newActive = (newVariants || []).filter((v) => v.isActive);

    // Added variants
    for (const newVal of newActive) {
      const oldVal = oldActive.find(
        (v) =>
          v.id === newVal.id ||
          (v.size === newVal.size && v.color === newVal.color),
      );
      if (!oldVal) {
        changes.push({
          field: 'Variant Added',
          old: null,
          new: `${newVal.size || 'N/A'}${newVal.color ? ` / ${newVal.color}` : ''} (SKU: ${newVal.sku || 'N/A'}, Stock: ${newVal.stock})`,
        });
      } else {
        // Compare fields
        if (oldVal.stock !== newVal.stock) {
          changes.push({
            field: `Variant ${newVal.size || 'N/A'}${newVal.color ? ` / ${newVal.color}` : ''} Stock`,
            old: oldVal.stock,
            new: newVal.stock,
          });
        }
        if (oldVal.sku !== newVal.sku) {
          changes.push({
            field: `Variant ${newVal.size || 'N/A'}${newVal.color ? ` / ${newVal.color}` : ''} SKU`,
            old: oldVal.sku,
            new: newVal.sku,
          });
        }
      }
    }

    // Removed variants
    for (const oldVal of oldActive) {
      const newVal = newActive.find(
        (v) =>
          v.id === oldVal.id ||
          (v.size === oldVal.size && v.color === oldVal.color),
      );
      if (!newVal) {
        changes.push({
          field: 'Variant Removed',
          old: `${oldVal.size || 'N/A'}${oldVal.color ? ` / ${oldVal.color}` : ''} (SKU: ${oldVal.sku || 'N/A'})`,
          new: null,
        });
      }
    }

    return changes;
  }
}


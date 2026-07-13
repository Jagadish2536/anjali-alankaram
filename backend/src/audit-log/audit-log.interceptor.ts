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

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
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

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          await this.logAction(user, method, url, body, responseBody, true);
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

    switch (primarySegment) {
      case 'products':
        entityType = 'PRODUCT';
        entityId = routeParams[0] || null;
        if (action === 'CREATE') {
          description = `Created product: ${body?.name || 'unknown'}`;
        } else if (action === 'UPDATE') {
          description = `Updated product: ${body?.name || entityId || 'unknown'}`;
        } else if (action === 'DELETE') {
          description = `Deleted product ID: ${entityId}`;
        }
        break;

      case 'categories':
        entityType = 'CATEGORY';
        entityId = routeParams[0] || null;
        if (action === 'CREATE') {
          description = `Created category: ${body?.name || 'unknown'}`;
        } else if (action === 'UPDATE') {
          description = `Updated category: ${body?.name || entityId || 'unknown'}`;
        } else if (action === 'DELETE') {
          description = `Deleted category ID: ${entityId}`;
        }
        break;

      case 'coupons':
        entityType = 'COUPON';
        entityId = routeParams[0] || null;
        if (action === 'CREATE') {
          description = `Created coupon: ${body?.code || 'unknown'}`;
        } else if (action === 'UPDATE') {
          description = `Updated coupon: ${body?.code || entityId || 'unknown'}`;
        } else if (action === 'DELETE') {
          description = `Deleted coupon ID: ${entityId}`;
        }
        break;

      case 'offers':
        entityType = 'OFFER';
        entityId = routeParams[0] || null;
        if (action === 'CREATE') {
          description = `Created offer: ${body?.title || 'unknown'}`;
        } else if (action === 'UPDATE') {
          description = `Updated offer: ${body?.title || entityId || 'unknown'}`;
        } else if (action === 'DELETE') {
          description = `Deleted offer ID: ${entityId}`;
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
        entityId = routeParams[0] || null;
        if (action === 'DELETE') {
          description = `Deleted review ID: ${entityId}`;
        } else {
          description = `Updated review ID: ${entityId}`;
        }
        break;

      case 'orders':
        entityType = 'ORDER';
        entityId = routeParams[0] || null;
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
        entityId = routeParams[0] || null;
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
        entityId = routeParams[0] || null;
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

    // Prepare metadata for visual rendering
    const metadata: any = {
      adminName: user.name || 'Admin',
      adminEmail: user.email || 'admin@anjalialankaram.com',
      adminRole: user.role,
      requestUrl: url,
      requestMethod: method,
      description,
    };

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
}

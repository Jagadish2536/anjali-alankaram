import html2canvas from 'html2canvas';
import { useSettingsStore } from '@/store/useSettingsStore';

export type LabelSize = '4x6' | 'a4';

export interface LabelSizeOption {
  id: LabelSize;
  name: string;
  dimensions: string;
  description: string;
  widthMm: number;
  heightMm: number;
  badge: string;
  aspectRatioCss: string;
}

export const LABEL_SIZES: LabelSizeOption[] = [
  {
    id: '4x6',
    name: '4 x 6 inches',
    dimensions: '100 x 150 mm',
    description: 'The primary size for customer orders, carrier shipping, and thermal label printers.',
    widthMm: 100,
    heightMm: 150,
    badge: 'Standard Carrier Shipping',
    aspectRatioCss: 'aspect-[4/6]'
  },
  {
    id: 'a4',
    name: 'A4 Full Page',
    dimensions: '210 x 297 mm',
    description: 'Full page order packing slip & tax invoice for standard desktop paper printers.',
    widthMm: 210,
    heightMm: 297,
    badge: 'Full Sheet Invoice & Label',
    aspectRatioCss: 'aspect-[210/297]'
  }
];

export function getItemImageUrl(it: any): string {
  if (!it) return '';

  const extractUrl = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) {
            return extractUrl(parsed[0]);
          }
        } catch {}
      }
      return trimmed;
    }
    if (Array.isArray(val) && val.length > 0) {
      return extractUrl(val[0]);
    }
    if (typeof val === 'object' && val !== null) {
      return extractUrl(val.url || val.src || val.image || val.imageUrl);
    }
    return '';
  };

  let img = '';

  // 1. Direct item properties
  img = extractUrl(it.imageUrl) ||
        extractUrl(it.image) ||
        extractUrl(it.productImage) ||
        extractUrl(it.itemImage) ||
        extractUrl(it.thumbnail);

  // 2. Variant-specific image
  if (!img && it.variant) {
    img = extractUrl(it.variant.images) || extractUrl(it.variant.image) || extractUrl(it.variant.imageUrl);
  }
  if (!img && it.variantInfo) {
    let vInfo = it.variantInfo;
    if (typeof vInfo === 'string') {
      try { vInfo = JSON.parse(vInfo); } catch {}
    }
    if (typeof vInfo === 'object' && vInfo !== null) {
      img = extractUrl(vInfo.images) || extractUrl(vInfo.image) || extractUrl(vInfo.imageUrl);
    }
  }

  // 3. Match color/size variant in item.product.variants
  const color = (it.variantInfo && typeof it.variantInfo === 'object' ? it.variantInfo.color : '') ||
                (typeof it.variantInfo === 'string' && it.variantInfo.includes('color') ? (JSON.parse(it.variantInfo || '{}').color || '') : '') ||
                it.variant?.color;

  if (!img && it.product?.variants) {
    let variantsList = it.product.variants;
    if (typeof variantsList === 'string') {
      try { variantsList = JSON.parse(variantsList); } catch {}
    }
    if (Array.isArray(variantsList) && variantsList.length > 0) {
      if (color) {
        const match = variantsList.find((v: any) => v && (v.color === color || v.name === color));
        if (match) {
          img = extractUrl(match.images) || extractUrl(match.image) || extractUrl(match.imageUrl);
        }
      }
      if (!img) {
        for (const v of variantsList) {
          const vImg = extractUrl(v?.images) || extractUrl(v?.image) || extractUrl(v?.imageUrl);
          if (vImg) {
            img = vImg;
            break;
          }
        }
      }
    }
  }

  // 4. Product level images
  if (!img && it.product) {
    img = extractUrl(it.product.images) ||
          extractUrl(it.product.featuredImage) ||
          extractUrl(it.product.image) ||
          extractUrl(it.product.imageUrl) ||
          extractUrl(it.product.thumbnail);
  }

  if (!img) return '';

  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
    return img;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${img.startsWith('/') ? '' : '/'}${img}`;
  }
  return img;
}

// ── SVG Barcode Generator helper for crisp printed barcode ───────────────────
function generateSimulatedBarcodeSvg(value: string, height = 36): string {
  const bars: string[] = [];
  const cleanVal = (value || '000000000').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let hash = 0;
  for (let i = 0; i < cleanVal.length; i++) {
    hash = (hash * 31 + cleanVal.charCodeAt(i)) & 0xffffffff;
  }
  
  // Guard bars start
  bars.push('<rect x="0" y="0" width="2" height="' + height + '" fill="#000"/>');
  bars.push('<rect x="4" y="0" width="2" height="' + height + '" fill="#000"/>');

  let curX = 8;
  const numBars = 36;
  for (let i = 0; i < numBars; i++) {
    const bit = (hash >> (i % 30)) & 1;
    const width = ((i + (hash % 3)) % 2 === 0 ? (bit ? 3 : 1) : (bit ? 2 : 1));
    if (i % 2 === 0) {
      bars.push(`<rect x="${curX}" y="0" width="${width}" height="${height}" fill="#000"/>`);
    }
    curX += width + 1.5;
  }

  // Guard bars end
  bars.push(`<rect x="${curX}" y="0" width="2" height="${height}" fill="#000"/>`);
  bars.push(`<rect x="${curX + 4}" y="0" width="2" height="${height}" fill="#000"/>`);
  const totalW = curX + 8;

  return `<svg viewBox="0 0 ${totalW} ${height}" style="width:100%;max-width:240px;height:${height}px;display:block;margin:4px auto;" xmlns="http://www.w3.org/2000/svg">${bars.join('')}</svg>`;
}

// ── 1. 4 x 6 inches (100 x 150 mm) Layout ────────────────────────────────────
function generate4x6CardHtml(order: any, storeAddress?: string, supportPhone?: string): string {
  const subtotal = order.subtotal
    ? Number(order.subtotal)
    : (order.items || []).reduce(
        (sum: number, it: any) => sum + Number(it.totalPrice || it.unitPrice * it.quantity),
        0,
      );
  const discountAmount = Number(order.discountAmount || 0);
  const offerDiscount = Number(order.offerDiscount || 0);
  const offerTitle = order.offerTitle || 'Offer Discount';
  const couponCode = order.couponCode ? `Coupon (${order.couponCode})` : 'Coupon Discount';
  const shippingCharge = Number(order.shippingCharge || 0);
  const platformFee = Number(order.platformFee || 0);
  const codCharges = Number(order.codCharges || 0);
  const giftCharge = Number(order.giftCharge || 0);
  const gstAmount = Number(order.gstAmount || 0);
  const totalAmount = Number(
    order.totalAmount ||
      subtotal - discountAmount - offerDiscount + shippingCharge + platformFee + codCharges + giftCharge + gstAmount,
  );

  const isPrepaid = order.paymentMethod === 'RAZORPAY';
  const paymentBadgeText = isPrepaid ? 'PREPAID — DO NOT COLLECT CASH' : `COD — COLLECT ₹${totalAmount.toLocaleString('en-IN')}`;
  const paymentBadgeBg = isPrepaid ? '#dcfce7' : '#ffedd5';
  const paymentBadgeColor = isPrepaid ? '#14532d' : '#7c2d12';

  const itemsHtml = (order.items || []).slice(0, 4).map((it: any) => {
    const sizeStr = it.variantInfo?.size || it.variant?.size || '';
    const colorStr = it.variantInfo?.color || it.variant?.color || '';
    const variantText = `${sizeStr}${colorStr ? (sizeStr ? '/' : '') + colorStr : ''}`;
    return `<tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:4px 6px;font-weight:600;font-size:10.5px;color:#111;">${it.productName}</td>
      <td style="padding:4px 6px;text-align:center;font-size:9.5px;color:#4b5563;">${variantText || '—'}</td>
      <td style="padding:4px 6px;text-align:center;font-weight:700;font-size:10.5px;">x${it.quantity}</td>
      <td style="padding:4px 6px;text-align:right;font-weight:700;font-size:10.5px;">₹${Number(it.totalPrice || it.unitPrice * it.quantity).toLocaleString('en-IN')}</td>
    </tr>`;
  }).join('');

  const overflowCount = (order.items || []).length > 4 ? (order.items || []).length - 4 : 0;

  return `<div id="label-card-${order.orderNumber}" class="label-card size-4x6" style="width:100%;max-width:390px;box-sizing:border-box;background:#fff;border:2px solid #111;padding:16px;font-family:Inter,Arial,sans-serif;color:#111;margin:0 auto 20px auto;position:relative;page-break-after:always;break-after:page;">
    <!-- Header Banner -->
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:10px;">
      <div>
        <h2 style="margin:0;font-size:15px;font-weight:900;letter-spacing:-0.02em;text-transform:uppercase;color:#111827;">📦 ANJALI ALANKARAM</h2>
      </div>
      <div style="text-align:right;">
        <span style="font-family:monospace;font-size:14px;font-weight:800;background:#111;color:#fff;padding:3px 6px;border-radius:4px;word-break:break-all;">#${order.orderNumber}</span>
      </div>
    </div>

    <!-- Payment & Date Banner -->
    <div style="background:${paymentBadgeBg};border:1.5px solid ${paymentBadgeColor};color:${paymentBadgeColor};padding:6px 10px;border-radius:6px;font-weight:800;font-size:11px;text-align:center;margin-bottom:10px;text-transform:uppercase;">
      ${paymentBadgeText}
    </div>

    <!-- Courier / AWB Section -->
    ${order.awbCode || order.courierName ? `
    <div style="border:1px solid #111;border-radius:6px;padding:6px 8px;margin-bottom:10px;background:#fafafa;text-align:center;">
      <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;">
        <span>COURIER: ${order.courierName || 'Standard Express'}</span>
        <span>AWB: <strong style="font-family:monospace;">${order.awbCode || 'PENDING'}</strong></span>
      </div>
      ${generateSimulatedBarcodeSvg(order.awbCode || order.orderNumber, 34)}
    </div>` : `
    <div style="border:1px dashed #9ca3af;border-radius:6px;padding:6px;margin-bottom:10px;text-align:center;">
      ${generateSimulatedBarcodeSvg(order.orderNumber, 30)}
      <div style="font-size:9px;font-family:monospace;font-weight:700;color:#374151;">#${order.orderNumber}</div>
    </div>`}

    <!-- Addresses Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <!-- SHIP TO -->
      <div style="border:2px solid #111;border-radius:6px;padding:8px;background:#fff;">
        <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#4b5563;border-bottom:1px solid #e5e7eb;padding-bottom:3px;margin-bottom:4px;">📍 DELIVER TO (SHIP TO)</div>
        <p style="margin:0 0 3px 0;font-weight:800;font-size:12.5px;color:#111;">${order.address?.name || 'Customer'}</p>
        <p style="margin:0 0 2px 0;font-size:9.5px;line-height:1.3;color:#1f2937;">${order.address?.line1 || ''}${order.address?.line2 ? ', ' + order.address.line2 : ''}</p>
        <p style="margin:0 0 4px 0;font-size:9.5px;line-height:1.3;color:#1f2937;">${order.address?.city || ''}, ${order.address?.state || ''}</p>
        <p style="margin:0 0 4px 0;font-size:12px;font-weight:900;color:#111;background:#fef08a;display:inline-block;padding:1px 4px;border-radius:3px;">PIN: ${order.address?.pincode || ''}</p>
        <p style="margin:3px 0 0 0;font-size:10.5px;font-weight:800;color:#111;">📞 ${order.address?.phone || ''}</p>
      </div>

      <!-- SHIP FROM -->
      <div style="border:1px solid #d1d5db;border-radius:6px;padding:8px;background:#f9fafb;">
        <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:3px;margin-bottom:4px;">RETURN ADDRESS (SHIP FROM)</div>
        <p style="margin:0 0 2px 0;font-weight:700;font-size:10.5px;color:#111;">Anjali Alankaram</p>
        <p style="margin:0 0 2px 0;font-size:9px;line-height:1.3;color:#4b5563;white-space:pre-line;">${storeAddress || 'Main Warehouse, Hyderabad, AP/TS'}</p>
        <p style="margin:3px 0 0 0;font-size:9.5px;font-weight:700;color:#374151;">Support: ${supportPhone || '+91 8919045363'}</p>
      </div>
    </div>

    <!-- Items Summary & Charges Table -->
    <div style="border:1px solid #d1d5db;border-radius:6px;overflow:hidden;background:#fff;margin-bottom:10px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;border-bottom:1px solid #d1d5db;">
            <th style="padding:4px 6px;text-align:left;font-size:9px;font-weight:800;color:#374151;">ITEM TITLE</th>
            <th style="padding:4px 6px;text-align:center;font-size:9px;font-weight:800;color:#374151;">VARIANT</th>
            <th style="padding:4px 6px;text-align:center;font-size:9px;font-weight:800;color:#374151;">QTY</th>
            <th style="padding:4px 6px;text-align:right;font-size:9px;font-weight:800;color:#374151;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          ${overflowCount > 0 ? `<tr><td colspan="4" style="padding:3px;text-align:center;font-size:8.5px;color:#6b7280;background:#f9fafb;font-weight:600;">+ ${overflowCount} more items in order</td></tr>` : ''}
          <tr style="border-top:1px solid #e5e7eb;">
            <td colspan="3" style="padding:2px 6px;text-align:right;font-size:9px;color:#4b5563;font-weight:500;">Subtotal</td>
            <td style="padding:2px 6px;text-align:right;font-size:9px;font-weight:600;color:#111827;">₹${subtotal.toLocaleString('en-IN')}</td>
          </tr>
          ${offerDiscount > 0 ? `
          <tr>
            <td colspan="3" style="padding:2px 6px;text-align:right;font-size:9px;color:#16a34a;font-weight:500;">🎉 ${offerTitle}</td>
            <td style="padding:2px 6px;text-align:right;font-size:9px;font-weight:600;color:#16a34a;">-₹${offerDiscount.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${discountAmount > 0 ? `
          <tr>
            <td colspan="3" style="padding:2px 6px;text-align:right;font-size:9px;color:#16a34a;font-weight:500;">🏷️ ${couponCode}</td>
            <td style="padding:2px 6px;text-align:right;font-size:9px;font-weight:600;color:#16a34a;">-₹${discountAmount.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          <tr>
            <td colspan="3" style="padding:2px 6px;text-align:right;font-size:9px;color:#4b5563;font-weight:500;">🚚 Shipping Fee</td>
            <td style="padding:2px 6px;text-align:right;font-size:9px;font-weight:600;color:#111827;">${shippingCharge > 0 ? `+₹${shippingCharge.toLocaleString('en-IN')}` : 'FREE'}</td>
          </tr>
          ${platformFee > 0 ? `
          <tr>
            <td colspan="3" style="padding:2px 6px;text-align:right;font-size:9px;color:#4b5563;font-weight:500;">⚡ Platform Fee</td>
            <td style="padding:2px 6px;text-align:right;font-size:9px;font-weight:600;color:#111827;">+₹${platformFee.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${codCharges > 0 ? `
          <tr>
            <td colspan="3" style="padding:2px 6px;text-align:right;font-size:9px;color:#4b5563;font-weight:500;">💵 COD Charges</td>
            <td style="padding:2px 6px;text-align:right;font-size:9px;font-weight:600;color:#111827;">+₹${codCharges.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${giftCharge > 0 ? `
          <tr>
            <td colspan="3" style="padding:2px 6px;text-align:right;font-size:9px;color:#4b5563;font-weight:500;">🎁 Gift Charges</td>
            <td style="padding:2px 6px;text-align:right;font-size:9px;font-weight:600;color:#111827;">+₹${giftCharge.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${gstAmount > 0 ? `
          <tr>
            <td colspan="3" style="padding:2px 6px;text-align:right;font-size:9px;color:#4b5563;font-weight:500;">🏛️ GST / Tax</td>
            <td style="padding:2px 6px;text-align:right;font-size:9px;font-weight:600;color:#111827;">+₹${gstAmount.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          <tr style="border-top:1.5px solid #111;background:#f9fafb;">
            <td colspan="3" style="padding:4px 6px;text-align:right;font-size:10px;font-weight:800;color:#111827;">Total Amount</td>
            <td style="padding:4px 6px;text-align:right;font-size:11px;font-weight:900;color:#111827;">₹${totalAmount.toLocaleString('en-IN')}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer Total -->
    <div style="display:flex;justify-content:space-between;align-items:center;border-top:2px solid #111;padding-top:6px;margin-top:auto;">
      <div style="font-size:9px;color:#6b7280;">Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      <div style="font-size:11.5px;font-weight:800;">TOTAL ORDER VALUE: <span style="font-size:13.5px;font-weight:900;">₹${totalAmount.toLocaleString('en-IN')}</span></div>
    </div>
  </div>`;
}

// ── 2. A4 Full Page Invoice & Packing Slip (210 x 297 mm) ───────────────────
function generateA4CardHtml(order: any, storeAddress?: string, supportPhone?: string): string {
  const subtotal = order.subtotal
    ? Number(order.subtotal)
    : (order.items || []).reduce(
        (sum: number, it: any) => sum + Number(it.totalPrice || it.unitPrice * it.quantity),
        0,
      );
  const discountAmount = Number(order.discountAmount || 0);
  const offerDiscount = Number(order.offerDiscount || 0);
  const offerTitle = order.offerTitle || 'Offer Discount';
  const couponCode = order.couponCode ? `Coupon (${order.couponCode})` : 'Coupon Discount';
  const shippingCharge = Number(order.shippingCharge || 0);
  const platformFee = Number(order.platformFee || 0);
  const codCharges = Number(order.codCharges || 0);
  const giftCharge = Number(order.giftCharge || 0);
  const gstAmount = Number(order.gstAmount || 0);
  const totalAmount = Number(
    order.totalAmount ||
      subtotal - discountAmount - offerDiscount + shippingCharge + platformFee + codCharges + giftCharge + gstAmount,
  );

  const itemsRows = (order.items || []).map((it: any, index: number) => {
    const imgUrl = getItemImageUrl(it);
    const sizeStr = it.variantInfo?.size || it.variant?.size || '';
    const colorStr = it.variantInfo?.color || it.variant?.color || '';
    const variantText = `${sizeStr}${colorStr ? (sizeStr ? ' / ' : '') + colorStr : ''}`;
    const priceText = Number(it.totalPrice || it.unitPrice * it.quantity).toLocaleString('en-IN');

    return `<tr>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-size:11px;font-weight:600;">${index + 1}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;vertical-align:middle;width:48px;">
        ${
          imgUrl
            ? `<img src="${imgUrl}" alt="Item" crossorigin="anonymous" style="width:38px;height:38px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;display:inline-block;" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2238%22 height=%2238%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239ca3af%22 stroke-width=%221.5%22><rect width=%2218%22 height=%2218%22 x=%223%22 y=%223%22 rx=%222%22/><circle cx=%229%22 cy=%229%22 r=%222%22/><path d=%22m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21%22/></svg>';"/>`
            : `<span style="font-size:9px;color:#9ca3af;">—</span>`
        }
      </td>
      <td style="padding:8px;border:1px solid #e5e7eb;">
        <div style="font-weight:700;font-size:12px;color:#111827;">${it.productName}</div>
        ${it.sku ? `<div style="font-size:9.5px;color:#6b7280;font-family:monospace;margin-top:2px;">SKU: ${it.sku}</div>` : ''}
      </td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-size:11px;color:#374151;">${variantText || 'Standard'}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-size:11px;font-weight:700;">${it.quantity}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-size:11px;color:#374151;">₹${Number(it.unitPrice).toLocaleString('en-IN')}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-size:11px;font-weight:700;color:#111827;">₹${priceText}</td>
    </tr>`;
  }).join('');

  return `<div id="label-card-${order.orderNumber}" class="label-card size-a4" style="width:100%;max-width:680px;min-height:880px;box-sizing:border-box;background:#fff;border:2px solid #111;padding:24px;font-family:Inter,Arial,sans-serif;color:#111;margin:0 auto 24px auto;page-break-after:always;break-after:page;">
    <!-- Document Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px;">
      <div>
        <h1 style="margin:0;font-size:22px;font-weight:900;color:#111827;letter-spacing:-0.03em;">📦 ANJALI ALANKARAM</h1>
        <p style="margin:4px 0 0 0;font-size:11px;color:#4b5563;white-space:pre-line;">${storeAddress || 'Hyderabad, Telangana, India'}</p>
        <p style="margin:2px 0 0 0;font-size:11px;color:#4b5563;font-weight:600;">📞 Customer Support: ${supportPhone || '+91 8919045363'}</p>
      </div>
      <div style="text-align:right;">
        <div style="font-size:14px;font-weight:900;color:#111827;text-transform:uppercase;">TAX INVOICE / PACKING SLIP</div>
        <div style="font-family:monospace;font-size:16px;font-weight:800;margin-top:4px;">#${order.orderNumber}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;">Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <!-- SHIP TO -->
      <div style="border:1.5px solid #111;border-radius:8px;padding:12px;background:#fff;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#4b5563;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:6px;">📍 DELIVER TO (SHIPPING ADDRESS)</div>
        <p style="margin:0 0 4px 0;font-weight:800;font-size:14px;color:#111;">${order.address?.name || 'Customer'}</p>
        <p style="margin:0 0 2px 0;font-size:11px;line-height:1.4;">${order.address?.line1 || ''}${order.address?.line2 ? ', ' + order.address.line2 : ''}</p>
        <p style="margin:0 0 4px 0;font-size:11px;line-height:1.4;">${order.address?.city || ''}, ${order.address?.state || ''} — <strong>${order.address?.pincode || ''}</strong></p>
        <p style="margin:6px 0 0 0;font-size:12px;font-weight:800;color:#111;">📞 ${order.address?.phone || ''}</p>
      </div>

      <!-- ORDER & SHIPMENT INFO -->
      <div style="border:1px solid #d1d5db;border-radius:8px;padding:12px;background:#f9fafb;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:6px;">LOGISTICS & PAYMENT INFO</div>
        <p style="margin:3px 0;font-size:11px;"><strong>Payment Method:</strong> ${order.paymentMethod === 'RAZORPAY' ? 'Online Paid (Razorpay)' : 'Cash on Delivery (COD)'}</p>
        <p style="margin:3px 0;font-size:11px;"><strong>Payment Status:</strong> ${order.paymentStatus || 'PENDING'}</p>
        ${order.courierName ? `<p style="margin:3px 0;font-size:11px;"><strong>Courier Partner:</strong> ${order.courierName}</p>` : ''}
        ${order.awbCode ? `<p style="margin:3px 0;font-size:11px;"><strong>AWB Tracking #:</strong> <span style="font-family:monospace;font-weight:700;">${order.awbCode}</span></p>` : ''}
        <div style="margin-top:6px;">
          ${generateSimulatedBarcodeSvg(order.awbCode || order.orderNumber, 32)}
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div style="margin-bottom:16px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;border-top:1px solid #111;border-bottom:1px solid #111;">
            <th style="padding:6px;font-size:10px;font-weight:800;text-align:center;width:30px;">#</th>
            <th style="padding:6px;font-size:10px;font-weight:800;text-align:center;width:48px;">IMAGE</th>
            <th style="padding:6px;font-size:10px;font-weight:800;text-align:left;">PRODUCT DESCRIPTION</th>
            <th style="padding:6px;font-size:10px;font-weight:800;text-align:center;">VARIANT</th>
            <th style="padding:6px;font-size:10px;font-weight:800;text-align:center;">QTY</th>
            <th style="padding:6px;font-size:10px;font-weight:800;text-align:right;">UNIT PRICE</th>
            <th style="padding:6px;font-size:10px;font-weight:800;text-align:right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <!-- Summary Box -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
      <div style="width:55%;font-size:10px;color:#4b5563;border:1px solid #e5e7eb;border-radius:6px;padding:8px;background:#fafafa;">
        <div style="font-weight:700;color:#111;margin-bottom:4px;">Terms & Notes:</div>
        <div>• Please verify package seal before accepting delivery.</div>
        <div>• For any return or damage claim, unboxing video is required.</div>
        <div>• Thank you for shopping with Anjali Alankaram!</div>
      </div>
      <div style="width:40%;">
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          <tr>
            <td style="padding:3px 0;color:#4b5563;">Subtotal:</td>
            <td style="padding:3px 0;text-align:right;font-weight:600;">₹${subtotal.toLocaleString('en-IN')}</td>
          </tr>
          ${offerDiscount > 0 ? `<tr>
            <td style="padding:3px 0;color:#16a34a;">${offerTitle}:</td>
            <td style="padding:3px 0;text-align:right;font-weight:600;color:#16a34a;">-₹${offerDiscount.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${discountAmount > 0 ? `<tr>
            <td style="padding:3px 0;color:#16a34a;">${couponCode}:</td>
            <td style="padding:3px 0;text-align:right;font-weight:600;color:#16a34a;">-₹${discountAmount.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:3px 0;color:#4b5563;">Shipping Fee:</td>
            <td style="padding:3px 0;text-align:right;font-weight:600;">${shippingCharge > 0 ? `+₹${shippingCharge.toLocaleString('en-IN')}` : 'FREE'}</td>
          </tr>
          ${platformFee > 0 ? `<tr>
            <td style="padding:3px 0;color:#4b5563;">Platform Fee:</td>
            <td style="padding:3px 0;text-align:right;font-weight:600;">+₹${platformFee.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${codCharges > 0 ? `<tr>
            <td style="padding:3px 0;color:#4b5563;">COD Charges:</td>
            <td style="padding:3px 0;text-align:right;font-weight:600;">+₹${codCharges.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${gstAmount > 0 ? `<tr>
            <td style="padding:3px 0;color:#4b5563;">GST / Tax:</td>
            <td style="padding:3px 0;text-align:right;font-weight:600;">+₹${gstAmount.toLocaleString('en-IN')}</td>
          </tr>` : ''}
          <tr style="border-top:2px solid #111;border-bottom:2px solid #111;">
            <td style="padding:6px 0;font-weight:800;font-size:13px;">GRAND TOTAL:</td>
            <td style="padding:6px 0;text-align:right;font-weight:900;font-size:14px;">₹${totalAmount.toLocaleString('en-IN')}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>`;
}

// ── Dispatcher for Single Label Card HTML ────────────────────────────────────
export function generateSingleLabelCardHtml(
  order: any,
  storeAddress?: string,
  supportPhone?: string,
  size: LabelSize = '4x6'
): string {
  if (size === 'a4') {
    return generateA4CardHtml(order, storeAddress, supportPhone);
  }
  return generate4x6CardHtml(order, storeAddress, supportPhone);
}

// ── Dispatcher for Bulk Labels HTML ──────────────────────────────────────────
export function generateBulkLabelsHtml(
  orders: any[],
  storeAddress?: string,
  supportPhone?: string,
  size: LabelSize = '4x6'
): string {
  return orders
    .map((order) => generateSingleLabelCardHtml(order, storeAddress, supportPhone, size))
    .join('');
}

// ── Cross-Platform Printing via Hidden Iframe (PWA & Mobile Safe!) ────────────
export function printLabelHtmlViaIframe(htmlContent: string) {
  if (typeof window === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>Print Label</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 12px; background: white; color: #111; }
    .label-card { page-break-after: always; break-after: page; }
    @media print {
      body { padding: 0 !important; margin: 0 !important; background: white !important; }
      .label-card { page-break-after: always !important; break-after: page !important; margin: 0 !important; }
    }
  </style>
  </head><body>
    ${htmlContent}
  </body></html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Iframe print error:', err);
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2000);
    }
  }, 400);
}

// ── Convert image URL to Base64 Data URL (Solves missing image in canvas) ────
async function convertImageSrcToBase64(src: string): Promise<string> {
  if (!src || src.startsWith('data:')) return src;

  let fullUrl = src;
  if (fullUrl.startsWith('/') && typeof window !== 'undefined') {
    fullUrl = `${window.location.origin}${fullUrl}`;
  }

  // 1. Primary Method: Fetch Blob + FileReader (Bypasses Canvas Tainting & CORS blocks)
  try {
    const response = await fetch(fullUrl, { cache: 'force-cache' });
    if (response.ok) {
      const blob = await response.blob();
      if (blob && blob.size > 0) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('Invalid reader output'));
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (dataUrl && dataUrl.startsWith('data:image/')) {
          return dataUrl;
        }
      }
    }
  } catch (_e) {
    // Fall back to canvas drawing
  }

  // 2. Secondary Method: Image object + Canvas conversion with CORS anonymous
  try {
    const dataUrl = await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 100;
          canvas.height = img.naturalHeight || img.height || 100;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch (_err) {}
        resolve(fullUrl);
      };
      img.onerror = () => resolve(fullUrl);
      img.src = fullUrl;
    });
    if (dataUrl && dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }
  } catch (_e) {}

  return fullUrl;
}

// ── Safe Canvas Capture Helper (Avoids 'Unable to find element in cloned iframe') ──
async function captureElementToCanvas(
  targetElement: HTMLElement,
  targetWidthPx?: number
): Promise<HTMLCanvasElement> {
  if (typeof window === 'undefined') {
    throw new Error('Canvas capture requires window context.');
  }

  // First, convert all images inside the LIVE RENDERED DOM target element to Base64 Data URIs directly!
  // This extracts loaded pixels from the browser's active DOM memory before cloning.
  const originalImages = Array.from(targetElement.querySelectorAll('img')) as HTMLImageElement[];
  if (originalImages.length > 0) {
    await Promise.all(
      originalImages.map(async (origImg) => {
        origImg.removeAttribute('onerror');
        const srcAttr = origImg.getAttribute('src') || origImg.src;

        // Try extracting already rendered pixels directly from loaded DOM image element
        try {
          if (origImg.complete && origImg.naturalWidth > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = origImg.naturalWidth;
            canvas.height = origImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(origImg, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              if (dataUrl && dataUrl.startsWith('data:image/')) {
                origImg.setAttribute('src', dataUrl);
                origImg.src = dataUrl;
                return;
              }
            }
          }
        } catch (_e) {
          // Canvas tainted, fall back to fetch/base64
        }

        if (srcAttr && !srcAttr.startsWith('data:')) {
          const base64Src = await convertImageSrcToBase64(srcAttr);
          if (base64Src && base64Src.startsWith('data:image/')) {
            origImg.setAttribute('src', base64Src);
            origImg.src = base64Src;
          }
        }
      })
    );
  }

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '0';
  tempContainer.style.zIndex = '-99999';
  tempContainer.style.background = '#ffffff';

  const width = targetWidthPx || targetElement.offsetWidth || 400;
  tempContainer.style.width = `${width}px`;

  const clone = targetElement.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.boxSizing = 'border-box';
  clone.style.maxWidth = 'none';

  tempContainer.appendChild(clone);
  document.body.appendChild(tempContainer);

  try {
    const cloneImages = Array.from(clone.querySelectorAll('img')) as HTMLImageElement[];
    if (cloneImages.length > 0) {
      await Promise.all(
        cloneImages.map(async (cImg) => {
          cImg.removeAttribute('onerror');
          const currentSrc = cImg.getAttribute('src') || cImg.src;
          if (currentSrc && !currentSrc.startsWith('data:')) {
            const base64Src = await convertImageSrcToBase64(currentSrc);
            if (base64Src && base64Src.startsWith('data:image/')) {
              cImg.removeAttribute('crossorigin');
              cImg.setAttribute('src', base64Src);
              cImg.src = base64Src;
            }
          }
        })
      );
    }

    return await html2canvas(clone, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: width,
    });
  } finally {
    if (tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
  }
}

// ── Cross-Platform JPG Download Helper (iOS & Android PWA Supported!) ────────
export async function downloadLabelElementAsJpg(
  containerElement: HTMLElement,
  filename: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; shared?: boolean }> {
  try {
    if (onProgress) onProgress(10, 100);
    const cards = Array.from(containerElement.querySelectorAll('.label-card')) as HTMLElement[];
    const targetElement = cards.length > 0 ? cards[0] : containerElement;

    const canvas = await captureElementToCanvas(targetElement);
    if (onProgress) onProgress(70, 100);
    
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Failed to generate label image canvas.');
          resolve({ success: false });
          return;
        }

        const isMobileOrPWA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

        // Native iOS & Android PWA Share Sheet
        if (isMobileOrPWA && navigator.share && navigator.canShare) {
          const file = new File([blob], filename, { type: 'image/jpeg' });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: filename,
                text: 'Order Label'
              });
              resolve({ success: true, shared: true });
              return;
            } catch (err: any) {
              if (err.name === 'AbortError') {
                resolve({ success: true, shared: false });
                return;
              }
            }
          }
        }

        // Fallback standard link download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          if (link.parentNode) link.parentNode.removeChild(link);
          URL.revokeObjectURL(url);
          if (onProgress) onProgress(100, 100);
          resolve({ success: true });
        }, 1000);
      }, 'image/jpeg', 0.95);
    });
  } catch (err: any) {
    alert('Download JPG error: ' + (err.message || err));
    return { success: false };
  }
}

// ── Multi-Page PDF Download Helper (Every order rendered on its own page!) ────
export async function downloadLabelElementAsPdf(
  containerElement: HTMLElement,
  filename: string,
  size: LabelSize = '4x6',
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; shared?: boolean }> {
  try {
    // Find all individual label cards inside the preview container
    let cards = Array.from(containerElement.querySelectorAll('.label-card')) as HTMLElement[];
    if (cards.length === 0) {
      cards = [containerElement];
    }

    if (onProgress) onProgress(0, cards.length);

    let jsPDFModule;
    try {
      jsPDFModule = await import('jspdf');
    } catch {
      return downloadLabelElementAsJpg(containerElement, filename.replace('.pdf', '.jpg'));
    }

    const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;
    const option = LABEL_SIZES.find((s) => s.id === size) || LABEL_SIZES[0];
    const targetWidthPx = size === 'a4' ? 794 : 378;

    // Create jsPDF document matching exact dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [option.widthMm, option.heightMm]
    });

    // Iterate through EVERY label card and add each to its own page!
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const canvas = await captureElementToCanvas(card, targetWidthPx);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage([option.widthMm, option.heightMm], 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, option.widthMm, option.heightMm);
      if (onProgress) onProgress(i + 1, cards.length);
    }

    const pdfBlob = pdf.output('blob');
    const isMobileOrPWA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

    // Native iOS & Android PWA Share Sheet
    if (isMobileOrPWA && navigator.share && navigator.canShare) {
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: filename,
            text: 'Order Label PDF'
          });
          return { success: true, shared: true };
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return { success: true, shared: false };
          }
        }
      }
    }

    // Fallback standard download
    pdf.save(filename);
    return { success: true };
  } catch (err: any) {
    alert('Download PDF error: ' + (err.message || err));
    return { success: false };
  }
}

// Legacy fallback helper for backward compatibility
export function printOrderLabel(order: any, storeAddress?: string) {
  const settings = useSettingsStore.getState().settings;
  const supportPhone = settings?.supportPhone || '+91 8919045363';
  const cardHtml = generateSingleLabelCardHtml(order, storeAddress, supportPhone, '4x6');
  printLabelHtmlViaIframe(cardHtml);
}

export function printBulkOrderLabels(orders: any[], storeAddress?: string, filterInfo?: string) {
  const settings = useSettingsStore.getState().settings;
  const supportPhone = settings?.supportPhone || '+91 8919045363';
  const bulkHtml = generateBulkLabelsHtml(orders, storeAddress, supportPhone, '4x6');
  printLabelHtmlViaIframe(bulkHtml);
}

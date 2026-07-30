import html2canvas from 'html2canvas';
import { useSettingsStore } from '@/store/useSettingsStore';

export function getItemImageUrl(it: any): string {
  let img = '';
  // 1. Direct variant images
  if (it.variant?.images && Array.isArray(it.variant.images) && it.variant.images.length > 0 && it.variant.images[0]) {
    img = it.variant.images[0];
  }
  // 2. Variant color match in product.variants
  const color = it.variantInfo?.color || it.variant?.color;
  if (!img && color && it.product?.variants && Array.isArray(it.product.variants)) {
    const match = it.product.variants.find((v: any) => v.color === color && v.images && v.images.length > 0);
    if (match?.images?.[0]) {
      img = match.images[0];
    }
  }
  // 3. Stored item imageUrl
  if (!img && it.imageUrl) {
    img = it.imageUrl;
  }
  // 4. Product images fallback
  if (!img && it.product?.images && Array.isArray(it.product.images) && it.product.images.length > 0 && it.product.images[0]) {
    img = it.product.images[0];
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

export function generateSingleLabelCardHtml(order: any, storeAddress?: string, supportPhone?: string): string {
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

  const items = (order.items || [])
    .map((it: any) => {
      const imgUrl = getItemImageUrl(it);
      const sizeStr = it.variantInfo?.size || it.variant?.size || '';
      const colorStr = it.variantInfo?.color || it.variant?.color || '';
      const variantText = `${sizeStr}${colorStr ? (sizeStr ? ' / ' : '') + colorStr : ''}`;
      const priceText = Number(it.totalPrice || it.unitPrice * it.quantity).toLocaleString('en-IN');

      return `<tr>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;vertical-align:middle;width:56px;">
        ${
          imgUrl
            ? `<img src="${imgUrl}" alt="${it.productName || 'Product'}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;display:block;margin:0 auto;" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-size:10px;color:#9ca3af;\\'>No img</span>';" />`
            : `<span style="font-size:10px;color:#9ca3af;">No img</span>`
        }
      </td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;vertical-align:middle;">
        <div style="font-weight:600;font-size:13px;color:#111827;">${it.productName}</div>
      </td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;vertical-align:middle;font-size:12px;color:#374151;">${variantText || '—'}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;vertical-align:middle;font-size:12px;font-weight:600;">${it.quantity}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;vertical-align:middle;font-size:12px;font-weight:600;">₹${priceText}</td>
    </tr>`;
    })
    .join('');

  return `<div id="label-content-${order.orderNumber}" class="label-card" style="border:2px solid #111;border-radius:8px;padding:20px;background:white;max-width:580px;margin:0 auto 24px auto;box-sizing:border-box;">
    <h2>📦 Anjali Alankaram</h2>
    <p style="margin:0;font-size:12px;color:#6b7280;">Order Management Label</p>
    <hr class="divider"/>
    <div style="display:grid;grid-template-columns:1fr;gap:16px;">
      <div class="section">
        <div class="label">Order Info</div>
        <p style="margin:6px 0;font-size:16px;font-weight:700;font-family:monospace;">#${order.orderNumber}</p>
        <p style="margin:2px 0;font-size:12px;">Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        <p style="margin:2px 0;font-size:12px;">Payment: ${order.paymentMethod === 'RAZORPAY' ? 'Online (Paid)' : 'Cash on Delivery'}</p>
        ${order.awbCode ? `<p style="margin:6px 0;font-size:12px;"><strong>AWB:</strong> ${order.awbCode}</p>` : ''}
        ${order.courierName ? `<p style="margin:2px 0;font-size:12px;"><strong>Courier:</strong> ${order.courierName}</p>` : ''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="section">
        <div class="label">From Address</div>
        <p style="margin:6px 0;font-weight:700;font-size:15px;">Anjali Alankaram</p>
        <p style="margin:2px 0;line-height:1.4;white-space:pre-line;">${storeAddress || 'Address not set'}</p>
        <p style="margin:6px 0;font-size:13px;font-weight:700;">📞 Support: ${supportPhone || '+91 8919045363'}</p>
      </div>
      <div class="section">
        <div class="label">📍 Delivery Address</div>
        <p style="margin:6px 0;font-weight:700;font-size:15px;">${order.address?.name || ''}</p>
        <p style="margin:2px 0;line-height:1.4;">${order.address?.line1 || ''}${order.address?.line2 ? ', ' + order.address.line2 : ''}</p>
        <p style="margin:2px 0;line-height:1.4;">${order.address?.city || ''}, ${order.address?.state || ''} — <strong>${order.address?.pincode || ''}</strong></p>
        <p style="margin:6px 0;font-size:15px;font-weight:700;">📞 ${order.address?.phone || ''}</p>
      </div>
    </div>
    <div class="section">
      <div class="label">Order Items</div>
      <table>
        <thead><tr>
          <th style="text-align:center;width:56px;">Image</th>
          <th>Product</th>
          <th style="text-align:center;">Variant</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Price</th>
        </tr></thead>
        <tbody>
          ${items}
          <tr class="summary-row">
            <td colspan="4" style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#4b5563;font-weight:500;">Subtotal</td>
            <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;">₹${subtotal.toLocaleString('en-IN')}</td>
          </tr>
          ${
            offerDiscount > 0
              ? `
          <tr class="summary-row">
            <td colspan="4" style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;font-weight:500;">🎉 ${offerTitle}</td>
            <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;font-weight:600;">-₹${offerDiscount.toLocaleString('en-IN')}</td>
          </tr>`
              : ''
          }
          ${
            discountAmount > 0
              ? `
          <tr class="summary-row">
            <td colspan="4" style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;font-weight:500;">🏷️ ${couponCode}</td>
            <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;font-weight:600;">-₹${discountAmount.toLocaleString('en-IN')}</td>
          </tr>`
              : ''
          }
          ${
            shippingCharge > 0
              ? `
          <tr class="summary-row">
            <td colspan="4" style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#4b5563;font-weight:500;">🚚 Delivery Fee</td>
            <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;">+₹${shippingCharge.toLocaleString('en-IN')}</td>
          </tr>`
              : `
          <tr class="summary-row">
            <td colspan="4" style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#4b5563;font-weight:500;">🚚 Delivery Fee</td>
            <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;font-weight:600;">FREE</td>
          </tr>`
          }
          ${
            platformFee > 0
              ? `
          <tr class="summary-row">
            <td colspan="4" style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#4b5563;font-weight:500;">⚡ Platform Fee</td>
            <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;">+₹${platformFee.toLocaleString('en-IN')}</td>
          </tr>`
              : ''
          }
          ${
            codCharges > 0
              ? `
          <tr class="summary-row">
            <td colspan="4" style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#4b5563;font-weight:500;">💵 COD Charges</td>
            <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;">+₹${codCharges.toLocaleString('en-IN')}</td>
          </tr>`
              : ''
          }
          ${
            giftCharge > 0
              ? `
          <tr class="summary-row">
            <td colspan="4" style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#4b5563;font-weight:500;">🎁 Gift Charges</td>
            <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;">+₹${giftCharge.toLocaleString('en-IN')}</td>
          </tr>`
              : ''
          }
          ${
            gstAmount > 0
              ? `
          <tr class="summary-row">
            <td colspan="4" style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#4b5563;font-weight:500;">🏛️ GST / Tax</td>
            <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;">+₹${gstAmount.toLocaleString('en-IN')}</td>
          </tr>`
              : ''
          }
          <tr class="total-row">
            <td colspan="4" style="padding:7px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:700;font-size:13px;color:#111827;">Total Amount</td>
            <td style="padding:7px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:800;font-size:14px;color:#111827;">₹${totalAmount.toLocaleString('en-IN')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

export function printOrderLabel(order: any, storeAddress?: string) {
  const settings = useSettingsStore.getState().settings;
  const supportPhone = settings?.supportPhone || '+91 8919045363';

  // Expose download handler globally on parent window so child popup can trigger it
  (window as any).downloadLabelFromPopup = async (popupWin: Window, orderNum: string, btnElement?: HTMLButtonElement) => {
    const element = popupWin.document.getElementById(`label-content-${orderNum}`) || popupWin.document.getElementById('label-content');
    if (!element) {
      popupWin.alert('Label content element not found!');
      return;
    }
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.innerText = '⌛ Downloading...';
    }
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = popupWin.document.createElement('a');
      link.download = `Order-Label-${orderNum}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      popupWin.alert('Download failed: ' + err.message);
    } finally {
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerText = '📥 Download JPG';
      }
    }
  };

  const w = window.open('', '_blank', 'width=650,height=900');
  if (!w) return;

  const cardHtml = generateSingleLabelCardHtml(order, storeAddress, supportPhone);

  w.document.write(`<!DOCTYPE html><html><head><title>Order Label — ${order.orderNumber}</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;font-size:13px;color:#111;margin:24px;background:#f3f4f6;}
    h2{margin:0 0 4px;font-size:18px;color:#111827;}
    .section{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin:12px 0;}
    .label{font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;}
    table{width:100%;border-collapse:collapse;margin-top:8px;}
    th{background:#f3f4f6;padding:6px 8px;font-size:11px;font-weight:700;text-align:left;border:1px solid #e5e7eb;color:#374151;}
    .total-row td{font-weight:800;border-top:2px solid #111;background:#f9fafb;}
    .summary-row td{font-size:12px;}
    .divider{border:none;border-top:2px dashed #e5e7eb;margin:16px 0;}
    @media print{button{display:none !important;}}
  </style>
  </head><body>
  <div style="margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;">
    <button onclick="window.print()" style="padding:8px 20px;background:#2e576b;color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;">🖨 Print Label</button>
    <button onclick="if (window.opener && window.opener.downloadLabelFromPopup) { window.opener.downloadLabelFromPopup(window, '${order.orderNumber}', this); } else { alert('Parent window reference lost. Please keep the main window open.'); }" style="padding:8px 20px;background:#10b981;color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;">📥 Download JPG</button>
    <button onclick="window.close()" style="padding:8px 20px;background:#ef4444;color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;">❌ Close</button>
  </div>
  ${cardHtml}
  </body></html>`);
  w.document.close();
}

export function printBulkOrderLabels(orders: any[], storeAddress?: string, filterInfo?: string) {
  if (!orders || orders.length === 0) {
    alert('No orders available to print labels.');
    return;
  }

  const settings = useSettingsStore.getState().settings;
  const supportPhone = settings?.supportPhone || '+91 8919045363';

  const w = window.open('', '_blank', 'width=800,height=950');
  if (!w) return;

  const labelsHtml = orders
    .map(
      (order) => `
    <div class="label-page">
      ${generateSingleLabelCardHtml(order, storeAddress, supportPhone)}
    </div>
  `,
    )
    .join('');

  w.document.write(`<!DOCTYPE html><html><head><title>Bulk Confirmed Order Labels (${orders.length})</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; font-size: 13px; color: #111; margin: 24px; background: #f3f4f6; }
    h2 { margin: 0 0 4px; font-size: 18px; color: #111827; }
    .section { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin: 12px 0; }
    .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: .05em; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f3f4f6; padding: 6px 8px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #e5e7eb; color: #374151; }
    .total-row td { font-weight: 800; border-top: 2px solid #111; background: #f9fafb; }
    .summary-row td { font-size: 12px; }
    .divider { border: none; border-top: 2px dashed #e5e7eb; margin: 16px 0; }
    .action-header { margin-bottom: 20px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; background: white; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .label-page { page-break-after: always; break-after: page; margin-bottom: 30px; }
    @media print {
      .action-header { display: none !important; }
      body { background: white !important; margin: 0 !important; }
      .label-page { margin-bottom: 0 !important; page-break-after: always !important; break-after: page !important; }
    }
  </style>
  </head><body>
  <div class="action-header">
    <button onclick="window.print()" style="padding:10px 24px;background:#2e576b;color:white;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">🖨 Print / Save PDF (${orders.length} Labels)</button>
    <button onclick="window.close()" style="padding:10px 20px;background:#ef4444;color:white;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">❌ Close</button>
    <span style="font-weight:600;color:#374151;font-size:13px;margin-left:auto;">
      Total: <strong>${orders.length}</strong> Confirmed Order Label(s) ${filterInfo ? `(${filterInfo})` : ''}
    </span>
  </div>
  ${labelsHtml}
  </body></html>`);
  w.document.close();
}

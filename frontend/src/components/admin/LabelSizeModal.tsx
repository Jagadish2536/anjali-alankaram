'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X, Printer, Download, FileText, Image as ImageIcon,
  CheckCircle2, Loader2, Share2, Info, Sparkles, Smartphone
} from 'lucide-react';
import {
  LabelSize, LABEL_SIZES, generateSingleLabelCardHtml,
  generateBulkLabelsHtml, printLabelHtmlViaIframe,
  downloadLabelElementAsJpg, downloadLabelElementAsPdf
} from '@/lib/printLabel';
import { useSettingsStore } from '@/store/useSettingsStore';

interface LabelSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: any;
  orders?: any[];
  filterInfo?: string;
}

export function LabelSizeModal({
  isOpen,
  onClose,
  order,
  orders,
  filterInfo
}: LabelSizeModalProps) {
  const [selectedSize, setSelectedSize] = useState<LabelSize>('4x6');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'print' | 'pdf' | 'jpg' | 'share' | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);
  const { settings, fetchSettings } = useSettingsStore();

  const isBulk = Array.isArray(orders) && orders.length > 0;
  const targetOrders = isBulk ? orders : (order ? [order] : []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (isOpen && targetOrders.length > 0) {
      const storeAddress = settings?.storeAddress || '';
      const supportPhone = settings?.supportPhone || '+91 8919045363';
      
      if (isBulk) {
        setPreviewHtml(generateBulkLabelsHtml(targetOrders, storeAddress, supportPhone, selectedSize));
      } else {
        setPreviewHtml(generateSingleLabelCardHtml(targetOrders[0], storeAddress, supportPhone, selectedSize));
      }
    }
  }, [isOpen, selectedSize, targetOrders, settings, isBulk]);

  if (!isOpen || targetOrders.length === 0) return null;

  const currentSizeObj = LABEL_SIZES.find(s => s.id === selectedSize) || LABEL_SIZES[0];
  const orderTitle = isBulk
    ? `${targetOrders.length} Confirmed Orders ${filterInfo ? `(${filterInfo})` : ''}`
    : `Order #${targetOrders[0]?.orderNumber}`;

  // ── Handle Actions ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    setIsProcessing(true);
    setActionType('print');
    try {
      const storeAddress = settings?.storeAddress || '';
      const supportPhone = settings?.supportPhone || '+91 8919045363';
      const html = isBulk
        ? generateBulkLabelsHtml(targetOrders, storeAddress, supportPhone, selectedSize)
        : generateSingleLabelCardHtml(targetOrders[0], storeAddress, supportPhone, selectedSize);

      printLabelHtmlViaIframe(html);
    } catch (err: any) {
      alert('Print error: ' + err.message);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const handleDownloadJpg = async () => {
    if (!previewRef.current) return;
    setIsProcessing(true);
    setActionType('jpg');
    try {
      const fileName = isBulk
        ? `Bulk-Order-Labels-${selectedSize}-${Date.now()}.jpg`
        : `Order-Label-#${targetOrders[0]?.orderNumber}-${selectedSize}.jpg`;

      await downloadLabelElementAsJpg(previewRef.current, fileName);
    } catch (err: any) {
      alert('Download JPG failed: ' + err.message);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsProcessing(true);
    setActionType('pdf');
    try {
      const fileName = isBulk
        ? `Bulk-Order-Labels-${selectedSize}-${Date.now()}.pdf`
        : `Order-Label-#${targetOrders[0]?.orderNumber}-${selectedSize}.pdf`;

      await downloadLabelElementAsPdf(previewRef.current, fileName, selectedSize);
    } catch (err: any) {
      alert('Download PDF failed: ' + err.message);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-outfit font-black text-foreground">
                Select Label Print & Download Size
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generating label for <strong className="text-foreground">{orderTitle}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view (Left: Size selection, Right: Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT 5 COLS: Size Selection Radio Cards */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              1. Choose Label Format & Size
            </h4>

            {LABEL_SIZES.map((sizeOpt) => {
              const isSelected = selectedSize === sizeOpt.id;
              return (
                <div
                  key={sizeOpt.id}
                  onClick={() => setSelectedSize(sizeOpt.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                    isSelected
                      ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`size-${sizeOpt.id}`}
                        name="labelSize"
                        checked={isSelected}
                        onChange={() => setSelectedSize(sizeOpt.id)}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <label htmlFor={`size-${sizeOpt.id}`} className="font-bold text-sm text-foreground cursor-pointer">
                        {sizeOpt.name}
                      </label>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-gray-100 text-gray-700 border shrink-0">
                      {sizeOpt.dimensions}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed pl-6">
                    {sizeOpt.description}
                  </p>

                  <div className="mt-2 pl-6 flex items-center gap-1.5">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-primary/10 text-primary">
                      {sizeOpt.badge}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* iOS PWA Helper Card */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 mt-4">
              <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">iOS / Android PWA Support:</strong>
                <p className="text-[11px] mt-0.5 text-amber-800 leading-tight">
                  Tapping Download PDF/JPG or Share opens native Share Sheet on iOS & Android PWA to directly save to Photos or Files without tab popups.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT 7 COLS: Live Label Preview */}
          <div className="lg:col-span-7 flex flex-col bg-gray-100/70 border rounded-2xl p-4 min-h-[380px] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" /> Live Preview ({currentSizeObj.dimensions})
              </span>
              <span className="text-[10px] font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full border">
                Full Details Formatted
              </span>
            </div>

            {/* Scaled preview container */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-gray-200/40 rounded-xl border border-dashed border-gray-300">
              <div
                ref={previewRef}
                className="shadow-xl rounded-lg overflow-hidden bg-white max-w-full transition-all duration-300 transform scale-95 sm:scale-100"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="px-6 py-4 border-t bg-gray-50/80 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Selected Format: <strong className="text-foreground">{currentSizeObj.name} ({currentSizeObj.dimensions})</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-gray-200/60 rounded-xl transition-colors"
            >
              Cancel
            </button>

            {/* Download JPG */}
            <button
              onClick={handleDownloadJpg}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 disabled:opacity-50 transition-all shadow-sm active:scale-95"
            >
              {isProcessing && actionType === 'jpg' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Preparing JPG...</>
              ) : (
                <><ImageIcon className="w-4 h-4" /> Download JPG</>
              )}
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 disabled:opacity-50 transition-all shadow-sm active:scale-95"
            >
              {isProcessing && actionType === 'pdf' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
              ) : (
                <><FileText className="w-4 h-4" /> Download PDF</>
              )}
            </button>

            {/* Print Label */}
            <button
              onClick={handlePrint}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              {isProcessing && actionType === 'print' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Printing...</>
              ) : (
                <><Printer className="w-4 h-4" /> Print Label</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

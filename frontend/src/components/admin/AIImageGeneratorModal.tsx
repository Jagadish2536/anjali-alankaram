'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Upload, Sparkles, CheckCircle2, Trash2, Download, RefreshCw,
  ZoomIn, AlertCircle, Loader2, ChevronRight, ChevronLeft, Info,
  ImagePlus, Wand2, Eye, Clock
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeneratedImage {
  key: string;
  url: string;
}

interface AISession {
  id: string;
  productId: string | null;
  adminId: string;
  sessionKey: string;
  status: string;
  generatedUrls: Array<{ key: string; url: string }>;
  approvedUrls: Array<{ key: string; url: string }>;
  background: string;
  customPrompt?: string | null;
}

interface Props {
  productId?: string;
  productName: string;
  onImagesApproved: (urls: string[]) => void;
  onClose: () => void;
}

// ─── Step indicator ────────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: 'Face Image' },
  { num: 2, label: 'Product Image' },
  { num: 3, label: 'Custom Prompt' },
  { num: 4, label: 'Generate & Review' },
];

// ─── Image Dropzone ────────────────────────────────────────────────────────────
function Dropzone({
  label,
  sublabel,
  file,
  preview,
  onFile,
  accept = 'image/jpeg,image/png,image/webp',
}: {
  label: string;
  sublabel: string;
  file: File | null;
  preview: string | null;
  onFile: (f: File) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFile(dropped);
    },
    [onFile],
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden
        ${isDragging
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 scale-[1.02]'
          : file
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20'
        }`}
      style={{ minHeight: 200 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      {preview ? (
        <div className="relative w-full h-52">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-bold flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Click to change
            </span>
          </div>
          <div className="absolute top-3 right-3 bg-emerald-500 text-white rounded-full p-1">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ImagePlus className="w-7 h-7 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</p>
          <p className="mt-3 text-xs text-slate-400">JPG, PNG, WEBP • Max 10MB</p>
        </div>
      )}
    </div>
  );
}

// ─── Image Card (in gallery) ────────────────────────────────────────────────────
function ImageCard({
  image,
  isApproved,
  onApprove,
  onReject,
  onDownload,
  onZoom,
  isLoading,
}: {
  image: { key: string; url: string };
  isApproved: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDownload: () => void;
  onZoom: () => void;
  isLoading: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 group
        ${isApproved ? 'border-emerald-400 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-violet-300'}`}
    >
      <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-800">
        <img
          src={image.url}
          alt="Generated product model pose"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button
          onClick={onZoom}
          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        {isApproved && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white rounded-full px-2 py-0.5 text-xs font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </div>
        )}
      </div>

      <div className="px-3 pb-3 pt-3 bg-white dark:bg-slate-900 flex gap-2">
        {!isApproved && (
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Approve
          </button>
        )}
        <button
          onClick={onDownload}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          title="Download"
        >
          <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
        </button>
        {!isApproved && (
          <button
            onClick={onReject}
            disabled={isLoading}
            className="p-2 rounded-xl border border-red-100 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AIImageGeneratorModal({
  productId,
  productName,
  onImagesApproved,
  onClose,
}: Props) {
  const [step, setStep] = useState(1);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [session, setSession] = useState<AISession | null>(null);
  const [approvedImages, setApprovedImages] = useState<Set<string>>(new Set());
  const [approvedUrls, setApprovedUrls] = useState<string[]>([]);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Queuing generation job...');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFaceFile = (f: File) => {
    setFaceFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setFacePreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleProductFile = (f: File) => {
    setProductFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setProductPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ── SQS Queue Polling Logic ──────────────────────────────────────────────────
  const startPolling = (sessionId: string) => {
    setGenerationProgress(5);
    setStatusMessage('Publishing SQS job...');
    let attempts = 0;

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      
      // 4 minutes timeout limit (each image generation has 2m timeout)
      if (attempts > 80) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setError('Generation timed out. Check SQS configuration or try again.');
        setIsGenerating(false);
        return;
      }

      try {
        const { data } = await api.get(`/ai-images/session/${sessionId}`);
        
        if (data.status === 'READY') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setSession(data);
          setIsGenerating(false);
          setStep(4);
          setGenerationProgress(100);
          showToast('success', `✨ AI images generated successfully!`);
        } else if (data.status === 'FAILED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setError('Generation job failed. Check backend logs for OpenAI issues.');
          setIsGenerating(false);
          setSession(null);
        } else if (data.status === 'GENERATING') {
          const posesDone = data.generatedKeys?.length || 0;
          setStatusMessage(`Generating pose ${posesDone + 1}/4...`);
          setGenerationProgress(20 + (posesDone * 20)); // Incremental progress bar
        } else if (data.status === 'QUEUED') {
          setStatusMessage('Waiting in SQS queue for worker...');
          setGenerationProgress(10);
        }
      } catch (err: any) {
        console.warn('Transient polling error:', err.message);
      }
    }, 3000); // Poll database state every 3 seconds
  };

  // ── Generate images ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!faceFile || !productFile) {
      setError('Please upload both face image and product image');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStep(4);

    try {
      const formData = new FormData();
      formData.append('faceImage', faceFile);
      formData.append('productImage', productFile);
      if (productId) formData.append('productId', productId);
      if (customPrompt.trim()) formData.append('customPrompt', customPrompt.trim());

      // SQS Queue triggers instantly
      const { data } = await api.post('/ai-images/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      startPolling(data.sessionId);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Enqueuing job failed. Please try again.';
      setError(msg);
      setIsGenerating(false);
      showToast('error', msg);
    }
  };

  // ── Approve image ─────────────────────────────────────────────────────────────
  const handleApprove = async (image: { key: string; url: string }) => {
    if (!session) return;
    setLoadingKey(image.key);
    try {
      const { data } = await api.post('/ai-images/approve', {
        sessionId: session.id,
        imageKey: image.key,
        ...(productId ? { productId } : {}),
      });
      setApprovedImages((prev) => {
        const next = new Set(prev);
        next.add(image.key);
        return next;
      });
      setApprovedUrls((prev) => [...prev, data.newImageUrl]);
      showToast('success', '✅ Image approved and added to product!');
      onImagesApproved([data.newImageUrl]);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to approve image');
    } finally {
      setLoadingKey(null);
    }
  };

  // ── Reject image ─────────────────────────────────────────────────────────────
  const handleReject = async (image: { key: string; url: string }) => {
    if (!session) return;
    setLoadingKey(image.key);
    try {
      await api.post('/ai-images/reject', {
        sessionId: session.id,
        imageKey: image.key,
      });
      setSession((prev) =>
        prev
          ? {
              ...prev,
              generatedUrls: prev.generatedUrls.filter((img) => img.key !== image.key),
            }
          : null,
      );
      showToast('success', 'Image removed');
    } catch (err: any) {
      showToast('error', 'Failed to delete image');
    } finally {
      setLoadingKey(null);
    }
  };

  // ── Download image ─────────────────────────────────────────────────────────────
  const handleDownload = (image: { key: string; url: string }) => {
    const a = document.createElement('a');
    a.href = image.url;
    a.download = `ai-pose.webp`;
    a.target = '_blank';
    a.click();
  };

  // ── Regenerate ─────────────────────────────────────────────────────────────────
  const handleRegenerate = async () => {
    if (session) {
      try {
        await api.delete('/ai-images/session', {
          data: { sessionId: session.id },
        });
      } catch {}
    }
    setSession(null);
    setApprovedImages(new Set());
    setStep(1);
  };

  // ── Close with confirmation if session is active ──────────────────────────────
  const handleClose = async () => {
    if (session && session.generatedUrls.length > 0 && approvedUrls.length === 0) {
      if (!confirm('Are you sure? All generated images will be deleted.')) return;
      try {
        await api.delete('/ai-images/session', {
          data: { sessionId: session.id },
        });
      } catch {}
    }
    onClose();
  };

  const promptSuggestions = [
    'Natural smile', 'Luxury boutique', 'Traditional Indian look',
    'Elegant pose', 'Warm lighting', 'Minimal background',
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="relative overflow-hidden px-6 py-5 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 40%, #8b5cf6 100%)' }}>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">Create Product Images with AI</h2>
                  <p className="text-violet-200 text-xs mt-0.5 truncate max-w-xs">{productName}</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {step < 4 && (
              <div className="relative z-10 flex items-center gap-1 mt-4">
                {STEPS.map((s, idx) => (
                  <div key={s.num} className="flex items-center gap-1 flex-1">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all
                      ${step === s.num ? 'bg-white text-violet-700' : step > s.num ? 'bg-white/30 text-white' : 'bg-white/10 text-white/60'}`}>
                      {step > s.num ? <CheckCircle2 className="w-3 h-3" /> : <span>{s.num}</span>}
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {toast && (
            <div className={`mx-6 mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border flex-shrink-0
              ${toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'}`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {toast.msg}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Upload Model Face Image</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Upload a clear, front-facing photo. The AI will preserve the exact face, skin tone, hair, and expression.
                  </p>
                </div>
                <Dropzone
                  label="Drag & drop or click to upload face image"
                  sublabel="Clear front-facing photo · No sunglasses · Good lighting"
                  file={faceFile}
                  preview={facePreview}
                  onFile={handleFaceFile}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Upload Product Image</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Upload the product's shopping image. The AI will recreate every detail exactly as shown.
                  </p>
                </div>
                <Dropzone
                  label="Drag & drop or click to upload product image"
                  sublabel="Product on white background preferred · Full garment visible"
                  file={productFile}
                  preview={productPreview}
                  onFile={handleProductFile}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Additional Instructions <span className="text-slate-400 font-normal">(optional)</span>
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Add any specific requirements. The AI will generate 4 poses with a randomly selected background.
                  </p>
                </div>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Traditional Indian look, natural smile, warm lighting..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-violet-400 transition-shadow resize-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                />
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Quick suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {promptSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setCustomPrompt((prev) => prev ? `${prev}, ${s}` : s)}
                        className="px-3 py-1.5 rounded-full border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-medium hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                {isGenerating && (
                  <div className="text-center py-8 space-y-5">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-violet-600 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">AI Image Queue Pipeline</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{statusMessage}</p>
                    </div>
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-1000"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">{Math.round(generationProgress)}% complete</p>
                    </div>
                  </div>
                )}

                {error && !isGenerating && !session && (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Generation Failed</p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
                    </div>
                    <button
                      onClick={() => { setError(null); setStep(1); }}
                      className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {session && !isGenerating && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Generated Images</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Background: {session.background} · {approvedImages.size} approved
                        </p>
                      </div>
                      <button
                        onClick={handleRegenerate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                      </button>
                    </div>

                    {session.generatedUrls.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <p>No images remaining in this session</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {session.generatedUrls.map((img) => (
                          <ImageCard
                            key={img.key}
                            image={img}
                            isApproved={approvedImages.has(img.key)}
                            onApprove={() => handleApprove(img)}
                            onReject={() => handleReject(img)}
                            onDownload={() => handleDownload(img)}
                            onZoom={() => setZoomedImage(img.url)}
                            isLoading={loadingKey === img.key}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            {step < 4 && !isGenerating && (
              <div className="flex gap-3">
                {step > 1 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
                <div className="flex-1" />
                {step < 3 && (
                  <button
                    onClick={() => {
                      if (step === 1 && !faceFile) { showToast('error', 'Please upload a face image'); return; }
                      if (step === 2 && !productFile) { showToast('error', 'Please upload a product image'); return; }
                      setStep(step + 1);
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                {step === 3 && (
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}
                  >
                    <Sparkles className="w-4 h-4" /> Generate 4 Poses
                  </button>
                )}
              </div>
            )}
            {step === 4 && session && !isGenerating && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {approvedImages.size > 0
                    ? `${approvedImages.size} image(s) approved and added to product`
                    : 'Approve images to add them to the product'}
                </p>
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={zoomedImage}
            alt="Zoomed"
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

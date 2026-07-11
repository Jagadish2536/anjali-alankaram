'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Upload, Sparkles, CheckCircle2, Trash2, Download, RefreshCw,
  ZoomIn, AlertCircle, Loader2, ChevronRight, ChevronLeft, Info,
  ImagePlus, Wand2, Eye, Play, Pause
} from 'lucide-react';
import { api } from '@/lib/api';

interface GeneratedVideo {
  key: string;
  url: string;
}

interface AIVideoSession {
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
  existingImages?: string[];
  onVideoApproved: (url: string) => void;
  onClose: () => void;
}

const STEPS = [
  { num: 1, label: 'Reference Media' },
  { num: 2, label: 'Settings' },
  { num: 3, label: 'Create & Review' },
];

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
      className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden flex-1
        ${isDragging
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 scale-[1.02]'
          : file
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20'
        }`}
      style={{ minHeight: 180 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      {preview ? (
        <div className="relative w-full h-44">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Click to change
            </span>
          </div>
          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <ImagePlus className="w-5.5 h-5.5 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="font-bold text-slate-700 dark:text-slate-200 text-xs mb-0.5">{label}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{sublabel}</p>
        </div>
      )}
    </div>
  );
}

export default function AIVideoGeneratorModal({
  productId,
  productName,
  existingImages = [],
  onVideoApproved,
  onClose,
}: Props) {
  const [step, setStep] = useState(1);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [selectedProductImageUrl, setSelectedProductImageUrl] = useState<string>('');
  const [useUploadProduct, setUseUploadProduct] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [session, setSession] = useState<AIVideoSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Queuing generation job...');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter out any empty strings from existingImages
  const validExistingImages = existingImages.filter(url => url && url.trim() !== '');

  useEffect(() => {
    // Default to using the first existing image as a reference if available
    if (validExistingImages.length > 0) {
      setSelectedProductImageUrl(validExistingImages[0]);
      setUseUploadProduct(false);
    } else {
      setUseUploadProduct(true);
    }
  }, [existingImages]);

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

  const startPolling = (sessionId: string) => {
    setGenerationProgress(5);
    setStatusMessage('Publishing SQS job...');
    let attempts = 0;

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      
      // 5 minutes timeout limit
      if (attempts > 100) {
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
          setStep(3);
          setGenerationProgress(100);
          showToast('success', `✨ AI Video generated successfully!`);
        } else if (data.status === 'FAILED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setError('Generation job failed. Check backend logs for details.');
          setIsGenerating(false);
          setSession(null);
        } else if (data.status === 'GENERATING') {
          setStatusMessage(`Processing reference assets and rendering video frames...`);
          setGenerationProgress(25 + Math.min(attempts * 3, 65));
        } else if (data.status === 'QUEUED') {
          setStatusMessage('Waiting in SQS queue for worker...');
          setGenerationProgress(10);
        }
      } catch (err: any) {
        console.warn('Transient polling error:', err.message);
      }
    }, 3000);
  };

  const handleGenerate = async () => {
    if (!faceFile) {
      showToast('error', 'Please upload a model face image reference');
      return;
    }
    if (useUploadProduct && !productFile) {
      showToast('error', 'Please upload a product image reference');
      return;
    }
    if (!useUploadProduct && !selectedProductImageUrl) {
      showToast('error', 'Please select a product image reference');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStep(3);

    try {
      const formData = new FormData();
      formData.append('faceImage', faceFile);
      if (useUploadProduct && productFile) {
        formData.append('productImage', productFile);
      } else {
        formData.append('productImageUrl', selectedProductImageUrl);
      }
      if (productId) formData.append('productId', productId);
      if (customPrompt.trim()) formData.append('customPrompt', customPrompt.trim());

      const { data } = await api.post('/ai-images/generate-video', formData, {
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

  const handleApprove = async () => {
    if (!session || session.generatedUrls.length === 0) return;
    const videoObj = session.generatedUrls[0];
    
    try {
      const { data } = await api.post('/ai-images/approve', {
        sessionId: session.id,
        imageKey: videoObj.key,
        ...(productId ? { productId } : {}),
      });
      showToast('success', '✅ Video approved and added to product!');
      onVideoApproved(data.newImageUrl);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to approve video');
    }
  };

  const handleDownload = () => {
    if (!session || session.generatedUrls.length === 0) return;
    const a = document.createElement('a');
    a.href = session.generatedUrls[0].url;
    a.download = `ai-ad-video.mp4`;
    a.target = '_blank';
    a.click();
  };

  const handleRegenerate = async () => {
    if (session) {
      try {
        await api.delete('/ai-images/session', {
          data: { sessionId: session.id },
        });
      } catch {}
    }
    setSession(null);
    setStep(1);
    setGenerationProgress(0);
  };

  const handleClose = async () => {
    if (session && session.generatedUrls.length > 0) {
      if (!confirm('Are you sure? The generated video will be discarded.')) return;
      try {
        await api.delete('/ai-images/session', {
          data: { sessionId: session.id },
        });
      } catch {}
    }
    onClose();
  };

  const promptSuggestions = [
    'Elegant catwalk', 'Traditional backdrop', 'Close up details',
    'Premium boutique store', 'Sunset golden hour lighting',
  ];

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden px-6 py-5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #c084fc 100%)' }}>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">Create Promotional AI Video</h2>
                <p className="text-violet-200 text-xs mt-0.5 truncate max-w-xs">{productName}</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {step < 3 && (
            <div className="relative z-10 flex items-center gap-1 mt-4">
              {STEPS.map((s, idx) => (
                <div key={s.num} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all
                    ${step === s.num ? 'bg-white text-violet-700' : step > s.num ? 'bg-white/30 text-white' : 'bg-white/10 text-white/60'}`}>
                    {step > s.num ? <CheckCircle2 className="w-3 h-3" /> : <span>{s.num}</span>}
                    <span>{s.label}</span>
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
          <div className={`mx-6 mt-4 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold border flex-shrink-0
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
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-0.5">Setup Video References</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select or upload the references. The AI will preserve the face features and clothing exactly throughout the 8-second vertical video.
                </p>
              </div>

              {validExistingImages.length > 0 && (
                <div className="border rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Image Reference</span>
                    <button
                      type="button"
                      onClick={() => setUseUploadProduct(!useUploadProduct)}
                      className="text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline"
                    >
                      {useUploadProduct ? 'Use Catalog Image instead' : 'Upload custom reference instead'}
                    </button>
                  </div>

                  {!useUploadProduct ? (
                    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                      {validExistingImages.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setSelectedProductImageUrl(url)}
                          className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all
                            ${selectedProductImageUrl === url ? 'border-violet-500 scale-95 shadow-md shadow-violet-100 dark:shadow-none' : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'}`}
                        >
                          <img src={url} alt="product reference" className="w-full h-full object-cover" />
                          {selectedProductImageUrl === url && (
                            <div className="absolute inset-0 bg-violet-600/10 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-violet-600 fill-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Dropzone
                      label="Upload Product Image Reference"
                      sublabel="High quality dress photo preferred"
                      file={productFile}
                      preview={productPreview}
                      onFile={handleProductFile}
                    />
                  )}
                </div>
              )}

              {validExistingImages.length === 0 && (
                <div className="flex gap-3">
                  <Dropzone
                    label="Upload Product Image"
                    sublabel="Clear dress photo preferred"
                    file={productFile}
                    preview={productPreview}
                    onFile={handleProductFile}
                  />
                </div>
              )}

              <div className="border rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/40">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-3">Model Face Reference</span>
                <Dropzone
                  label="Upload Model Face Reference"
                  sublabel="Clear front-facing photo · Good lighting"
                  file={faceFile}
                  preview={facePreview}
                  onFile={handleFaceFile}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-0.5">Video Style & Prompts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide instructions. The video runs for 8 seconds, optimized in portrait (9:16) with background music.
                </p>
              </div>

              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Elegant runway catwalk model advertising the dress, boutique store background with golden spotlights..."
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-violet-400 transition-shadow resize-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />

              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2">Style suggestions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {promptSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCustomPrompt((prev) => prev ? `${prev}, ${s}` : s)}
                      className="px-2.5 py-1 rounded-full border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-[10px] font-medium hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {isGenerating && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-violet-600 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-base">Generating AI Video</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{statusMessage}</p>
                  </div>
                  <div className="max-w-xs mx-auto space-y-2">
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-1000"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">{Math.round(generationProgress)}% complete</p>
                  </div>
                </div>
              )}

              {error && !isGenerating && !session && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">Video Generation Failed</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
                  </div>
                  <button
                    onClick={() => { setError(null); setStep(1); }}
                    className="px-5 py-2 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {session && !isGenerating && (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Generated AI Video</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Length: 8s · Portrait 9:16 aspect ratio · Audio included
                      </p>
                    </div>
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-create
                    </button>
                  </div>

                  {session.generatedUrls.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      <p>No video found for this session</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-[280px] rounded-2xl overflow-hidden border shadow-lg bg-black relative aspect-[9/16]">
                      <video
                        src={session.generatedUrls[0].url}
                        controls
                        loop
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          {step < 3 && !isGenerating && (
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
              <div className="flex-1" />
              {step < 2 ? (
                <button
                  onClick={() => {
                    if (!faceFile) { showToast('error', 'Please upload a model face reference'); return; }
                    if (useUploadProduct && !productFile) { showToast('error', 'Please upload a product reference'); return; }
                    if (!useUploadProduct && !selectedProductImageUrl) { showToast('error', 'Please select a product reference'); return; }
                    setStep(step + 1);
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-xs text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Create AI Video
                </button>
              )}
            </div>
          )}

          {step === 3 && session && !isGenerating && (
            <div className="flex items-center justify-between">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download MP4
              </button>
              
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

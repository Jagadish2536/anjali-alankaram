'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseAwbFromScannedText, ParsedAwbResult } from '@/lib/awbParser';

interface AwbCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (result: ParsedAwbResult) => void;
}

export function AwbCameraScannerModal({ isOpen, onClose, onScanSuccess }: AwbCameraScannerModalProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScannedResult, setLastScannedResult] = useState<ParsedAwbResult | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setLastScannedResult(null);
      setErrorMsg('');
      return;
    }

    // Get list of cameras when modal opens
    Html5Qrcode.getCameras()
      .then((deviceList) => {
        if (deviceList && deviceList.length > 0) {
          const formatted = deviceList.map((d) => ({
            id: d.id,
            label: d.label || `Camera ${d.id.substring(0, 5)}`,
          }));
          setCameras(formatted);
          // Prefer environment / back camera if available
          const backCam = formatted.find(
            (c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'),
          );
          const defaultId = backCam ? backCam.id : formatted[formatted.length - 1].id;
          setSelectedCameraId(defaultId);
          startScanner(defaultId);
        } else {
          setErrorMsg('No camera device detected on this system.');
        }
      })
      .catch((err) => {
        setErrorMsg('Camera access denied or unavailable. Please grant camera permissions.');
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraId: string) => {
    await stopScanner();
    setErrorMsg('');
    setLastScannedResult(null);

    const elementId = 'awb-camera-reader';
    const readerElement = document.getElementById(elementId);
    if (!readerElement) return;

    try {
      // Initialize scanner supporting QR, DataMatrix, and 1D Barcodes
      const html5QrcodeScanner = new Html5Qrcode(elementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrcodeScanner;

      await html5QrcodeScanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 200 },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          handleCodeScanned(decodedText);
        },
        () => {
          // Ignore frame decode errors while searching
        },
      );

      setIsScanning(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start camera. Check browser permissions.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignore stop errors
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleCodeScanned = (decodedText: string) => {
    // Parse AWB code (e.g. 7D1356703140000010... -> 7D135670314)
    const result = parseAwbFromScannedText(decodedText);
    setLastScannedResult(result);

    // Audio beep feedback
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Ignore audio error
    }

    // Stop scanner and return result to parent form
    stopScanner();
    setTimeout(() => {
      onScanSuccess(result);
      onClose();
    }, 400);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanner(newId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="font-bold font-outfit text-base text-foreground">Scan AWB Barcode / QR</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Feed Area */}
        <div className="p-5 space-y-4 flex-1 flex flex-col items-center justify-center min-h-[340px]">
          {errorMsg ? (
            <div className="text-center p-6 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 space-y-2 w-full">
              <AlertCircle className="w-8 h-8 mx-auto" />
              <p className="text-xs font-semibold">{errorMsg}</p>
              <button
                type="button"
                onClick={() => selectedCameraId && startScanner(selectedCameraId)}
                className="mt-2 text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </button>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <div className="relative rounded-xl overflow-hidden border-2 border-primary/40 bg-black aspect-video flex items-center justify-center shadow-inner">
                {/* HTML5 QR Code Container */}
                <div id="awb-camera-reader" className="w-full h-full" />

                {/* Scanned Feedback Overlay */}
                {lastScannedResult && (
                  <div className="absolute inset-0 bg-emerald-600/90 text-white flex flex-col items-center justify-center p-4 space-y-2 animate-in zoom-in-95">
                    <CheckCircle2 className="w-12 h-12 animate-bounce" />
                    <p className="text-xs uppercase font-bold tracking-wider">AWB Code Scanned!</p>
                    <p className="text-lg font-mono font-black">{lastScannedResult.awb}</p>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {cameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={handleCameraChange}
                    className="text-xs border rounded-lg px-2.5 py-1.5 bg-background font-medium outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                )}

                <p className="text-[11px] text-muted-foreground italic text-center w-full">
                  Align 1D Barcode, DataMatrix, or QR code within frame
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-muted/20 flex justify-end">
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold border rounded-xl hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

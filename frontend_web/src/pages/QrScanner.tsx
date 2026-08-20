import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Layout } from '../components/Layout';
import { PulseCard } from '../components/PulseCard';
import { ResultPanel } from '../components/ResultPanel';
import { useAuth } from '../context/AuthContext';
import { scanQr } from '../lib/api';
import { qrResponseToRecord } from '../lib/convert';
import type { ScanRecord } from '../lib/types';

export function QrScanner() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [decodedUrl, setDecodedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanRecord | null>(null);

  const stopCamera = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      frameRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      setDecodedUrl(code.data);
      stopCamera();
      return;
    }
    frameRef.current = requestAnimationFrame(tick);
  }, [stopCamera]);

  async function startCamera() {
    setCameraError(null);
    setDecodedUrl(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      frameRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError('Camera access denied or unavailable. Use image upload instead.');
    }
  }

  function handleFile(file: File) {
    setDecodedUrl(null);
    setResult(null);
    setCameraError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          setDecodedUrl(code.data);
        } else {
          setCameraError('No QR code detected in that image.');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!decodedUrl) return;
    setLoading(true);
    setError(null);
    try {
      const response = await scanQr(decodedUrl, user?.uid);
      setResult(qrResponseToRecord(response));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Scan QR">
      <div className="border-b border-outline-variant/30 pb-3">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">QR Code Forensics</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Decode a QR code via camera or image upload, then run it through the URL threat pipeline.
        </p>
      </div>

      <PulseCard pulseColor="secondary" className="p-5">
        <div className="flex flex-col gap-4">
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded border border-outline-variant/40 bg-surface-container-lowest">
            <video ref={videoRef} className={cameraActive ? 'h-full w-full object-cover' : 'hidden'} muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {!cameraActive && (
              <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl">qr_code_scanner</span>
                <span className="text-label-sm uppercase tracking-widest">SIGNAL_TELEMETRY — camera idle</span>
              </div>
            )}
            {cameraActive && (
              <div className="pointer-events-none absolute inset-8 rounded border-2 border-primary/70" />
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="flex items-center gap-2 rounded border border-outline-variant px-4 py-2 text-label-md text-on-surface transition-colors hover:border-primary hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">videocam</span>
                Start Camera
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 rounded border border-error/50 px-4 py-2 text-label-md text-error transition-colors hover:bg-error/10"
              >
                <span className="material-symbols-outlined text-[18px]">videocam_off</span>
                Stop Camera
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded border border-outline-variant px-4 py-2 text-label-md text-on-surface transition-colors hover:border-primary hover:text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Upload Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {cameraError && <p className="text-label-sm text-tertiary">{cameraError}</p>}

          {decodedUrl && (
            <div className="rounded border border-outline-variant/30 bg-surface-dim p-3">
              <span className="mb-1 block text-label-sm uppercase tracking-widest text-on-surface-variant">
                Decoded Payload
              </span>
              <span className="break-all font-mono text-data-mono text-primary">{decodedUrl}</span>
            </div>
          )}

          <button
            onClick={analyze}
            disabled={!decodedUrl || loading}
            className="glow-hover flex items-center justify-center gap-2 rounded bg-secondary px-6 py-3 text-label-md font-bold uppercase tracking-wide text-on-secondary transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Scanning…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">radar</span>
                Analyze Decoded URL
              </>
            )}
          </button>
          {error && <p className="text-label-sm text-error">{error}</p>}
        </div>
      </PulseCard>

      {result && <ResultPanel record={result} />}
    </Layout>
  );
}

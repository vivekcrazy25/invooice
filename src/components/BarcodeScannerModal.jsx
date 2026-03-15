import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, CameraOff, Scan, Keyboard, CheckCircle, AlertCircle, Zap, RefreshCw } from 'lucide-react';

/**
 * BarcodeScannerModal
 *
 * Mode 1 — WEBCAM: uses Chromium's BarcodeDetector API (macOS/Linux).
 *           Falls back gracefully on Windows where it isn't supported.
 * Mode 2 — GUN / MANUAL: large auto-focused input; barcode guns type
 *           into it and hit Enter automatically.
 *
 * Props:
 *   onScan(barcode)  – called with the scanned string
 *   onClose()        – close the modal
 *   title            – optional string
 */
export default function BarcodeScannerModal({ onScan, onClose, title = 'Barcode Scanner' }) {
  const videoRef        = useRef(null);
  const streamRef       = useRef(null);
  const animRef         = useRef(null);
  const detectorRef     = useRef(null);
  const lastScanRef     = useRef('');
  const lastScanTimeRef = useRef(0);
  const manualRef       = useRef(null);

  /* Check BarcodeDetector support once */
  const nativeSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const [mode,       setMode]       = useState(() => nativeSupported ? 'webcam' : 'manual');
  const [camStatus,  setCamStatus]  = useState('starting'); // 'starting'|'active'|'error'|'unsupported'
  const [lastResult, setLastResult] = useState('');
  const [flash,      setFlash]      = useState(false);
  const [manualVal,  setManualVal]  = useState('');
  const [cameras,    setCameras]    = useState([]);
  const [camIdx,     setCamIdx]     = useState(0);

  /* ─── Start camera ─── */
  const startCamera = useCallback(async (deviceId) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    cancelAnimationFrame(animRef.current);
    setCamStatus('starting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamStatus('active');
    } catch {
      setCamStatus('error');
    }
  }, []);

  /* ─── Init on mount ─── */
  useEffect(() => {
    if (!nativeSupported) {
      setCamStatus('unsupported');
      // Auto-focus manual input
      setTimeout(() => manualRef.current?.focus(), 80);
      return;
    }

    // Build detector
    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: [
          'ean_13', 'ean_8', 'upc_a', 'upc_e',
          'code_128', 'code_39', 'code_93',
          'qr_code', 'data_matrix', 'itf',
        ],
      });
    } catch {
      setCamStatus('unsupported');
      setMode('manual');
      setTimeout(() => manualRef.current?.focus(), 80);
      return;
    }

    async function init() {
      try {
        // Request permission, then enumerate
        const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
        tmp.getTracks().forEach(t => t.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vids = devices.filter(d => d.kind === 'videoinput');
        setCameras(vids);
        await startCamera(vids[0]?.deviceId);
      } catch {
        setCamStatus('error');
      }
    }

    init();

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animRef.current);
    };
  }, []); // eslint-disable-line

  /* ─── Detection loop ─── */
  useEffect(() => {
    if (camStatus !== 'active' || mode !== 'webcam') return;

    let running = true;

    async function detect() {
      if (!running) return;
      const video    = videoRef.current;
      const detector = detectorRef.current;
      if (!video || !detector || video.readyState < 2) {
        animRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          const now  = Date.now();
          if (code !== lastScanRef.current || now - lastScanTimeRef.current > 2000) {
            lastScanRef.current     = code;
            lastScanTimeRef.current = now;
            handleScanned(code);
          }
        }
      } catch { /* ignore frame errors */ }

      animRef.current = requestAnimationFrame(detect);
    }

    animRef.current = requestAnimationFrame(detect);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [camStatus, mode]); // eslint-disable-line

  /* ─── Handle a detected code ─── */
  const handleScanned = (code) => {
    if (!code?.trim()) return;
    setLastResult(code);
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
    setTimeout(() => onScan(code.trim()), 300);
  };

  /* ─── Manual submit ─── */
  const submitManual = (e) => {
    e?.preventDefault();
    if (manualVal.trim().length >= 2) {
      handleScanned(manualVal.trim());
      setManualVal('');
    }
  };

  /* ─── Switch to manual ─── */
  const switchToManual = () => {
    setMode('manual');
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(animRef.current);
    setTimeout(() => manualRef.current?.focus(), 100);
  };

  /* ─── Switch to webcam ─── */
  const switchToWebcam = () => {
    if (!nativeSupported) return;
    setMode('webcam');
    startCamera(cameras[camIdx]?.deviceId);
  };

  /* ─── Switch camera ─── */
  const switchCamera = async () => {
    const next = (camIdx + 1) % cameras.length;
    setCamIdx(next);
    await startCamera(cameras[next]?.deviceId);
  };

  /* ─── MANUAL MODE UI ─── */
  const ManualPanel = () => (
    <div className="p-6 space-y-4">
      {/* Barcode gun notice (when webcam not supported) */}
      {!nativeSupported && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Zap size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Barcode Gun Ready</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Just scan with your barcode gun — it types the code automatically.
              Or type the barcode below and press Enter.
            </p>
          </div>
        </div>
      )}

      {/* Big input */}
      <form onSubmit={submitManual}>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Barcode / SKU
        </label>
        <input
          ref={manualRef}
          type="text"
          value={manualVal}
          onChange={e => setManualVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitManual(e); }}
          placeholder="Scan or type barcode here…"
          autoFocus
          className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base
                     focus:outline-none focus:border-gray-900 focus:ring-0
                     font-mono tracking-widest text-center text-gray-900
                     placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-sans
                     transition-colors"
        />
        <button
          type="submit"
          className="w-full mt-3 bg-gray-900 text-white py-2.5 rounded-xl text-sm
                     font-semibold hover:bg-gray-800 transition-colors"
        >
          Look Up Barcode
        </button>
      </form>

      {/* How it works hint */}
      <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-gray-600">Pro tip:</span> Your barcode gun works
          anywhere in the app — you don't need to open this scanner.
          Just scan while on the Billing or Inventory screen.
        </p>
      </div>
    </div>
  );

  /* ─── WEBCAM MODE UI ─── */
  const WebcamPanel = () => (
    <div className="relative bg-black" style={{ aspectRatio: '4/3', maxHeight: 300 }}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay playsInline muted
      />

      {/* Aiming overlay */}
      {camStatus === 'active' && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-32">
              <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-white rounded-tl-sm"/>
              <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-white rounded-tr-sm"/>
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-white rounded-bl-sm"/>
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-white rounded-br-sm"/>
              <div className="absolute left-1 right-1 h-0.5 bg-red-400/80 rounded"
                   style={{ animation: 'scanline 1.8s ease-in-out infinite', top: '50%' }}/>
            </div>
          </div>
          {flash && (
            <div className="absolute inset-0 bg-green-400/25 flex items-center justify-center">
              <CheckCircle size={52} className="text-green-400 drop-shadow-lg"/>
            </div>
          )}
        </>
      )}

      {/* Status overlays */}
      {camStatus === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"/>
            <p className="text-sm">Starting camera…</p>
          </div>
        </div>
      )}
      {camStatus === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6">
          <div className="text-center text-white">
            <AlertCircle size={32} className="mx-auto mb-2 text-red-400"/>
            <p className="text-sm font-semibold mb-1">Camera unavailable</p>
            <p className="text-xs text-gray-300">Check camera permissions</p>
            <button onClick={() => startCamera(cameras[camIdx]?.deviceId)}
              className="mt-3 flex items-center gap-1.5 mx-auto text-xs text-white/70 hover:text-white">
              <RefreshCw size={11}/> Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /* ─── RENDER ─── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Scan size={15} className="text-white"/>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-400">
                {mode === 'webcam' ? 'Point camera at barcode' : 'Scan gun or type code'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <X size={16}/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1">
          {mode === 'webcam' ? <WebcamPanel /> : <ManualPanel />}

          {/* Last scanned result */}
          {lastResult && (
            <div className="px-5 py-2 bg-green-50 border-t border-green-100 flex items-center gap-2">
              <CheckCircle size={14} className="text-green-600 flex-shrink-0"/>
              <p className="text-xs text-green-700 font-mono truncate">
                Scanned: <strong>{lastResult}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Footer — mode tabs */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-1.5">
            <button
              onClick={switchToWebcam}
              disabled={!nativeSupported}
              title={!nativeSupported ? 'Webcam scanning not supported on this system' : ''}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${mode === 'webcam'
                  ? 'bg-gray-900 text-white'
                  : !nativeSupported
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
            >
              <Camera size={12}/>
              Webcam
              {!nativeSupported && (
                <span className="text-[9px] bg-gray-200 text-gray-400 px-1 rounded">N/A</span>
              )}
            </button>

            <button
              onClick={switchToManual}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${mode === 'manual'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
            >
              <Keyboard size={12}/> Barcode Gun / Manual
            </button>
          </div>

          {mode === 'webcam' && cameras.length > 1 && (
            <button onClick={switchCamera}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">
              <CameraOff size={11}/> Switch
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0%   { transform: translateY(-26px); opacity: 0.3; }
          50%  { transform: translateY(26px);  opacity: 1;   }
          100% { transform: translateY(-26px); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

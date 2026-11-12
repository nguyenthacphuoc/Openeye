import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  PictureInPicture,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { DetectionSettings, EyeStatus } from '../types';
import { eyeDetector } from '../utils/detector';
import { backgroundService } from '../utils/backgroundManager';
import { audioAlert } from '../utils/audioAlert';

interface CameraHUDProps {
  settings: DetectionSettings;
  eyeStatus: EyeStatus;
  setEyeStatus: React.Dispatch<React.SetStateAction<EyeStatus>>;
  isAlarmActive: boolean;
  onAlarmTrigger: () => void;
  onAlarmDismiss: () => void;
  onOpenCalibration: () => void;
  isPipActive: boolean;
  onTogglePip: () => void;
  onOpenGuide: () => void;
}

export const CameraHUD: React.FC<CameraHUDProps> = ({
  settings,
  eyeStatus,
  setEyeStatus,
  isAlarmActive,
  onAlarmTrigger,
  onAlarmDismiss,
  onOpenCalibration,
  isPipActive,
  onTogglePip,
  onOpenGuide,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [engineReady, setEngineReady] = useState<boolean>(false);

  // Time tracking for closed eyes
  const closedStartTimeRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const currentFpsRef = useRef<number>(30);

  // Keyboard shortcut: Spacebar to dismiss alarm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isAlarmActive) {
        e.preventDefault();
        onAlarmDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAlarmActive, onAlarmDismiss]);

  // Enumerate video devices
  const updateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch {
      // Ignore
    }
  }, [selectedDeviceId]);

  // Start webcam stream
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setCameraLoading(true);
      setCameraError(null);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user',
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setCameraLoading(false);
      updateDevices();
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraLoading(false);
      setCameraError(
        'Không thể truy cập camera. Vui lòng cho phép quyền truy cập camera trong trình duyệt và thử lại.'
      );
    }
  }, [updateDevices]);

  // Stop webcam stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    closedStartTimeRef.current = null;
  }, []);

  // Initialize MediaPipe Face Landmarker once
  useEffect(() => {
    let mounted = true;
    eyeDetector.initialize().then((ready) => {
      if (mounted) {
        setEngineReady(ready || eyeDetector.getIsReady());
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Initial camera start
  useEffect(() => {
    startCamera(selectedDeviceId);
    return () => {
      stopCamera();
    };
  }, [selectedDeviceId, startCamera, stopCamera]);

  // Main Detection Loop with Canvas Drawing
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !cameraActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions matching video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    const width = canvas.width;
    const height = canvas.height;
    const now = performance.now();

    // Calculate FPS
    frameCountRef.current++;
    if (now - lastFpsTimeRef.current >= 1000) {
      currentFpsRef.current = Math.round(
        (frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)
      );
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    // 1. Draw mirrored webcam image onto canvas
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // 2. Run Eye Detection
    const detection = eyeDetector.detect(
      video,
      now,
      settings.eyeOpenThresholdEAR,
      settings.glassesMode
    );

    // 3. Compute Closed Duration
    let closedDuration = 0;
    if (detection.hasFace && detection.isClosed) {
      if (!closedStartTimeRef.current) {
        closedStartTimeRef.current = now;
      }
      closedDuration = (now - closedStartTimeRef.current) / 1000;
    } else {
      closedStartTimeRef.current = null;
      closedDuration = 0;
    }

    // Check if threshold reached to trigger alarm
    const shouldAlarm =
      detection.hasFace &&
      detection.isClosed &&
      closedDuration >= settings.closeDurationThresholdSec;

    if (shouldAlarm && !isAlarmActive) {
      onAlarmTrigger();
    }

    // Update state for parent UI
    setEyeStatus({
      hasFace: detection.hasFace,
      leftEAR: detection.leftEAR,
      rightEAR: detection.rightEAR,
      avgEAR: detection.avgEAR,
      leftBlinkScore: detection.leftBlinkScore,
      rightBlinkScore: detection.rightBlinkScore,
      isEyesClosed: detection.isClosed,
      closedDurationSec: closedDuration,
      alarmTriggered: shouldAlarm || isAlarmActive,
      fps: currentFpsRef.current,
    });

    // 4. Draw HUD Visuals onto Canvas (these also appear inside Picture-in-Picture window!)
    // Subtle dark gradient at top and bottom for HUD readability
    const topGradient = ctx.createLinearGradient(0, 0, 0, 70);
    topGradient.addColorStop(0, 'rgba(10, 15, 29, 0.85)');
    topGradient.addColorStop(1, 'rgba(10, 15, 29, 0)');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, width, 70);

    const bottomGradient = ctx.createLinearGradient(0, height - 80, 0, height);
    bottomGradient.addColorStop(0, 'rgba(10, 15, 29, 0)');
    bottomGradient.addColorStop(1, 'rgba(10, 15, 29, 0.9)');
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, height - 80, width, 80);

    // Draw Eye Landmarks / Bounding Circles if enabled
    if (showLandmarks && detection.landmarks && detection.landmarks.length > 0) {
      const lm = detection.landmarks;
      // Eye landmark indices to draw
      const eyePoints = [
        33, 160, 158, 133, 153, 144, // Left eye
        362, 385, 387, 263, 373, 380, // Right eye
      ];

      ctx.save();
      ctx.fillStyle = detection.isClosed ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
      for (const idx of eyePoints) {
        const pt = lm[idx];
        if (pt) {
          // Mirror x coordinate because video is mirrored
          const px = (1 - pt.x) * width;
          const py = pt.y * height;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw bounding box / circle around eyes
      const drawEyeBox = (indices: number[]) => {
        let minX = width;
        let maxX = 0;
        let minY = height;
        let maxY = 0;
        for (const i of indices) {
          const pt = lm[i];
          if (!pt) continue;
          const px = (1 - pt.x) * width;
          const py = pt.y * height;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
        const padX = 10;
        const padY = 8;
        ctx.strokeStyle = detection.isClosed
          ? 'rgba(239, 68, 68, 0.85)'
          : 'rgba(16, 185, 129, 0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          minX - padX,
          minY - padY,
          maxX - minX + padX * 2,
          maxY - minY + padY * 2
        );
      };

      drawEyeBox([33, 160, 158, 133, 153, 144]);
      drawEyeBox([362, 385, 387, 263, 373, 380]);
      ctx.restore();
    }

    // Top HUD Status Badge on Canvas
    ctx.save();
    let statusText = 'MẮT ĐANG MỞ (Bình thường)';
    let badgeColor = 'rgba(16, 185, 129, 0.9)'; // emerald
    let badgeBg = 'rgba(6, 78, 59, 0.85)';

    if (!detection.hasFace) {
      statusText = 'KHÔNG THẤY KHUÔN MẶT - Hãy nhìn thẳng camera';
      badgeColor = 'rgba(245, 158, 11, 0.95)'; // amber
      badgeBg = 'rgba(120, 53, 15, 0.85)';
    } else if (isAlarmActive || shouldAlarm) {
      statusText = '🚨 CẢNH BÁO BUỒN NGỦ! ĐANG HÚ CÒI!';
      badgeColor = 'rgba(239, 68, 68, 1.0)'; // red
      badgeBg = 'rgba(153, 27, 27, 0.95)';
    } else if (detection.isClosed) {
      statusText = `⚠️ ĐANG NHẮM MẮT (${closedDuration.toFixed(1)}s / ${settings.closeDurationThresholdSec.toFixed(1)}s)`;
      badgeColor = 'rgba(249, 115, 22, 1.0)'; // orange
      badgeBg = 'rgba(154, 52, 18, 0.9)';
    }

    // Draw top badge pill in canvas
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    const textWidth = ctx.measureText(statusText).width;
    const badgeWidth = textWidth + 30;
    const badgeX = (width - badgeWidth) / 2;
    const badgeY = 14;

    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, 32, 6);
    ctx.fill();
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusText, width / 2, badgeY + 16);

    // Bottom HUD: Closed eye progress bar
    if (detection.hasFace && detection.isClosed && !isAlarmActive) {
      const progress = Math.min(1.0, closedDuration / settings.closeDurationThresholdSec);
      const barWidth = width * 0.7;
      const barX = (width - barWidth) / 2;
      const barY = height - 24;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, 10, 5);
      ctx.fill();

      ctx.fillStyle = progress > 0.7 ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * progress, 10, 5);
      ctx.fill();
    }

    // Bottom HUD Metrics info in PiP
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'left';
    ctx.fillText(`EAR: ${(detection.avgEAR * 100).toFixed(0)}%`, 14, height - 16);

    ctx.textAlign = 'right';
    ctx.fillText(`PiP Active · ${currentFpsRef.current} FPS`, width - 14, height - 16);

    // Flashing full red screen overlay when alarm is sounding!
    if (isAlarmActive || shouldAlarm) {
      const flash = Math.sin(now / 100) > 0;
      ctx.fillStyle = flash ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Warning text in center
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('HÃY TỈNH DẬY NGAY!', width / 2, height / 2 - 10);
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Nhấn [Phím Cách] hoặc mở mắt để tắt còi', width / 2, height / 2 + 20);
    }

    ctx.restore();
  }, [
    cameraActive,
    settings,
    isAlarmActive,
    onAlarmTrigger,
    setEyeStatus,
    showLandmarks,
  ]);

  // Animation frame loop + Web Worker tick backup for background running
  useEffect(() => {
    let animId: number;
    const loop = () => {
      processFrame();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    // Also subscribe to background service ticks (fires when tab is minimized or inactive)
    const unsubscribe = backgroundService.subscribeTick(() => {
      if (document.hidden) {
        processFrame();
      }
    });

    return () => {
      cancelAnimationFrame(animId);
      unsubscribe();
    };
  }, [processFrame]);

  // Request PiP on Canvas
  const handleRequestPip = async () => {
    if (!canvasRef.current) return;
    if (isPipActive) {
      await backgroundService.exitPip();
      onTogglePip();
    } else {
      const success = await backgroundService.requestCanvasPip(
        canvasRef.current,
        () => onTogglePip() // On exit
      );
      if (success) {
        onTogglePip();
      }
    }
  };

  return (
    <div id="camera-view" className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
      {/* Top Banner on Camera Box */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800">
            <Camera className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white">Camera Giám Sát Thời Gian Thực</span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Độ phân giải: 640x480</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{eyeStatus.fps} FPS</span>
              <span aria-hidden="true">·</span>
              <span className={eyeStatus.hasFace ? 'text-emerald-400' : 'text-amber-400'}>
                {eyeStatus.hasFace ? 'Đã nhận diện mặt' : 'Chưa thấy mặt'}
              </span>
            </div>
          </div>
        </div>

        {/* Viewfinder Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          {/* Quick PiP Activator Button */}
          <button
            onClick={handleRequestPip}
            title="Mở Cửa Sổ Nổi (PiP) để tiếp tục giám sát khi chuyển sang ứng dụng khác (Word, Excel, Game...)"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-all ${
              isPipActive
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/30'
                : 'bg-indigo-600/90 text-white hover:bg-indigo-500'
            }`}
          >
            <PictureInPicture className="h-3.5 w-3.5" />
            <span>{isPipActive ? 'Đang Ghim PiP' : 'Ghim Cửa Sổ Nổi (PiP)'}</span>
          </button>

          {/* Quick Guide */}
          <button
            onClick={onOpenGuide}
            title="Xem hướng dẫn chạy khi dùng app khác"
            className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            <span>Cách dùng</span>
          </button>

          {/* Toggle Landmarks Visuals */}
          <button
            onClick={() => setShowLandmarks((prev) => !prev)}
            title="Ẩn/Hiện đường vẽ mắt"
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              showLandmarks
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-900 text-slate-500 hover:text-slate-300'
            }`}
          >
            {showLandmarks ? 'Lưới mắt: Bật' : 'Lưới mắt: Tắt'}
          </button>

          {/* Quick Calibrate */}
          <button
            onClick={onOpenCalibration}
            title="Hiệu chuẩn dáng mắt của bạn trong 3 giây"
            className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Hiệu chuẩn</span>
          </button>

          {/* Camera On/Off Toggle */}
          <button
            onClick={() => (cameraActive ? stopCamera() : startCamera(selectedDeviceId))}
            title={cameraActive ? 'Tắt camera' : 'Bật camera'}
            className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            {cameraActive ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport & Canvas Overlay Container */}
      <div className="relative aspect-[4/3] w-full max-h-[520px] bg-black flex items-center justify-center overflow-hidden">
        {/* Hidden HTML5 Video Source for Processing */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover opacity-0 pointer-events-none"
        />

        {/* Master Canvas with Real-Time HUD and Landmarks */}
        <canvas
          ref={canvasRef}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            cameraActive && !cameraLoading ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Loading / Camera Error Overlays */}
        {cameraLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-center p-6">
            <RefreshCw className="h-8 w-8 animate-spin text-rose-500 mb-3" />
            <p className="text-sm font-medium text-white">Đang khởi động Camera & Mô hình AI...</p>
            <p className="text-xs text-slate-400 mt-1">Vui lòng chấp nhận quyền truy cập webcam trên trình duyệt</p>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center p-6">
            <AlertTriangle className="h-10 w-10 text-rose-500 mb-3" />
            <p className="text-base font-semibold text-white">Chưa truy cập được Camera</p>
            <p className="text-xs text-slate-300 mt-1 max-w-md">{cameraError}</p>
            <button
              onClick={() => startCamera(selectedDeviceId)}
              className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
            >
              Thử lại ngay
            </button>
          </div>
        )}

        {!cameraActive && !cameraLoading && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-center p-6">
            <CameraOff className="h-10 w-10 text-slate-500 mb-3" />
            <p className="text-base font-semibold text-white">Camera Đang Tạm Dừng</p>
            <p className="text-xs text-slate-400 mt-1">Bấm nút bên dưới để bật lại giám sát chống ngủ gật</p>
            <button
              onClick={() => startCamera(selectedDeviceId)}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
            >
              Bật Lại Camera
            </button>
          </div>
        )}

        {/* Giant Floating Alarm Dismiss Button when Alarm Sounds */}
        {isAlarmActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/70 backdrop-blur-md p-6 z-20 animate-pulse">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-white shadow-xl shadow-rose-600/50 mb-3">
              <Volume2 className="h-9 w-9 animate-bounce" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight">
              CẢNH BÁO: BẠN ĐANG NGỦ GẬT!
            </h2>
            <p className="text-sm text-rose-200 mt-2 text-center max-w-md">
              Mắt bạn đã nhắm quá {settings.closeDurationThresholdSec}s. Còi báo động đang kêu to hết cỡ!
            </p>
            <button
              onClick={onAlarmDismiss}
              className="mt-6 flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-black text-rose-700 shadow-2xl hover:bg-rose-50 active:scale-95 transition-all cursor-pointer"
            >
              <VolumeX className="h-5 w-5" />
              <span>TÔI ĐÃ TỈNH TÁO - TẮT CÒI (Space)</span>
            </button>
          </div>
        )}

        {/* Picture-in-Picture Floating Tip Badge */}
        {!isPipActive && (
          <div className="absolute bottom-3 right-3 hidden sm:flex items-center gap-2 rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300 border border-slate-700/60 backdrop-blur-sm pointer-events-none">
            <PictureInPicture className="h-3.5 w-3.5 text-amber-400" />
            <span>Bấm "Ghim Cửa Sổ Nổi (PiP)" để dùng song song với app khác</span>
          </div>
        )}
      </div>

      {/* Live Status Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/90 border-t border-slate-800">
        {/* Metric 1: Eye State */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Trạng thái mắt</div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                !eyeStatus.hasFace
                  ? 'bg-amber-400'
                  : eyeStatus.isEyesClosed
                  ? 'bg-rose-500 animate-ping'
                  : 'bg-emerald-400'
              }`}
            />
            <span
              className={`text-sm font-bold ${
                !eyeStatus.hasFace
                  ? 'text-amber-400'
                  : eyeStatus.isEyesClosed
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}
            >
              {!eyeStatus.hasFace
                ? 'Tìm mặt...'
                : eyeStatus.isEyesClosed
                ? 'ĐANG NHẮM'
                : 'ĐANG MỞ'}
            </span>
          </div>
        </div>

        {/* Metric 2: Openness Ratio (EAR) */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Độ mở mắt (EAR)</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-bold font-mono tabular-nums text-white">
              {(eyeStatus.avgEAR * 100).toFixed(0)}%
            </span>
            <span className="text-[11px] text-slate-400">
              Ngưỡng: {(settings.eyeOpenThresholdEAR * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Metric 3: Closed Duration Timer */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Thời gian nhắm</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span
              className={`text-base font-bold font-mono tabular-nums ${
                eyeStatus.closedDurationSec > 0.8 ? 'text-rose-400 font-extrabold' : 'text-slate-200'
              }`}
            >
              {eyeStatus.closedDurationSec.toFixed(1)}s
            </span>
            <span className="text-[11px] text-slate-400">
              Hạn mức: {settings.closeDurationThresholdSec.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Metric 4: Multi-App / Background Status */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Dùng app khác</div>
          <div className="mt-1 flex items-center justify-between">
            <span className={`text-xs font-semibold ${isPipActive ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isPipActive ? 'Đang Ghim PiP' : 'Sẵn sàng PiP'}
            </span>
            <button
              onClick={handleRequestPip}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            >
              {isPipActive ? 'Đóng PiP' : 'Bật PiP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert,
  PictureInPicture,
  Volume2,
  VolumeX,
  History,
  Sparkles,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Clock,
  Zap,
  Info
} from 'lucide-react';
import { DetectionSettings, EyeStatus, DrowsinessEvent } from './types';
import { Header } from './components/Header';
import { CameraHUD } from './components/CameraHUD';
import { SettingsPanel } from './components/SettingsPanel';
import { PipModalGuide } from './components/PipModalGuide';
import { CalibrationModal } from './components/CalibrationModal';
import { DrowsinessLog } from './components/DrowsinessLog';
import { TipsCard } from './components/TipsCard';
import { audioAlert } from './utils/audioAlert';
import { backgroundService } from './utils/backgroundManager';

export default function App() {
  const [settings, setSettings] = useState<DetectionSettings>({
    closeDurationThresholdSec: 1.5,
    eyeOpenThresholdEAR: 0.20,
    sensitivity: 'medium',
    alarmSound: 'siren',
    volume: 1.0,
    voiceAlertEnabled: true,
    vibrateEnabled: true,
    glassesMode: false,
    autoPipOnStart: false,
  });

  const [eyeStatus, setEyeStatus] = useState<EyeStatus>({
    hasFace: false,
    leftEAR: 0,
    rightEAR: 0,
    avgEAR: 0,
    leftBlinkScore: 0,
    rightBlinkScore: 0,
    isEyesClosed: false,
    closedDurationSec: 0,
    alarmTriggered: false,
    fps: 30,
  });

  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [isPipActive, setIsPipActive] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [events, setEvents] = useState<DrowsinessEvent[]>([]);

  // Session timer
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const alarmStartTimestampRef = useRef<number | null>(null);

  // Start background services on mount
  useEffect(() => {
    backgroundService.startBackgroundTicker();
    audioAlert.startBackgroundKeepAlive();

    const sessionTimer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(sessionTimer);
      backgroundService.stopBackgroundTicker();
      audioAlert.stopBackgroundKeepAlive();
      audioAlert.stopAlarm();
    };
  }, []);

  // Format session time
  const formatSessionTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Trigger loud alarm
  const handleAlarmTrigger = useCallback(() => {
    if (isAlarmActive) return;
    setIsAlarmActive(true);
    alarmStartTimestampRef.current = performance.now();

    // 1. Play synthesized siren sound through speakers
    audioAlert.startAlarm(settings.alarmSound, settings.volume, settings.voiceAlertEnabled);

    // 2. Flash page title
    backgroundService.startTitleFlash('🚨🚨 DẬY ĐI! CẢNH BÁO BUỒN NGỦ!');

    // 3. Send desktop notification if tab is in background
    backgroundService.sendNotification(
      '🚨 CẢNH BÁO: BẠN ĐANG NGỦ GẬT!',
      'Mắt bạn đã nhắm quá lâu! Hãy mở mắt ra và tỉnh táo lại ngay!'
    );

    // 4. Record new drowsiness event
    const newEvent: DrowsinessEvent = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      durationSec: settings.closeDurationThresholdSec,
      maxEAR: eyeStatus.avgEAR,
      soundPlayed: settings.alarmSound,
      dismissed: false,
    };
    setEvents((prev) => [newEvent, ...prev]);
  }, [isAlarmActive, settings, eyeStatus.avgEAR]);

  // Dismiss / Stop loud alarm
  const handleAlarmDismiss = useCallback(() => {
    setIsAlarmActive(false);
    audioAlert.stopAlarm();
    backgroundService.stopTitleFlash();

    // Update dismissed state on most recent event
    setEvents((prev) =>
      prev.map((ev, idx) => (idx === 0 ? { ...ev, dismissed: true } : ev))
    );
  }, []);

  const handleUpdateSettings = (newSettings: Partial<DetectionSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleApplyCalibration = (thresholdEAR: number) => {
    setSettings((prev) => ({
      ...prev,
      eyeOpenThresholdEAR: thresholdEAR,
      sensitivity: 'medium',
    }));
  };

  const handleTestAlarm = () => {
    audioAlert.testSound(settings.alarmSound, settings.volume);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* 3-Zone Clean Header */}
      <Header
        isAlarmActive={isAlarmActive}
        onStopAlarm={handleAlarmDismiss}
        onTestAlarm={handleTestAlarm}
        onTogglePip={() => setIsPipActive((prev) => !prev)}
        isPipActive={isPipActive}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Multi-App Feature Callout Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
                <PictureInPicture className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-white">
                    Hỗ Trợ Chạy Song Song Khi Dùng Web Hoặc App Khác
                  </h1>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                    Tính Năng Độc Quyền
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-3xl">
                  Bật <strong>Cửa Sổ Nổi (Picture-in-Picture)</strong> để camera ghim nhỏ ở góc màn hình đè lên Word, Excel, VS Code, Game hoặc Facebook. Khi bạn nhắm mắt ngủ gật, còi báo động vẫn <strong>kêu to 100%</strong> đánh thức bạn!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setIsGuideOpen(true)}
                className="flex-1 sm:flex-initial rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer text-center"
              >
                Xem Hướng Dẫn
              </button>
              <button
                onClick={() => setIsPipActive((prev) => !prev)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 cursor-pointer whitespace-nowrap"
              >
                <PictureInPicture className="h-4 w-4" />
                <span>{isPipActive ? 'Đang Ghim PiP' : 'Ghim Cửa Sổ Nổi (PiP)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Master Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Camera HUD Viewfinder (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <CameraHUD
              settings={settings}
              eyeStatus={eyeStatus}
              setEyeStatus={setEyeStatus}
              isAlarmActive={isAlarmActive}
              onAlarmTrigger={handleAlarmTrigger}
              onAlarmDismiss={handleAlarmDismiss}
              onOpenCalibration={() => setIsCalibrationOpen(true)}
              isPipActive={isPipActive}
              onTogglePip={() => setIsPipActive((prev) => !prev)}
              onOpenGuide={() => setIsGuideOpen(true)}
            />

            {/* Scientific Tips */}
            <TipsCard />
          </div>

          {/* Right Column: Defense Dashboard & Quick Stats (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Session Status Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Trạng Thái Bảo Vệ Trực Tiếp
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Đang hoạt động</span>
                </span>
              </div>

              {/* Stats Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] text-slate-400">Thời gian giám sát</div>
                  <div className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                    {formatSessionTime(sessionSeconds)}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] text-slate-400">Số lần ngủ gật</div>
                  <div className="mt-1 font-mono text-lg font-bold text-rose-400 tabular-nums">
                    {events.length} lần
                  </div>
                </div>
              </div>

              {/* Multi-App Status Indicator */}
              <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Chạy nền Web Worker:</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Không bị đóng băng</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cửa sổ nổi PiP:</span>
                  <span className={`font-semibold ${isPipActive ? 'text-amber-400' : 'text-slate-400'}`}>
                    {isPipActive ? 'Đang ghim trên màn hình' : 'Chưa bật'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Giới hạn nhắm mắt:</span>
                  <span className="font-mono text-rose-400 font-bold">
                    {settings.closeDurationThresholdSec.toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Action Button: Spacebar tip */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>
                  Khi còi kêu, bấm <strong>[Phím Cách] (Space)</strong> trên bàn phím để tắt nhanh!
                </span>
              </div>
            </div>

            {/* Quick Calibration Banner */}
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-5 shadow-xl">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Dáng Mắt Cá Nhân</span>
              </div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Nếu bạn có mắt một mí, đeo kính cận hoặc cảm thấy còi kêu quá sớm/quá muộn, hãy hiệu chuẩn chỉ trong 6 giây.
              </p>
              <button
                onClick={() => setIsCalibrationOpen(true)}
                className="mt-3.5 w-full rounded-lg bg-amber-500/20 border border-amber-500/40 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
              >
                Bắt Đầu Hiệu Chuẩn Dáng Mắt
              </button>
            </div>

            {/* Drowsiness Event History */}
            <DrowsinessLog events={events} onClearLog={() => setEvents([])} />
          </div>
        </div>

        {/* Settings Panel Full Width */}
        <SettingsPanel
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
        />
      </main>

      {/* Clean Anti-Slop Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-bold text-slate-200">WakeGuard</span>
            <span aria-hidden="true">·</span>
            <span>Hệ thống giám sát chống ngủ gật bằng AI thị giác máy tính</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Bảo vệ mắt & An toàn làm việc</span>
            <span aria-hidden="true">·</span>
            <span>Hỗ trợ Picture-in-Picture mọi ứng dụng</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PipModalGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onTriggerPip={() => setIsPipActive((prev) => !prev)}
        isPipActive={isPipActive}
      />

      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentEyeStatus={eyeStatus}
        onApplyCalibration={handleApplyCalibration}
      />
    </div>
  );
}

import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  Glasses,
  Mic,
  Clock,
  ShieldAlert,
  HelpCircle,
  Play
} from 'lucide-react';
import { DetectionSettings, AlarmSoundType } from '../types';
import { audioAlert } from '../utils/audioAlert';
import { backgroundService } from '../utils/backgroundManager';

interface SettingsPanelProps {
  settings: DetectionSettings;
  onUpdateSettings: (newSettings: Partial<DetectionSettings>) => void;
  onOpenCalibration: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onOpenCalibration,
}) => {
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [notifState, setNotifState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const soundOptions: { id: AlarmSoundType; label: string; desc: string }[] = [
    {
      id: 'siren',
      label: 'Siren Cấp Cứu (Khuyên dùng)',
      desc: 'Âm thanh quét cao tần 900-1600Hz liên tục, chói tai khó ngủ tiếp',
    },
    {
      id: 'horn',
      label: 'Còi Xe Tải Hàng Loạt',
      desc: 'Hợp âm kèn xe inh ỏi dồn dập, giật mình ngay tức khắc',
    },
    {
      id: 'piercing_beep',
      label: 'Tiếng Bíp Chói Tai (Pulse)',
      desc: 'Chuỗi tiếng bíp 1350Hz nhịp độ cực nhanh 5 lần/giây',
    },
    {
      id: 'fire_alarm',
      label: 'Chuông Báo Động Hỏa Hoạn',
      desc: 'Tiếng chuông điện công nghiệp vang rền liên tục',
    },
  ];

  const handleTestSound = (sound: AlarmSoundType) => {
    setIsPlayingTest(true);
    audioAlert.testSound(sound, settings.volume);
    setTimeout(() => {
      setIsPlayingTest(false);
    }, 1800);
  };

  const handleRequestNotification = async () => {
    const res = await backgroundService.requestNotificationPermission();
    setNotifState(res);
    if (res === 'granted') {
      backgroundService.sendNotification(
        'WakeGuard đã sẵn sàng!',
        'Hệ thống sẽ gửi thông báo khẩn cấp khi phát hiện bạn nhắm mắt quá lâu.'
      );
    }
  };

  return (
    <div id="settings" className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Cài Đặt Còi Báo Động & Độ Nhạy</h2>
            <p className="text-xs text-slate-400">
              Tùy biến âm thanh, thời gian nhắm mắt kích hoạt và độ nhạy của camera AI
            </p>
          </div>
        </div>

        {/* Calibration Action */}
        <button
          onClick={onOpenCalibration}
          className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-slate-700 hover:text-amber-200 transition-colors cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Hiệu Chuẩn Dáng Mắt</span>
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Duration & Sensitivity */}
        <div className="space-y-6">
          {/* Setting 1: Duration Threshold */}
          <div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Clock className="h-4 w-4 text-rose-400" />
                <span>Thời gian nhắm mắt để hú còi:</span>
              </label>
              <span className="font-mono text-sm font-extrabold text-rose-400 tabular-nums">
                {settings.closeDurationThresholdSec.toFixed(1)} giây
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Chớp mắt thông thường chỉ mất 0.2s - 0.4s. Mức khuyến nghị là <strong>1.5s</strong> để không báo nhầm khi chớp mắt nhưng phản ứng kịp khi thiếp đi.
            </p>

            {/* Slider */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-500">0.8s</span>
              <input
                type="range"
                min="0.8"
                max="3.0"
                step="0.1"
                value={settings.closeDurationThresholdSec}
                onChange={(e) =>
                  onUpdateSettings({ closeDurationThresholdSec: parseFloat(e.target.value) })
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-rose-500"
              />
              <span className="text-[11px] font-mono text-slate-500">3.0s</span>
            </div>

            {/* Quick Presets */}
            <div className="mt-2.5 flex items-center gap-2">
              {[1.0, 1.5, 2.0, 2.5].map((val) => (
                <button
                  key={val}
                  onClick={() => onUpdateSettings({ closeDurationThresholdSec: val })}
                  className={`rounded-md px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                    settings.closeDurationThresholdSec === val
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {val.toFixed(1)}s
                </button>
              ))}
            </div>
          </div>

          {/* Setting 2: Sensitivity (EAR Threshold) */}
          <div className="border-t border-slate-800/80 pt-5">
            <label className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Độ nhạy nhận diện sụp mí / nhắm mắt:</span>
              </span>
              <span className="text-xs text-amber-400 font-semibold uppercase">
                {settings.sensitivity === 'low'
                  ? 'Thấp'
                  : settings.sensitivity === 'medium'
                  ? 'Tiêu chuẩn'
                  : 'Cực nhạy'}
              </span>
            </label>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Độ nhạy càng cao thì mắt hơi lim dim mí sụp xuống đã bị tính là nhắm.
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  onUpdateSettings({ sensitivity: 'low', eyeOpenThresholdEAR: 0.16 })
                }
                className={`rounded-lg border p-2 text-center text-xs transition-colors cursor-pointer ${
                  settings.sensitivity === 'low'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white font-semibold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold">Thấp</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Nhắm hẳn mới kêu</div>
              </button>

              <button
                onClick={() =>
                  onUpdateSettings({ sensitivity: 'medium', eyeOpenThresholdEAR: 0.20 })
                }
                className={`rounded-lg border p-2 text-center text-xs transition-colors cursor-pointer ${
                  settings.sensitivity === 'medium'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white font-semibold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold">Tiêu Chuẩn</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Khuyên dùng (98%)</div>
              </button>

              <button
                onClick={() =>
                  onUpdateSettings({ sensitivity: 'high', eyeOpenThresholdEAR: 0.24 })
                }
                className={`rounded-lg border p-2 text-center text-xs transition-colors cursor-pointer ${
                  settings.sensitivity === 'high'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white font-semibold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold">Rất Nhạy</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Mí lờ đờ là kêu</div>
              </button>
            </div>
          </div>

          {/* Setting 3: Glasses Mode Toggle */}
          <div className="border-t border-slate-800/80 pt-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                <Glasses className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Chế độ người đeo kính</div>
                <div className="text-[11px] text-slate-400">
                  Tự động khử lóa mắt kính & bù trừ gọng kính
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ glassesMode: !settings.glassesMode })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                settings.glassesMode ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.glassesMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Right Column: Audio & Notification Settings */}
        <div className="space-y-6">
          {/* Sound Presets */}
          <div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Volume2 className="h-4 w-4 text-emerald-400" />
                <span>Loại âm thanh còi báo động:</span>
              </label>
              <button
                onClick={() => handleTestSound(settings.alarmSound)}
                className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-slate-700 cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>{isPlayingTest ? 'Đang kêu...' : 'Nghe Thử'}</span>
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {soundOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => onUpdateSettings({ alarmSound: opt.id })}
                  className={`flex items-start justify-between rounded-xl border p-3 cursor-pointer transition-colors ${
                    settings.alarmSound === opt.id
                      ? 'border-emerald-500/80 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div
                      className={`text-xs font-bold ${
                        settings.alarmSound === opt.id ? 'text-emerald-300' : 'text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestSound(opt.id);
                    }}
                    title="Nghe thử còi này"
                    className="ml-2 rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Volume Slider */}
          <div className="border-t border-slate-800/80 pt-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                Âm lượng còi (Volume):
              </label>
              <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <VolumeX className="h-4 w-4 text-slate-500" />
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={settings.volume}
                onChange={(e) => onUpdateSettings({ volume: parseFloat(e.target.value) })}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-emerald-500"
              />
              <Volume2 className="h-4 w-4 text-emerald-400" />
            </div>
          </div>

          {/* Voice Alert Toggle */}
          <div className="border-t border-slate-800/80 pt-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-rose-400">
                <Mic className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Giọng nói Tiếng Việt gọi dậy</div>
                <div className="text-[11px] text-slate-400">
                  Phát âm thanh: "Dậy ngay! Bạn đang nhắm mắt buồn ngủ!"
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ voiceAlertEnabled: !settings.voiceAlertEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                settings.voiceAlertEnabled ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.voiceAlertEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Desktop Notifications Permission */}
          <div className="border-t border-slate-800/80 pt-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-amber-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Thông báo đẩy máy tính</div>
                <div className="text-[11px] text-slate-400">
                  {notifState === 'granted'
                    ? 'Đã bật - Sẽ hiện thông báo khi chạy ngầm'
                    : 'Nhận cảnh báo khẩn cấp khi đang ở tab khác'}
                </div>
              </div>
            </div>
            {notifState === 'granted' ? (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2.5 py-1 rounded-md">
                Đã Cấp Quyền
              </span>
            ) : (
              <button
                onClick={handleRequestNotification}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
              >
                Cấp Quyền
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Eye, Bell, BellOff, PictureInPicture, Volume2 } from 'lucide-react';

interface HeaderProps {
  isAlarmActive: boolean;
  onStopAlarm: () => void;
  onTestAlarm: () => void;
  onTogglePip: () => void;
  isPipActive: boolean;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAlarmActive,
  onStopAlarm,
  onTestAlarm,
  onTogglePip,
  isPipActive,
  onOpenGuide,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 shadow-md shadow-rose-950/40">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">WakeGuard</span>
              <span className="text-xs text-rose-400 font-medium tracking-wide">AI Drowsiness Defense</span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Hệ thống camera giám sát chống ngủ gật & cảnh báo âm thanh
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation and guide link */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a href="#camera-view" className="hover:text-white transition-colors">
            Camera Giám Sát
          </a>
          <a href="#settings" className="hover:text-white transition-colors">
            Cài Đặt Còi & Độ Nhạy
          </a>
          <button
            onClick={onOpenGuide}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Cách Dùng Khi Mở App Khác</span>
          </button>
          <a href="#history" className="hover:text-white transition-colors">
            Nhật Ký Buồn Ngủ
          </a>
        </nav>

        {/* Zone 3: Primary Action buttons */}
        <div className="flex items-center gap-2.5">
          {/* Quick PiP Button */}
          <button
            onClick={onTogglePip}
            title="Bật/Tắt Cửa Sổ Nổi Picture-in-Picture để dùng khi mở ứng dụng khác"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              isPipActive
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <PictureInPicture className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isPipActive ? 'Đang Ghim PiP' : 'Cửa Sổ Nổi (PiP)'}
            </span>
          </button>

          {/* Test Sound Button */}
          {!isAlarmActive && (
            <button
              onClick={onTestAlarm}
              title="Phát thử âm thanh còi để kiểm tra loa"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <Volume2 className="h-4 w-4 text-slate-400" />
              <span className="hidden sm:inline">Thử Còi</span>
            </button>
          )}

          {/* Immediate Dismiss / Stop Alarm Button if sounding */}
          {isAlarmActive ? (
            <button
              onClick={onStopAlarm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 animate-pulse hover:bg-rose-500 transition-colors cursor-pointer"
            >
              <BellOff className="h-4 w-4" />
              <span>TẮT CÒI NGAY</span>
            </button>
          ) : (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-400 px-2 py-1 rounded bg-emerald-950/40 border border-emerald-800/40">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping" />
              <span>Sẵn sàng bảo vệ</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import {
  X,
  PictureInPicture,
  AppWindow,
  BellRing,
  Volume2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Laptop
} from 'lucide-react';

interface PipModalGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerPip: () => void;
  isPipActive: boolean;
}

export const PipModalGuide: React.FC<PipModalGuideProps> = ({
  isOpen,
  onClose,
  onTriggerPip,
  isPipActive,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <PictureInPicture className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Hướng Dẫn Dùng Khi Mở Ứng Dụng Hoặc Web Khác
            </h2>
            <p className="text-xs text-slate-400">
              Cách để WakeGuard tiếp tục soi camera và hú còi khi bạn đang làm việc khác
            </p>
          </div>
        </div>

        {/* 3 Methods */}
        <div className="mt-6 space-y-4">
          {/* Method 1: Picture-in-Picture */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-bold text-xs">
                  1
                </span>
                <h3 className="text-sm font-bold text-amber-300">
                  Cách 1 (Khuyên dùng nhất): Ghim Cửa Sổ Nổi (Picture-in-Picture)
                </h3>
              </div>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                Tốt Nhất
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Nhấn nút <strong>"Ghim Cửa Sổ Nổi (PiP)"</strong>. Một ô camera nhỏ xíu sẽ hiện ra và 
              <span className="text-amber-300 font-semibold"> luôn nổi đè lên trên tất cả phần mềm khác</span> (như Word, Excel, VS Code, Facebook, YouTube, game...).
            </p>
            <ul className="mt-2.5 space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Bạn có thể thu nhỏ, phóng to hoặc kéo ô camera sang góc màn hình tùy thích.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Trực tiếp thấy mắt mình có đang mở hay không, thanh đếm giây vẫn nhảy mượt mà.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Khi bạn nhắm mắt quá thời gian quy định, còi vẫn hú to 100%!</span>
              </li>
            </ul>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => {
                  onTriggerPip();
                  onClose();
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isPipActive
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                }`}
              >
                <PictureInPicture className="h-4 w-4" />
                <span>{isPipActive ? 'Đang bật PiP (Đóng lại)' : 'Thử Ghim Cửa Sổ Nổi PiP Ngay'}</span>
              </button>
            </div>
          </div>

          {/* Method 2: Background Tab Running */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                2
              </span>
              <h3 className="text-sm font-bold text-indigo-300">
                Cách 2: Để Tab Này Chạy Ngầm (Không Cần Bật Ô Nổi)
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Nếu bạn không muốn có ô camera che màn hình: Chỉ cần giữ tab này mở trong trình duyệt và chuyển sang làm việc ở tab khác hoặc app khác.
            </p>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              WakeGuard đã tích hợp sẵn công nghệ <strong>Web Worker Ticker</strong> và <strong>Audio Heartbeat</strong> chống đóng băng trình duyệt. Camera vẫn âm thầm quét và còi sẽ hú cực to đánh thức bạn khi phát hiện ngủ gật!
            </p>
          </div>

          {/* Method 3: Desktop Notifications */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                3
              </span>
              <h3 className="text-sm font-bold text-emerald-300">
                Cách 3: Kết Hợp Thông Báo Màn Hình (Desktop Notification)
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Bật quyền nhận thông báo trong bảng cài đặt bên dưới. Khi mắt bạn nhắm lâu, ngoài tiếng còi hú, máy tính sẽ hiện thông báo khẩn cấp ngay góc màn hình để giật mình tỉnh dậy.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Đã Hiểu, Quay Lại
          </button>
        </div>
      </div>
    </div>
  );
};

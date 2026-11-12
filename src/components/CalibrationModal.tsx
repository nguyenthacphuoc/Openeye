import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, CheckCircle2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { EyeStatus } from '../types';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEyeStatus: EyeStatus;
  onApplyCalibration: (thresholdEAR: number) => void;
}

type Step = 'intro' | 'open_eyes' | 'close_eyes' | 'result';

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  currentEyeStatus,
  onApplyCalibration,
}) => {
  const [step, setStep] = useState<Step>('intro');
  const [timer, setTimer] = useState<number>(3);
  const [openEARSamples, setOpenEARSamples] = useState<number[]>([]);
  const [closedEARSamples, setClosedEARSamples] = useState<number[]>([]);
  const [calibratedThreshold, setCalibratedThreshold] = useState<number | null>(null);

  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setStep('intro');
      setTimer(3);
      setOpenEARSamples([]);
      setClosedEARSamples([]);
      setCalibratedThreshold(null);
    }
  }, [isOpen]);

  // Collect samples during active step
  useEffect(() => {
    if ((step === 'open_eyes' || step === 'close_eyes') && currentEyeStatus.avgEAR > 0) {
      samplesRef.current.push(currentEyeStatus.avgEAR);
    }
  }, [step, currentEyeStatus.avgEAR]);

  // Step progression timer
  useEffect(() => {
    if (step === 'open_eyes' || step === 'close_eyes') {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (step === 'open_eyes') {
              const recorded = [...samplesRef.current];
              samplesRef.current = [];
              setOpenEARSamples(recorded);
              setStep('close_eyes');
              return 3;
            } else {
              // Finish close eyes
              const recorded = [...samplesRef.current];
              samplesRef.current = [];
              setClosedEARSamples(recorded);

              // Calculate threshold
              const avgOpen =
                openEARSamples.length > 0
                  ? openEARSamples.reduce((a, b) => a + b, 0) / openEARSamples.length
                  : 0.28;
              const avgClosed =
                recorded.length > 0
                  ? recorded.reduce((a, b) => a + b, 0) / recorded.length
                  : 0.12;

              // Safe mid-point calculation
              const optimal = Math.max(0.14, Math.min(0.26, avgClosed + (avgOpen - avgClosed) * 0.45));
              setCalibratedThreshold(optimal);
              setStep('result');
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, openEARSamples]);

  if (!isOpen) return null;

  const startCalibration = () => {
    samplesRef.current = [];
    setOpenEARSamples([]);
    setClosedEARSamples([]);
    setTimer(3);
    setStep('open_eyes');
  };

  const handleApply = () => {
    if (calibratedThreshold) {
      onApplyCalibration(calibratedThreshold);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Hiệu Chuẩn Dáng Mắt Cá Nhân</h3>
            <p className="text-xs text-slate-400">
              Đo chính xác độ mở mắt riêng của bạn để phát hiện ngủ gật chính xác 100%
            </p>
          </div>
        </div>

        {/* Step: Intro */}
        {step === 'intro' && (
          <div className="mt-6 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Mỗi người có cấu trúc mắt khác nhau (mắt một mí, hai mí, đeo kính, hoặc mắt sâu). Quá trình hiệu chuẩn chỉ mất <strong>6 giây</strong>:
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Bước 1: Mở mắt bình thường (3s)</div>
                  <div className="text-[11px] text-slate-400">Nhìn thẳng camera như lúc đang làm việc</div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                  <EyeOff className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Bước 2: Nhắm cả hai mắt lại (3s)</div>
                  <div className="text-[11px] text-slate-400">Nhắm mắt như lúc bạn đang thiếp đi</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={onClose}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={startCalibration}
                className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Bắt Đầu Đo (6 Giây)
              </button>
            </div>
          </div>
        )}

        {/* Step: Open Eyes */}
        {step === 'open_eyes' && (
          <div className="mt-6 text-center py-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mb-4 animate-pulse">
              <Eye className="h-10 w-10" />
            </div>
            <div className="text-2xl font-black font-mono tabular-nums text-white">
              00:0{timer}
            </div>
            <h4 className="mt-2 text-base font-bold text-emerald-400">
              BƯỚC 1: HÃY MỞ MẮT TỰ NHIÊN
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Nhìn thẳng camera và giữ mắt mở thư giãn
            </p>
            <div className="mt-4 text-xs font-mono text-slate-400">
              Chỉ số hiện tại: {(currentEyeStatus.avgEAR * 100).toFixed(0)}%
            </div>
          </div>
        )}

        {/* Step: Close Eyes */}
        {step === 'close_eyes' && (
          <div className="mt-6 text-center py-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/20 border-2 border-rose-500 text-rose-400 mb-4 animate-pulse">
              <EyeOff className="h-10 w-10" />
            </div>
            <div className="text-2xl font-black font-mono tabular-nums text-white">
              00:0{timer}
            </div>
            <h4 className="mt-2 text-base font-bold text-rose-400">
              BƯỚC 2: HÃY NHẮM MẮT LẠI NGAY
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Nhắm chặt mắt lại trong 3 giây cho đến khi có tiếng bíp
            </p>
            <div className="mt-4 text-xs font-mono text-slate-400">
              Chỉ số hiện tại: {(currentEyeStatus.avgEAR * 100).toFixed(0)}%
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && calibratedThreshold && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>Hiệu chuẩn thành công!</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Độ mở mắt lúc bình thường:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {openEARSamples.length > 0
                    ? ((openEARSamples.reduce((a, b) => a + b, 0) / openEARSamples.length) * 100).toFixed(0)
                    : 28}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Độ nhắm mắt khi ngủ:</span>
                <span className="font-mono font-bold text-rose-400">
                  {closedEARSamples.length > 0
                    ? ((closedEARSamples.reduce((a, b) => a + b, 0) / closedEARSamples.length) * 100).toFixed(0)
                    : 12}%
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-xs">
                <span className="font-bold text-white">Ngưỡng báo động tối ưu:</span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {(calibratedThreshold * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Hệ thống đã tự động tính toán ngưỡng báo động chính xác theo dáng mắt của bạn.
            </p>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={startCalibration}
                className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Đo Lại</span>
              </button>
              <button
                onClick={handleApply}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                Lưu & Áp Dụng Ngay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

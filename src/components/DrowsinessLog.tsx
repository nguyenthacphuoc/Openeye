import React from 'react';
import { History, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { DrowsinessEvent } from '../types';

interface DrowsinessLogProps {
  events: DrowsinessEvent[];
  onClearLog: () => void;
}

export const DrowsinessLog: React.FC<DrowsinessLogProps> = ({ events, onClearLog }) => {
  return (
    <div id="history" className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Nhật Ký Cảnh Báo Buồn Ngủ</h2>
            <p className="text-xs text-slate-400">
              Ghi lại những khoảnh khắc bạn bị thiếp đi trong phiên làm việc
            </p>
          </div>
        </div>

        {events.length > 0 && (
          <button
            onClick={onClearLog}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Xóa Lịch Sử</span>
          </button>
        )}
      </div>

      <div className="mt-4">
        {events.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/60 text-slate-500 mb-2">
              <CheckCircle className="h-6 w-6 text-emerald-500/80" />
            </div>
            <p className="text-xs font-semibold text-slate-300">Chưa có lần buồn ngủ nào!</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Bạn đang giữ được sự tỉnh táo rất tốt. Khi mắt bạn nhắm quá thời gian quy định, nhật ký sẽ lưu lại tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Độ dài nhắm mắt</th>
                  <th className="py-2.5 px-3">Loại còi hú</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-300 font-sans">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <span>
                          {ev.timestamp.toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-bold text-rose-400">
                      {ev.durationSec.toFixed(1)}s
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300 capitalize">
                      {ev.soundPlayed === 'siren'
                        ? 'Siren Cấp Cứu'
                        : ev.soundPlayed === 'horn'
                        ? 'Còi Xe Tải'
                        : ev.soundPlayed === 'piercing_beep'
                        ? 'Bíp Bíp Cao Tần'
                        : 'Chuông Báo Cháy'}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>Đã tỉnh dậy</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

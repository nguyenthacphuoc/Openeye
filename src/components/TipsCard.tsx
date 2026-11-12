import React from 'react';
import { Coffee, Droplets, Sun, Activity, Zap, Brain } from 'lucide-react';

export const TipsCard: React.FC = () => {
  const tips = [
    {
      icon: <Droplets className="h-4 w-4 text-sky-400" />,
      title: 'Uống 1 cốc nước lạnh',
      desc: 'Mất nước là nguyên nhân hàng đầu gây mệt mỏi và sụp mí mắt. Uống nước ngay khi thấy buồn ngủ.',
    },
    {
      icon: <Activity className="h-4 w-4 text-emerald-400" />,
      title: 'Đứng dậy vận động 2 phút',
      desc: 'Đi lại, vươn vai hoặc rửa mặt bằng nước mát giúp tim bơm máu và kích thích thần kinh giao cảm.',
    },
    {
      icon: <Sun className="h-4 w-4 text-amber-400" />,
      title: 'Tăng độ sáng phòng làm việc',
      desc: 'Ánh sáng yếu kích thích não tiết hormone melatonin gây buồn ngủ. Bật đèn sáng trắng.',
    },
    {
      icon: <Brain className="h-4 w-4 text-purple-400" />,
      title: 'Quy tắc 20-20-20',
      desc: 'Cứ 20 phút nhìn xa 20 feet (6m) trong 20 giây để giảm mỏi cơ điều tiết của mắt.',
    },
    {
      icon: <Zap className="h-4 w-4 text-rose-400" />,
      title: 'Power Nap (Chợp mắt 15-20p)',
      desc: 'Nếu cơ thể quá kiệt sức, hãy chợp mắt ngắn 15-20 phút rồi dùng WakeGuard tiếp.',
    },
    {
      icon: <Coffee className="h-4 w-4 text-orange-400" />,
      title: 'Dùng cà phê đúng cách',
      desc: 'Caffeine phát huy tác dụng sau 20-30 phút. Tránh uống quá muộn gần giờ đi ngủ chính.',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Mẹo Khoa Học Giữ Tỉnh Táo Khi Làm Việc Đêm</h2>
          <p className="text-xs text-slate-400">
            Kết hợp với WakeGuard để đạt hiệu suất cao nhất mà không bị kiệt sức
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tips.map((tip, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800">
                {tip.icon}
              </div>
              <h3 className="text-xs font-bold text-slate-200">{tip.title}</h3>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

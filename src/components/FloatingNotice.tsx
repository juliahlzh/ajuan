'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function FloatingNotice({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-24 z-40 max-w-sm rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-[0_16px_50px_rgba(15,118,110,0.18)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-emerald-600">
          <CheckCircle2 size={18} />
        </span>
        <div>
          <p className="text-sm font-black text-slate-900">Tersimpan</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
}

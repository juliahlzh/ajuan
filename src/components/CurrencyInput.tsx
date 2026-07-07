'use client';

import { useMemo, useState } from 'react';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatNumber(value: string | number | null | undefined) {
  const digits = onlyDigits(String(value ?? ''));
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

export function CurrencyInput({
  name,
  defaultValue,
  placeholder = '0',
  required = false
}: {
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
}) {
  const initial = useMemo(() => formatNumber(defaultValue), [defaultValue]);
  const [display, setDisplay] = useState(initial);
  const rawValue = onlyDigits(display);

  return (
    <div className="flex w-full items-center rounded-xl border border-slate-300 bg-white transition focus-within:border-teal-700 focus-within:ring-4 focus-within:ring-teal-700/10">
      <span className="shrink-0 border-r border-slate-200 px-4 text-sm font-black text-slate-500">Rp</span>
      <input
        className="min-w-0 flex-1 rounded-r-xl bg-transparent px-4 py-3 text-sm font-semibold outline-none"
        inputMode="numeric"
        value={display}
        placeholder={placeholder}
        required={required}
        onChange={(event) => setDisplay(formatNumber(event.target.value))}
      />
      <input type="hidden" name={name} value={rawValue || '0'} />
    </div>
  );
}

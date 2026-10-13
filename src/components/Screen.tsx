import type { ReactNode } from 'react';

export const glassInput =
  'w-full rounded-2xl bg-white/5 px-4 py-3.5 text-[17px] text-white placeholder:text-white/30 ' +
  'ring-1 ring-inset ring-white/10 backdrop-blur-2xl outline-none transition focus:ring-white/30';

export const primaryBtn =
  'w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition ' +
  'active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100';

export const secondaryBtn =
  'w-full rounded-full bg-white/10 py-3.5 text-[15px] font-semibold text-white ring-1 ring-inset ' +
  'ring-white/10 backdrop-blur-2xl transition active:scale-[0.97] disabled:opacity-40';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-neutral-950 px-6 py-10 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60dvh] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.09),transparent)]" />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
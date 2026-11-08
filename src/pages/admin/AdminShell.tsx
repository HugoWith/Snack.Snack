import type { ReactNode } from "react";
import { EVENT } from "../../event";

interface AdminShellProps {
  aside?: ReactNode;
  children: ReactNode;
}

export function AdminShell({ aside, children }: AdminShellProps) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1200px] flex-col gap-8 px-4 pt-6 pb-16 lg:gap-12 lg:px-12 lg:pt-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-steel-800 pb-6">
        <div className="flex items-center gap-4">
          <img
            src="/img/snack-snack-logo-sm.png"
            alt="Snack Snack"
            width={818}
            height={444}
            className="block h-auto w-[72px] lg:w-[88px]"
          />
          <h1 className="font-display text-[28px] leading-none tracking-[-0.035em] text-mustard uppercase lg:text-4xl">
            Admin #{EVENT.edition}
          </h1>
        </div>
        {aside}
      </header>
      <main className="flex flex-col gap-8 lg:gap-12">{children}</main>
    </div>
  );
}

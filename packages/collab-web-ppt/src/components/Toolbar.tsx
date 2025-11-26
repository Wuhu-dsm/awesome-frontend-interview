"use client";

import Link from "next/link";

export default function Toolbar() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 border-b border-black/[.08] dark:border-white/[.145] bg-background">
      <Link href="/" className="text-sm font-medium">
        协同 Web-PPT
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <button className="h-9 rounded-full px-3 bg-foreground text-background text-sm">新建幻灯片</button>
        <button className="h-9 rounded-full px-3 border border-black/[.08] dark:border-white/[.145] text-sm">分享</button>
      </div>
    </header>
  );
}
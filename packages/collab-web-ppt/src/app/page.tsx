import Link from "next/link";

export default function Home() {
  return (
    <div className="grid min-h-screen place-items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-3xl space-y-6 rounded-xl p-12 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          协同 Web-PPT
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          使用 Next.js、Tailwind CSS 与 TypeScript 的最小架构，准备开始协同编辑。
        </p>
        <Link
          href="/slides"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-background transition-opacity hover:opacity-90"
        >
          打开 Slides 编辑器
        </Link>
      </main>
    </div>
  );
}

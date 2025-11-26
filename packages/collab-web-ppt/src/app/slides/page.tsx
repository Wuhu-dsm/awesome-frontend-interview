import Toolbar from "@/components/Toolbar";
import Slide from "@/components/Slide";

export default function SlidesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Toolbar />
      <main className="flex-1 grid place-items-center bg-zinc-50 dark:bg-black p-6">
        <Slide title="欢迎" content="这是协同 Web-PPT 的最小示例。" />
      </main>
    </div>
  );
}
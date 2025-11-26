type Props = {
  title?: string;
  content?: string;
};

export default function Slide({ title = "新幻灯片", content = "编辑内容…" }: Props) {
  return (
    <div className="w-[960px] h-[540px] rounded-xl bg-white/90 dark:bg-zinc-900 shadow border border-black/[.08] dark:border-white/[.145] p-8">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <p className="text-zinc-600 dark:text-zinc-400">{content}</p>
    </div>
  );
}
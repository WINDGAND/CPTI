import { ArrowRight, LockKeyhole, MessageCircleHeart, Sparkles } from 'lucide-react'

export default function AiUnlockPage({ onStartTest }) {
  return (
    <div className="pb-10">
      <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-card">
        <div className="relative px-5 py-8 text-center sm:px-8 md:py-12">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(circle at 20% 20%, rgba(244,167,176,0.24), transparent 30%), radial-gradient(circle at 80% 25%, rgba(118,184,224,0.22), transparent 32%), radial-gradient(circle at 50% 85%, rgba(142,214,180,0.2), transparent 34%)',
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-cyan text-white shadow-lg">
              <MessageCircleHeart size={30} aria-hidden />
            </div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-brand-cyan shadow-sm">
              <Sparkles size={13} aria-hidden />
              测试后解锁
            </p>
            <h1 className="mt-4 text-2xl font-black leading-tight text-base-text md:text-3xl">
              AI 关系助手会带着你们的 CPTI 结果一起聊
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-base-mute">
              完成测试后，AI 会读取你的类型、四维光谱、关系优势与冲突模式，再针对具体情感问题给出更贴合的沟通建议。
              在解锁前，它不会进行空泛聊天。
            </p>
            <button
              type="button"
              onClick={onStartTest}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand-cyan px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-[0.98]"
            >
              先完成 CPTI 测试
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ['先有结果', 'AI 会基于 SROD、IPOA 等类型和四维百分比回答，而不是泛泛说教。'],
          ['只传摘要', '不会上传昵称或完整原始答题，只使用必要的关系结果上下文。'],
          ['本地记录', '聊天历史仅保存在当前浏览器，刷新页面后仍可继续查看。'],
        ].map(([title, desc]) => (
          <article key={title} className="rounded-card border border-gray-100 bg-white p-4 shadow-card">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-cyan/10 text-brand-cyan">
                <LockKeyhole size={14} aria-hidden />
              </span>
              <h2 className="text-sm font-semibold text-base-text">{title}</h2>
            </div>
            <p className="text-xs leading-6 text-base-mute">{desc}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

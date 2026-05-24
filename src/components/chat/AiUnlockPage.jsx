import { ArrowRight, MessageCircleHeart, Sparkles } from 'lucide-react'

const FEATURES = [
  ['01', '先有结果', 'AI 会基于 SROD、IPOA 等类型和四维百分比回答，而不是泛泛说教。'],
  ['02', '只传摘要', '不会上传昵称或完整原始答题，只使用必要的关系结果上下文。'],
  ['03', '本地记录', '聊天历史仅保存在当前浏览器，刷新页面后仍可继续查看。'],
]

export default function AiUnlockPage({ onStartTest }) {
  return (
    <div className="pb-10">
      {/* Hero — 去外层大白卡，改为开放式版式 + radial 光晕 */}
      <section className="relative overflow-hidden pt-2 pb-12 md:pt-6 md:pb-16">
        <div
          className="absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(244,167,176,0.22), transparent 32%),' +
              'radial-gradient(circle at 80% 25%, rgba(118,184,224,0.20), transparent 32%),' +
              'radial-gradient(circle at 50% 90%, rgba(142,214,180,0.18), transparent 36%)',
          }}
          aria-hidden
        />

        <div className="mx-auto max-w-2xl text-center">
          {/* icon + 上方光条 */}
          <div className="mx-auto mb-5 flex flex-col items-center gap-2.5">
            <span
              className="h-[3px] w-12 rounded-full"
              style={{ background: 'linear-gradient(90deg, #F4A7B0, #76B8E0, #B8A0D0, #8ED6B4)' }}
              aria-hidden
            />
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-cyan shadow-[0_8px_30px_-12px_rgba(66,152,180,0.6)] ring-1 ring-brand-cyan/15">
              <MessageCircleHeart size={24} aria-hidden />
            </span>
          </div>

          <p className="text-eyebrow inline-flex items-center gap-1.5">
            <Sparkles size={12} aria-hidden />
            AI · Relationship Companion
          </p>

          <h1 className="mt-3 font-extrabold leading-tight text-base-text text-2xl md:text-[34px]">
            AI 关系助手会带着<br className="md:hidden" /> 你们的 CPTI 结果一起聊
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-base-mute">
            完成测试后，AI 会读取你的类型、四维光谱、关系优势与冲突模式，
            再针对具体情感问题给出更贴合的沟通建议。在解锁前，它不会进行空泛聊天。
          </p>

          <button
            type="button"
            onClick={onStartTest}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-brand-cyan px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(66,152,180,0.7)] transition-all duration-200 hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            先完成 CPTI 测试
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      </section>

      {/* 3 列编辑物风格说明 — 去卡片化 */}
      <section className="border-t border-gray-100 pt-7">
        <p className="text-eyebrow-mute mb-5 px-0.5">Why it works</p>
        <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-3 md:divide-x md:divide-gray-100">
          {FEATURES.map(([num, title, desc], idx) => (
            <article
              key={title}
              className={[
                'relative',
                idx > 0 ? 'pt-6 border-t border-gray-100 md:pt-0 md:border-t-0 md:pl-8' : 'md:pr-8',
              ].join(' ')}
            >
              <span
                className="ed-numeral text-3xl md:text-4xl"
                style={{ color: idx === 0 ? '#4298b4' : idx === 1 ? '#33a474' : '#88619a' }}
              >
                {num}
              </span>
              <h2 className="mt-2 text-sm font-bold text-base-text">{title}</h2>
              <p className="mt-1.5 text-xs leading-6 text-base-mute">{desc}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

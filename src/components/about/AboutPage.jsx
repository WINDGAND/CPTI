import { ArrowRight, BookOpenText, Compass, HeartHandshake, ShieldCheck } from 'lucide-react'

const DIMENSIONS = [
  {
    code: 'S / I',
    title: '空间距离',
    desc: '看你们更偏向高频陪伴，还是更需要边界与独处。',
  },
  {
    code: 'R / P',
    title: '情感表达',
    desc: '看你们更重仪式与体验，还是更重行动与落地。',
  },
  {
    code: 'O / F',
    title: '生活节奏',
    desc: '看你们更偏计划与秩序，还是随性与灵活。',
  },
  {
    code: 'D / A',
    title: '冲突解决',
    desc: '看你们更习惯当下沟通，还是先冷静再讨论。',
  },
]

function PrimaryButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-cyan px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(66,152,180,0.7)] transition-all duration-200 hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {children}
      <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
    </button>
  )
}

function GhostButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-cyan px-7 py-3 text-sm font-semibold text-brand-cyan transition-all duration-200 hover:bg-brand-cyan hover:text-white hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {children}
    </button>
  )
}

/** 编辑物风格的 Section：左侧主题色色条 + eyebrow + 标题 + 内容（无白色卡片包裹） */
function EditorialSection({ icon: Icon, eyebrow, title, accent = '#4298b4', children }) {
  return (
    <section className="relative pl-4 md:pl-5 py-1">
      <span
        className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full"
        style={{ background: accent, opacity: 0.85 }}
        aria-hidden
      />
      <div className="mb-3 flex items-center gap-2">
        <Icon size={14} style={{ color: accent }} aria-hidden />
        <p className="text-eyebrow" style={{ color: accent }}>{eyebrow}</p>
      </div>
      <h2 className="text-lg md:text-xl font-bold leading-snug text-base-text mb-3">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-base-text">
        {children}
      </div>
    </section>
  )
}

export default function AboutPage({ onStartTest, onGoFAQ }) {
  return (
    <div className="pb-10">
      <header className="pt-4 pb-7 text-center md:pt-8">
        <p className="text-eyebrow">About CPTI</p>
        <h1 className="mt-2 text-2xl md:text-[30px] font-extrabold leading-tight text-base-text">关于 CPTI</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-base-mute">
          CPTI 的核心不是给个人贴标签，而是帮助你们看见关系如何运作。
          <br />
          我们提供一面镜子，协助情侣更理解彼此，而不是评判谁对谁错。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton onClick={onStartTest}>开始测试</PrimaryButton>
          <GhostButton onClick={onGoFAQ}>查看常见问题</GhostButton>
        </div>
      </header>

      {/* 4 大 section 改为双列编辑物专栏 — 去卡片化 */}
      <div className="grid grid-cols-1 gap-y-9 gap-x-10 lg:grid-cols-2 lg:gap-y-12 border-t border-gray-100 pt-8">
        <EditorialSection
          icon={HeartHandshake}
          eyebrow="Why CPTI"
          title="我们为什么做 CPTI"
          accent="#F4A7B0"
        >
          <p>
            很多人熟悉 MBTI 这类个人测试，但亲密关系里最常见的困惑，往往不是“我是谁”，而是“我们为什么总在同一个点卡住”。
          </p>
          <p>
            CPTI 把关系作为最小分析单位，关注相处模式、表达方式和冲突节奏，帮助你们从“感觉不对”走向“具体可沟通”。
          </p>
        </EditorialSection>

        <EditorialSection
          icon={BookOpenText}
          eyebrow="How it works"
          title="CPTI 如何工作"
          accent="#76B8E0"
        >
          <p>
            测评由四个维度组成，采用 7 点量表（+3 到 -3）记录倾向强度。最终会形成四字母代码和四维光谱，而不是简单二选一。
          </p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 mt-3 mb-2">
            {DIMENSIONS.map((dimension, idx) => (
              <div key={dimension.code} className="relative pl-3 py-1">
                <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-brand-cyan/50" aria-hidden />
                <p className="font-display text-[11px] font-bold tracking-wider text-brand-cyan">{dimension.code}</p>
                <p className="mt-0.5 text-sm font-semibold text-base-text">{dimension.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-base-mute">{dimension.desc}</p>
              </div>
            ))}
          </div>
          <p>
            单人模式会得到“你的关系感知画像”，双人拼图会得到“双方合成结果”，并展示最一致与最错位维度。
          </p>
        </EditorialSection>

        <EditorialSection
          icon={Compass}
          eyebrow="How to use results"
          title="如何正确使用结果"
          accent="#8ED6B4"
        >
          <p>推荐按这三个步骤阅读：</p>
          <ol className="space-y-2 mt-1">
            {[
              '先看四维光谱：理解你们分别偏向什么。',
              '再看类型代码：把模式归纳成可讨论的共同语言。',
              '重点看一致/错位维度：把它转化为日常沟通动作。',
            ].map((step, idx) => (
              <li key={idx} className="flex items-baseline gap-2.5">
                <span className="font-display text-xs font-black tabular-nums text-mint shrink-0 w-5" style={{ color: '#5fb892' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-sm leading-relaxed text-base-text">{step}</span>
              </li>
            ))}
          </ol>
          <p>
            结果最有价值的使用方式，是帮助你们讨论“下次怎么做得更好”，而不是用来给彼此下定论。
          </p>
        </EditorialSection>

        <EditorialSection
          icon={ShieldCheck}
          eyebrow="Disclaimer"
          title="边界、声明与反馈"
          accent="#B8A0D0"
        >
          <p>
            CPTI 是关系沟通工具，不是医学或心理诊断。它不能替代专业咨询，也不用于判断关系价值高低。
          </p>
          <p>
            V1.0 以客户端计算为主，优先保证轻量、快速和可分享。你看到的结果基于当前题库与计分逻辑版本。
          </p>
          <div className="mt-2 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3 text-[11px] text-base-mute font-display tabular-nums">
            <div>
              <p className="text-eyebrow-mute mb-0.5">Version</p>
              <p>V1.0 MVP</p>
            </div>
            <div>
              <p className="text-eyebrow-mute mb-0.5">Updated</p>
              <p>2026-04-14</p>
            </div>
            <div>
              <p className="text-eyebrow-mute mb-0.5">Feedback</p>
              <p>内测通道</p>
            </div>
          </div>
        </EditorialSection>
      </div>

      <footer className="mt-12 pt-8 border-t border-gray-100 text-center">
        <p className="mb-5 text-sm text-base-mute">
          如果你准备好了，最好的理解方式不是“继续看说明”，而是亲自完成一次测试。
        </p>
        <PrimaryButton onClick={onStartTest}>开始测试</PrimaryButton>
      </footer>
    </div>
  )
}

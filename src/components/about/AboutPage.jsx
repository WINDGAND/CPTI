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
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-cyan px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-[0.98]"
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
      className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-cyan px-7 py-3 text-sm font-semibold text-brand-cyan transition hover:bg-brand-cyan hover:text-white active:scale-[0.98]"
    >
      {children}
    </button>
  )
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <section className="rounded-card border border-gray-100 bg-white p-5 shadow-card md:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-cyan/10 text-brand-cyan">
          <Icon size={15} aria-hidden />
        </span>
        <h2 className="text-h2">{title}</h2>
      </div>
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
        <h1 className="text-h1">关于 CPTI</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-base-mute">
          CPTI 的核心不是给个人贴标签，而是帮助你们看见关系如何运作。
          <br />
          我们提供一面镜子，协助情侣更理解彼此，而不是评判谁对谁错。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton onClick={onStartTest}>开始测试</PrimaryButton>
          <GhostButton onClick={onGoFAQ}>查看常见问题</GhostButton>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard icon={HeartHandshake} title="我们为什么做 CPTI">
          <p>
            很多人熟悉 MBTI 这类个人测试，但亲密关系里最常见的困惑，往往不是“我是谁”，而是“我们为什么总在同一个点卡住”。
          </p>
          <p>
            CPTI 把关系作为最小分析单位，关注相处模式、表达方式和冲突节奏，帮助你们从“感觉不对”走向“具体可沟通”。
          </p>
        </SectionCard>

        <SectionCard icon={BookOpenText} title="CPTI 如何工作">
          <p>
            测评由四个维度组成，采用 7 点量表（+3 到 -3）记录倾向强度。最终会形成四字母代码和四维光谱，而不是简单二选一。
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DIMENSIONS.map((dimension) => (
              <div key={dimension.code} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                <p className="text-xs font-semibold text-brand-cyan">{dimension.code}</p>
                <p className="mt-0.5 text-sm font-semibold text-base-text">{dimension.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-base-mute">{dimension.desc}</p>
              </div>
            ))}
          </div>
          <p>
            单人模式会得到“你的关系感知画像”，双人拼图会得到“双方合成结果”，并展示最一致与最错位维度。
          </p>
        </SectionCard>

        <SectionCard icon={Compass} title="如何正确使用结果">
          <p>推荐按这三个步骤阅读：</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-base-text">
            <li>先看四维光谱：理解你们分别偏向什么。</li>
            <li>再看类型代码：把模式归纳成可讨论的共同语言。</li>
            <li>重点看一致/错位维度：把它转化为日常沟通动作。</li>
          </ol>
          <p>
            结果最有价值的使用方式，是帮助你们讨论“下次怎么做得更好”，而不是用来给彼此下定论。
          </p>
        </SectionCard>

        <SectionCard icon={ShieldCheck} title="边界、声明与反馈">
          <p>
            CPTI 是关系沟通工具，不是医学或心理诊断。它不能替代专业咨询，也不用于判断关系价值高低。
          </p>
          <p>
            V1.0 以客户端计算为主，优先保证轻量、快速和可分享。你看到的结果基于当前题库与计分逻辑版本。
          </p>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-base-mute">
            <p>版本：V1.0 MVP</p>
            <p>最近更新：2026-04-14</p>
            <p>反馈建议：欢迎通过内测反馈通道提交体验问题与文案建议。</p>
          </div>
        </SectionCard>
      </div>

      <footer className="pt-8 text-center">
        <p className="mb-4 text-sm text-base-mute">
          如果你准备好了，最好的理解方式不是“继续看说明”，而是亲自完成一次测试。
        </p>
        <PrimaryButton onClick={onStartTest}>开始测试</PrimaryButton>
      </footer>
    </div>
  )
}

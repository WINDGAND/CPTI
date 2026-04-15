import { useMemo, useState } from 'react'
import { ChevronDown, ArrowRight } from 'lucide-react'

const FAQ_GROUPS = [
  {
    id: 'macro',
    title: '理解 CPTI（宏观）',
    description: '先理解这套模型在测什么，再看结果会更有方向感。',
    items: [
      {
        id: 'q-what',
        question: 'CPTI 测的到底是什么？和个人 MBTI 有什么不同？',
        answer:
          'CPTI 测的不是“你是什么人”，而是“你们这段关系如何运作”。它把关系当作最小分析单位，关注互动模式、表达方式和冲突处理，而不是给某一个人贴标签。',
        action: '把结果当作沟通起点，而不是给彼此下定义。',
      },
      {
        id: 'q-dimensions',
        question: 'CPTI 的四个维度分别是什么？',
        answer:
          '四个维度是：空间距离（S/I）、情感表达（R/P）、生活节奏（O/F）、冲突解决（D/A）。每个维度都代表关系中的一个核心二元偏好，组合后形成 16 种类型。',
        action: '先看四维百分比，再看四字母代码，你会更容易读懂结果。',
      },
      {
        id: 'q-likert',
        question: '为什么用 7 点量表，而不是二选一？',
        answer:
          '关系体验通常是连续谱，不是非黑即白。7 点量表可以表达“略偏向”与“强偏向”的差异，减少被迫站队，让结果更贴近真实相处状态。',
        action: '作答时优先选“更接近真实”的程度，不用追求极端答案。',
      },
      {
        id: 'q-goodbad',
        question: '分数高低代表关系好坏吗？',
        answer:
          '不代表。CPTI 不评价优劣，只描述倾向。每种类型都有优势和挑战，关键不在“哪种更好”，而在“你们是否理解并管理好自己的模式”。',
        action: '先看“关系优势 + 关系挑战”组合，不要只盯代码本身。',
      },
      {
        id: 'q-diff',
        question: '为什么同一对情侣，双方可能会看到不同结果？',
        answer:
          '因为每个人都在用自己的体感理解同一段关系。视角不同很正常，这正是双人拼图有价值的原因：它能把“我以为”与“你感受到”放在同一张图里对照。',
        action: '把差异当作信息，而不是当作谁对谁错。',
      },
    ],
  },
  {
    id: 'micro',
    title: '使用与操作（微观）',
    description: '这些问题能帮助你顺畅完成测试和分享。',
    items: [
      {
        id: 'q-mode',
        question: '单人速通和双人拼图有什么区别？我该先做哪个？',
        answer:
          '单人速通是你的关系感知版本，适合快速了解自己视角。双人拼图需要双方独立作答，最后会合成真正的 Couple Type，并展示一致与错位维度。推荐先单人，再邀请对方拼图。',
        action: '如果你只做一个版本，优先做双人拼图。',
      },
      {
        id: 'q-invite',
        question: '双人拼图怎么完成？邀请链接怎么用？',
        answer:
          '第一位完成后会生成邀请链接；把链接发给对方，对方打开后会直接进入第二位答题流程。双人链接为一次性令牌，有效期 24 小时；第二位成功提交后链接会立刻失效，系统自动生成双人合成报告。',
        action: '请双方独立作答，不要提前讨论答案；若提示已使用或已过期，请让第一位重新发起。',
      },
      {
        id: 'q-perspective',
        question: '作答时需要站在对方角度吗？',
        answer:
          '不需要。请只按你自己的真实体验作答。CPTI 的价值就在于保留双方主观感受，再通过合成结果看共识和错位。',
        action: '遇到拿不准的题，选“你当下最常见”的状态。',
      },
      {
        id: 'q-alignment',
        question: '“最一致维度 / 最错位维度”在现实里怎么用？',
        answer:
          '最一致维度可以当作你们的关系强项，优先放大；最错位维度通常是误解高发区，建议围绕具体场景做低成本沟通，例如每周一次 10 分钟复盘。',
        action: '优先讨论“下次怎么做”，少讨论“谁更有道理”。',
      },
      {
        id: 'q-display',
        question: '为什么看不到配图或分享效果不一致？',
        answer:
          '常见原因是网络加载慢、图片资源未及时刷新或不同平台压缩策略差异。通常刷新页面、重开链接或稍后再试即可恢复；不影响核心测评结果。',
        action: '保存分享前，先确认页面内容已完整加载。',
      },
    ],
  },
]

function StartTestButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-cyan px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-[0.98]"
    >
      开始测试
      <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
    </button>
  )
}

function FAQItem({ item, expanded, onToggle }) {
  const contentId = `${item.id}-content`
  return (
    <article className="rounded-card border border-gray-100 bg-white shadow-card">
      <h3>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={contentId}
        >
          <span className="text-sm font-semibold leading-relaxed text-base-text">
            {item.question}
          </span>
          <ChevronDown
            className={[
              'h-4 w-4 shrink-0 text-base-mute transition-transform duration-200',
              expanded ? 'rotate-180' : 'rotate-0',
            ].join(' ')}
            aria-hidden
          />
        </button>
      </h3>
      {expanded && (
        <div id={contentId} className="border-t border-gray-100 px-4 py-4">
          <p className="text-sm leading-relaxed text-base-text">{item.answer}</p>
          <p className="mt-2 text-xs leading-relaxed text-base-mute">
            你可以这样做：{item.action}
          </p>
        </div>
      )}
    </article>
  )
}

export default function FAQPage({ onStartTest }) {
  const firstItemId = useMemo(() => FAQ_GROUPS[0]?.items[0]?.id ?? null, [])
  const [expandedId, setExpandedId] = useState(firstItemId)

  function toggleItem(id) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="pb-10">
      <header className="pt-4 pb-6 text-center md:pt-8">
        <h1 className="mt-3 text-h1">关于 CPTI 的高频问题</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-base-mute">
          <span className="block">从产品理念到使用细节，这里整理了最常见的疑问。</span>
          <span className="block">看完后，你会更清楚如何理解结果、如何用结果促进沟通。</span>
        </p>
      </header>

      <div className="space-y-6">
        {FAQ_GROUPS.map((group) => (
          <section key={group.id} className="space-y-3">
            <div>
              <h2 className="text-h2">{group.title}</h2>
              <p className="mt-1 text-sm text-base-mute">{group.description}</p>
            </div>
            <div className="space-y-2.5">
              {group.items.map((item) => (
                <FAQItem
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={() => toggleItem(item.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="pt-8 text-center">
        <p className="mb-4 text-sm text-base-mute">
          准备好了就开始测试，结果会比“只看文字解释”更直观。
        </p>
        <StartTestButton onClick={onStartTest} />
      </footer>
    </div>
  )
}

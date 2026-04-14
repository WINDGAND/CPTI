import { ClipboardList, Sparkles, Share2 } from 'lucide-react'

/**
 * 首页三步引导（对齐 PRD 3.1 流程 + 2.1/2.2/2.3 + 1.4 愿景）
 * 视觉参考：MBTI 类站点「第1步 / 第2步 / 第3步」卡片（顶边色条 + 徽章 + 文案 + 右侧图示）
 */

// 每项 subtitle ≤ 15 字，全部深色文字
const STEPS = [
  {
    step: 1,
    accent: '#4298b4',
    cardTint: 'rgba(66, 152, 180, 0.08)',
    title: '选择模式',
    subtitle: '先看你眼中的我们，或开启双人拼图',
    Icon: ClipboardList,
  },
  {
    step: 2,
    accent: '#33a474',
    cardTint: 'rgba(51, 164, 116, 0.08)',
    title: '生成画像',
    subtitle: '单人看关系感知，双人看最终 Couple Type',
    Icon: Sparkles,
  },
  {
    step: 3,
    accent: '#88619a',
    cardTint: 'rgba(136, 97, 154, 0.08)',
    title: '对照与分享',
    subtitle: '保存结果，也可以邀请对方一起拼出真正的我们',
    Icon: Share2,
  },
]

export default function HomeStepCards() {
  return (
    <section className="w-full mt-2 mb-6" aria-label="使用说明">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-5">
        {STEPS.map((item) => (
          <article
            key={item.step}
            className="relative overflow-hidden rounded-lg shadow-card border border-gray-100/80"
            style={{
              backgroundColor: item.cardTint,
              borderLeftWidth: '3px',
              borderLeftColor: item.accent,
              borderLeftStyle: 'solid',
            }}
          >
            {/* Grid：图标与「徽章 + 同一行文案」垂直居中；文案为「标题：说明」一体黑色 */}
            <div className="relative grid grid-cols-[auto_1fr] gap-x-2.5 px-3.5 py-2.5 md:gap-x-3 md:px-5 md:py-4">
              <div
                className="row-start-1 self-center flex h-8 w-8 shrink-0 items-center justify-center rounded-lg md:h-12 md:w-12 md:rounded-xl"
                style={{ backgroundColor: `${item.accent}18`, color: item.accent }}
                aria-hidden
              >
                <item.Icon strokeWidth={1.5} className="w-4 h-4 md:w-6 md:h-6" />
              </div>

              <div className="row-start-1 min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 md:flex-col md:items-stretch md:gap-1">
                <span
                  className="shrink-0 inline-flex items-center justify-center rounded-full w-5 h-5 text-[10px] font-bold text-white md:w-auto md:h-auto md:px-2 md:py-0.5"
                  style={{ backgroundColor: item.accent }}
                >
                  <span className="md:hidden">{item.step}</span>
                  <span className="hidden md:inline">第{item.step}步</span>
                </span>
                <h2 className="m-0 min-w-0 text-xs font-normal leading-snug text-base-text md:text-sm">
                  <span className="font-bold">{item.title}</span>
                  <span>：{item.subtitle}</span>
                </h2>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

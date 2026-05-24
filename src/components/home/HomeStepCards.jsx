import { ClipboardList, Sparkles, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * 首页三步引导 — 编辑物风格时间线
 * 设计语言：去卡片化 + 大号编号 + hairline 分隔 + 主题色锚点
 */

const STEPS = [
  {
    step: 1,
    accent: '#4298b4',
    accentClass: 'accent-cyan',
    title: '选择模式',
    subtitle: '先看你眼中的我们，或开启双人拼图',
    Icon: ClipboardList,
  },
  {
    step: 2,
    accent: '#33a474',
    accentClass: 'accent-green',
    title: '生成画像',
    subtitle: '单人看关系感知，双人看最终 Couple Type',
    Icon: Sparkles,
  },
  {
    step: 3,
    accent: '#88619a',
    accentClass: 'accent-purple',
    title: '对照与分享',
    subtitle: '保存结果，邀请对方拼出真正的我们',
    Icon: Share2,
  },
]

export default function HomeStepCards() {
  return (
    <section className="w-full mt-2 mb-6" aria-label="使用说明">
      {/* eyebrow */}
      <div className="mb-3 flex items-center gap-2 px-0.5">
        <span className="text-eyebrow">How it works</span>
        <span className="h-px flex-1 bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 md:gap-x-8">
        {STEPS.map((item, idx) => (
          <motion.article
            key={item.step}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: idx * 0.08, ease: [0.16, 0.84, 0.34, 1] }}
            className={[
              item.accentClass,
              'relative py-3 md:py-2',
              idx > 0 ? 'border-t border-gray-100 md:border-t-0' : '',
            ].join(' ')}
          >
            <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 md:block">
              {/* 大号编号 + 左侧短色条（桌面端） */}
              <div className="flex items-baseline gap-2 md:mb-2">
                <span
                  className="ed-numeral text-3xl md:text-5xl"
                  style={{ color: item.accent }}
                >
                  0{item.step}
                </span>
                <span
                  className="hidden md:block h-[2px] w-8 rounded-full"
                  style={{ background: item.accent, opacity: 0.85 }}
                  aria-hidden
                />
                <item.Icon
                  className="md:hidden ml-auto h-4 w-4"
                  style={{ color: item.accent }}
                  strokeWidth={2}
                  aria-hidden
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 md:mb-1">
                  <h3 className="text-sm md:text-[15px] font-bold leading-snug text-base-text">
                    {item.title}
                  </h3>
                  <item.Icon
                    className="hidden md:block h-3.5 w-3.5"
                    style={{ color: item.accent }}
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
                <p className="text-xs md:text-[13px] leading-relaxed text-base-mute">
                  {item.subtitle}
                </p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

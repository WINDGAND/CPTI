import { ClipboardList, Sparkles, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '../../i18n/LanguageContext'

/**
 * 首页三步引导 — 编辑物风格时间线
 * 设计语言：去卡片化 + 大号编号 + hairline 分隔 + 主题色锚点
 */

const STEP_META = [
  { step: 1, accent: '#4298b4', accentClass: 'accent-cyan', titleKey: 'home.step1_title', subtitleKey: 'home.step1_subtitle', Icon: ClipboardList },
  { step: 2, accent: '#33a474', accentClass: 'accent-green', titleKey: 'home.step2_title', subtitleKey: 'home.step2_subtitle', Icon: Sparkles },
  { step: 3, accent: '#88619a', accentClass: 'accent-purple', titleKey: 'home.step3_title', subtitleKey: 'home.step3_subtitle', Icon: Share2 },
]

export default function HomeStepCards() {
  const { t } = useLanguage()
  const STEPS = STEP_META.map((s) => ({
    ...s,
    title: t(s.titleKey),
    subtitle: t(s.subtitleKey),
  }))
  return (
    <section className="home-steps w-full mt-0.5 mb-1.5 md:mb-1" aria-label={t('home.steps_aria')}>
      {/* eyebrow */}
      <div className="mb-1.5 flex items-center gap-2 px-0.5">
        <span className="text-eyebrow">{t('home.how_eyebrow')}</span>
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
              'group relative py-1 md:py-0.5',
              idx > 0 ? 'border-t border-gray-100 md:border-t-0' : '',
            ].join(' ')}
          >
            <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 md:block">
              {/* 大号编号 + 左侧短色条（桌面端） */}
              <div className="flex items-baseline gap-2 md:mb-1">
                <span
                  className="home-step-num ed-numeral text-2xl md:text-[30px] leading-none transition-transform duration-300 ease-out md:group-hover:-translate-y-0.5 md:group-hover:scale-110"
                  style={{ color: item.accent }}
                >
                  0{item.step}
                </span>
                <span
                  className="hidden md:block h-[2px] w-8 rounded-full transition-all duration-300 ease-out md:group-hover:w-11"
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
                <div className="flex items-center gap-2 md:mb-0.5">
                  <h3 className="text-sm md:text-[15px] font-bold leading-snug text-base-text transition-colors duration-200 md:group-hover:text-black">
                    {item.title}
                  </h3>
                  <item.Icon
                    className="hidden md:block h-3.5 w-3.5 transition-transform duration-300 ease-out md:group-hover:rotate-6 md:group-hover:scale-110"
                    style={{ color: item.accent }}
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
                <p className="text-xs md:text-[13px] leading-snug text-base-mute">
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

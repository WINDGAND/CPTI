import { motion } from 'framer-motion'
import { ArrowRight, BookOpenText, Compass, Github, HeartHandshake, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'
import { GITHUB_REPO_URL } from '../../utils/site'

// 分区滚动入场（与结果页/类型页/统计页同一套曲线）
const sectionReveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.5, ease: [0.16, 0.84, 0.34, 1] },
}

// 四大 CPTI 维度各对应一个品牌色，替代统一 brand-cyan
const DIMENSION_ACCENTS = ['#F4A7B0', '#76B8E0', '#B8A0D0', '#8ED6B4']

function getDimensions(t) {
  return [
    { code: 'S / I', title: t('dim.SI.title'), desc: t('dim.SI.desc'), accent: DIMENSION_ACCENTS[0] },
    { code: 'R / P', title: t('dim.RP.title'), desc: t('dim.RP.desc'), accent: DIMENSION_ACCENTS[1] },
    { code: 'O / F', title: t('dim.OF.title'), desc: t('dim.OF.desc'), accent: DIMENSION_ACCENTS[2] },
    { code: 'D / A', title: t('dim.DA.title'), desc: t('dim.DA.desc'), accent: DIMENSION_ACCENTS[3] },
  ]
}

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
    <motion.section {...sectionReveal} className="relative pl-4 md:pl-5 py-1">
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
    </motion.section>
  )
}

export default function AboutPage({ onStartTest, onGoFAQ }) {
  const { t } = useLanguage()
  const DIMENSIONS = getDimensions(t)
  const useSteps = [t('help.use_step1'), t('help.use_step2'), t('help.use_step3')]
  return (
    <div className="pb-10">
      <header className="pt-4 pb-7 text-center md:pt-8">
        <motion.div
          className="spectrum-ribbon mx-auto mb-5 h-[6px] w-28 rounded-full"
          initial={{ opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 0.84, 0.34, 1] }}
          aria-hidden
        />
        <p className="text-eyebrow">{t('help.about_eyebrow')}</p>
        <h1 className="mt-2 text-2xl md:text-[30px] font-extrabold leading-tight text-base-text">{t('help.about_title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-base-mute">
          {t('help.about_subtitle_line1')}
          <br />
          {t('help.about_subtitle_line2')}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton onClick={onStartTest}>{t('common.start_test')}</PrimaryButton>
          <GhostButton onClick={onGoFAQ}>{t('help.view_faq')}</GhostButton>
        </div>
      </header>

      {/* 4 大 section 改为双列编辑物专栏 — 去卡片化 */}
      <div className="grid grid-cols-1 gap-y-9 gap-x-10 lg:grid-cols-2 lg:gap-y-12 border-t border-gray-100 pt-8">
        <EditorialSection
          icon={HeartHandshake}
          eyebrow={t('help.why_eyebrow')}
          title={t('help.why_title')}
          accent="#F4A7B0"
        >
          <p>{t('help.why_p1')}</p>
          <p>{t('help.why_p2')}</p>
        </EditorialSection>

        <EditorialSection
          icon={BookOpenText}
          eyebrow={t('help.how_eyebrow')}
          title={t('help.how_title')}
          accent="#76B8E0"
        >
          <p>{t('help.how_p1')}</p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 mt-3 mb-2">
            {DIMENSIONS.map((dimension) => (
              <div key={dimension.code} className="relative pl-3 py-1">
                <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full" style={{ backgroundColor: dimension.accent }} aria-hidden />
                <p className="font-display text-[11px] font-bold tracking-wider" style={{ color: dimension.accent }}>{dimension.code}</p>
                <p className="mt-0.5 text-sm font-semibold text-base-text">{dimension.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-base-mute">{dimension.desc}</p>
              </div>
            ))}
          </div>
          <p>{t('help.how_p2')}</p>
        </EditorialSection>

        <EditorialSection
          icon={Compass}
          eyebrow={t('help.use_eyebrow')}
          title={t('help.use_title')}
          accent="#8ED6B4"
        >
          <p>{t('help.use_p1')}</p>
          <ol className="space-y-2 mt-1">
            {useSteps.map((step, idx) => (
              <li key={idx} className="flex items-baseline gap-2.5">
                <span className="font-display text-xs font-black tabular-nums text-mint shrink-0 w-5" style={{ color: '#5fb892' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-sm leading-relaxed text-base-text">{step}</span>
              </li>
            ))}
          </ol>
          <p>{t('help.use_p2')}</p>
        </EditorialSection>

        <EditorialSection
          icon={ShieldCheck}
          eyebrow={t('help.discl_eyebrow')}
          title={t('help.discl_title')}
          accent="#B8A0D0"
        >
          <p>{t('help.discl_p1')}</p>
          <p>{t('help.discl_p2')}</p>
          <div className="mt-2 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3 text-[11px] text-base-mute font-display tabular-nums">
            <div>
              <p className="text-eyebrow-mute mb-0.5">{t('help.discl_version_label')}</p>
              <p>{t('help.discl_version_value')}</p>
            </div>
            <div>
              <p className="text-eyebrow-mute mb-0.5">{t('help.discl_updated_label')}</p>
              <p>{t('help.discl_updated_value')}</p>
            </div>
            <div>
              <p className="text-eyebrow-mute mb-0.5">{t('help.discl_feedback_label')}</p>
              <p>{t('help.discl_feedback_value')}</p>
            </div>
          </div>
        </EditorialSection>
      </div>

      <footer className="mt-12 pt-8 border-t border-gray-100 text-center">
        <p className="mb-5 text-sm text-base-mute">
          {t('help.about_footer_text')}
        </p>
        <PrimaryButton onClick={onStartTest}>{t('common.start_test')}</PrimaryButton>
        <div className="mt-6">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] text-base-mute transition-colors hover:text-brand-cyan"
          >
            <Github size={14} aria-hidden />
            {t('help.about_github_link')}
          </a>
        </div>
      </footer>
    </div>
  )
}

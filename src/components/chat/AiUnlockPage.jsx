/**
 * AI 关系助手解锁页：无完整测评结果时，在首页 AI Tab 展示能力说明并引导开测。
 *
 * 有结果时由 App 直接进 AiRelationshipPage，本页不会渲染。
 * 文案走 i18n（ai.*）；本文件不读写 localStorage、不发网络请求。
 */
import { motion } from 'framer-motion'
import { ArrowRight, MessageCircleHeart, Sparkles } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

// 恋爱四色（替代原 MBTI 工具色序号），与空状态/分享海报同一套光谱语言
const FEATURE_ACCENTS = ['#F4A7B0', '#76B8E0', '#B8A0D0']

/**
 * 解锁说明：三列能力要点 + CTA 回问卷开测。
 *
 * @param {object} props
 * @param {function(): void} props.onStartTest 切到答题首页
 * @returns {JSX.Element}
 * 副作用：无 localStorage、无网络
 */
export default function AiUnlockPage({ onStartTest }) {
  const { t } = useLanguage()
  const FEATURES = [
    ['01', t('ai.feature1_title'), t('ai.feature1_desc')],
    ['02', t('ai.feature2_title'), t('ai.feature2_desc')],
    ['03', t('ai.feature3_title'), t('ai.feature3_desc')],
  ]
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
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_8px_30px_-12px_rgba(118,184,224,0.6)]"
              style={{
                color: '#76B8E0',
                boxShadow: '0 8px 30px -12px rgba(118,184,224,0.6), inset 0 0 0 1px color-mix(in srgb, #76B8E0 22%, transparent)',
              }}
            >
              <MessageCircleHeart size={24} aria-hidden />
            </span>
          </div>

          <p className="text-eyebrow inline-flex items-center gap-1.5">
            <Sparkles size={12} aria-hidden />
            {t('ai.eyebrow')}
          </p>

          <motion.h1
            className="mt-3 font-extrabold leading-tight text-base-text text-2xl md:text-[34px]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 0.84, 0.34, 1] }}
          >
            {t('ai.title')}
          </motion.h1>

          <motion.p
            className="mx-auto mt-4 max-w-xl text-sm leading-7 text-base-mute"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 0.84, 0.34, 1] }}
          >
            {t('ai.desc')}
          </motion.p>

          <motion.button
            type="button"
            onClick={onStartTest}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 0.84, 0.34, 1] }}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(90deg, #F4A7B0, #76B8E0, #B8A0D0, #8ED6B4)',
              boxShadow: '0 12px 30px -12px rgba(118,184,224,0.7)',
            }}
          >
            {t('ai.cta')}
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </motion.button>
        </div>
      </section>

      {/* 3 列编辑物风格说明 — 去卡片化 */}
      <section className="border-t border-gray-100 pt-7">
        <p className="text-eyebrow-mute mb-5 px-0.5">{t('ai.why_eyebrow')}</p>
        <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-3 md:divide-x md:divide-gray-100">
          {FEATURES.map(([num, title, desc], idx) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.4, ease: [0.16, 0.84, 0.34, 1], delay: idx * 0.08 }}
              className={[
                'relative',
                idx > 0 ? 'pt-6 border-t border-gray-100 md:pt-0 md:border-t-0 md:pl-8' : 'md:pr-8',
              ].join(' ')}
            >
              <span
                className="ed-numeral text-3xl md:text-4xl"
                style={{ color: FEATURE_ACCENTS[idx % FEATURE_ACCENTS.length] }}
              >
                {num}
              </span>
              <h2 className="mt-2 text-sm font-bold text-base-text">{title}</h2>
              <p className="mt-1.5 text-xs leading-6 text-base-mute">{desc}</p>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  )
}

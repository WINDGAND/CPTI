/**
 * 16 种情侣类型总览：按四大色系全宽色带排列，点击插图打开灯箱。
 *
 * 插图优先 WebP、失败回退 PNG；首屏 4 张 eager，其余 lazy。
 * 文案走 i18n；本页不读写 localStorage。
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { TYPE_GROUP_ORDER } from '../../data/typeGroups'
import { getTypeListingIntro } from '../../utils/typeListing'
import { getTypeImageSources } from '../../data/typeImages'
import { recordImageMetric } from '../../utils/imageMetrics'
import { useLanguage } from '../../i18n/LanguageContext'
import { useLocalizedResults, useLocalizedTypeGroupMeta } from '../../i18n/useLocalizedData'
import TypeImageLightbox from './TypeImageLightbox'

/** 分区滚动入场（与结果页同一套曲线） */
const sectionReveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.5, ease: [0.16, 0.84, 0.34, 1] },
}

function StartTestButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-cyan px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-[0.98]"
    >
      {label}
      <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
    </button>
  )
}

/**
 * 类型卡插图：优先 WebP，加载失败再试 PNG；两次都失败显示占位块。
 * 成功 / 失败都会写入 window 上的图片指标（无 localStorage）。
 *
 * @param {object} props
 * @param {string} props.code 四字母类型码
 * @param {boolean} [props.priority=false] 为首屏卡时 eager + high fetchpriority
 * @returns {JSX.Element}
 */
function TypeIllustration({ code, priority = false }) {
  const sources = getTypeImageSources(code)
  const [src, setSrc] = useState(sources.webp)
  const [loaded, setLoaded] = useState(false)
  const [fallbackTried, setFallbackTried] = useState(false)
  const [broken, setBroken] = useState(false)
  const startTsRef = useRef(performance.now())

  useEffect(() => {
    const next = getTypeImageSources(code)
    setSrc(next.webp)
    setLoaded(false)
    setFallbackTried(false)
    setBroken(false)
    startTsRef.current = performance.now()
  }, [code])

  function handleLoad() {
    setLoaded(true)
    recordImageMetric({
      page: 'types',
      code,
      status: fallbackTried ? 'fallback-success' : 'success',
      durationMs: Math.round(performance.now() - startTsRef.current),
      src,
    })
  }

  function handleError() {
    // 第一次失败切 PNG；第二次仍失败才标 broken，避免裂图
    if (!fallbackTried) {
      setFallbackTried(true)
      setSrc(getTypeImageSources(code).png)
      return
    }
    setLoaded(true)
    setBroken(true)
    recordImageMetric({
      page: 'types',
      code,
      status: 'failed',
      durationMs: Math.round(performance.now() - startTsRef.current),
      src,
    })
  }

  if (broken) {
    return (
      <div
        className="w-full max-w-[240px] aspect-[4/5] rounded-xl border border-base-text/10 bg-white/30 flex items-center justify-center mb-4 mx-auto"
        aria-label={code}
      >
        <div className="h-10 w-10 rounded-lg bg-base-text/10" />
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-[240px] aspect-[4/5] mx-auto rounded-xl overflow-hidden bg-white/25 shadow-md ring-1 ring-black/[0.05] transition-transform duration-300 ease-out group-hover:scale-[1.03] group-hover:shadow-lg">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-white/50" aria-hidden />
      )}
      <img
        src={src}
        alt={code}
        className="h-full w-full object-cover object-center"
        style={{ opacity: loaded ? 1 : 0 }}
        loading={priority ? 'eager' : 'lazy'}
        fetchpriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

/**
 * 情侣类型总览页：色带斜切衔接、系列水印、点击插图打开 TypeImageLightbox。
 *
 * @param {object} props
 * @param {function(): void} props.onStartTest 页头/页脚 CTA，切回答题首页
 * @returns {JSX.Element}
 * 副作用：插图加载会 recordImageMetric；无 localStorage、无业务网络请求
 */
export default function CoupleTypesPage({ onStartTest }) {
  const { t } = useLanguage()
  const RESULTS = useLocalizedResults()
  const TYPE_GROUP_META = useLocalizedTypeGroupMeta()
  const [previewType, setPreviewType] = useState(null)
  const byGroup = TYPE_GROUP_ORDER.reduce((acc, key) => {
    acc[key] = RESULTS.filter((r) => r.group === key)
    return acc
  }, {})

  return (
    <div className="pb-12 bg-base-card">
      <header className="text-center -mx-4 px-4 pt-8 pb-8 md:pt-12 md:pb-10 bg-base-card">
        {/* 光谱钩子：与首页 spectrum-ribbon 呼应，先给视觉记忆点 */}
        <div className="spectrum-ribbon mx-auto mb-5 h-[6px] w-28 rounded-full" aria-hidden />
        <h1 className="text-3xl md:text-5xl font-extrabold text-base-text tracking-tight">
          {t('types.title')}
        </h1>
        <p className="mt-3 text-sm md:text-base text-base-mute max-w-xl mx-auto leading-relaxed">
          {t('types.slogan')}
        </p>
        <div className="mt-8 flex justify-center">
          <StartTestButton onClick={onStartTest} label={t('common.start_test')} />
        </div>
      </header>

      <div className="cpti-types-bleed">
        {TYPE_GROUP_ORDER.map((groupCode, index) => {
          const meta = TYPE_GROUP_META[groupCode]
          const types = byGroup[groupCode] ?? []
          const isFirstBand = index === 0
          const angled = index > 0
          // 偶数带反向斜切，色带左右交错咬合
          const angleFlip = index % 2 === 0
          const angleClass = angled
            ? angleFlip
              ? 'cpti-types-band-angle-reverse'
              : 'cpti-types-band-angle'
            : ''

          return (
            <motion.section
              key={groupCode}
              {...sectionReveal}
              className={[
                'relative z-0 overflow-hidden px-4 pb-8 md:px-6 md:pb-10',
                isFirstBand && 'cpti-types-first-zigzag',
                angleClass,
              ].filter(Boolean).join(' ')}
              style={{
                zIndex: index + 1,
                backgroundColor: `color-mix(in srgb, ${meta.accent} 18%, white)`,
                // 首屏色带始终渲染；其余用 content-visibility 跳过屏外布局，900px 作预估高度防跳动
                contentVisibility: index === 0 ? 'visible' : 'auto',
                containIntrinsicSize: index === 0 ? undefined : '900px',
              }}
              aria-label={`${meta.label} ${meta.subtitle}`}
            >
              <div className="relative z-[1] mx-auto max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] pt-1 md:pt-2 lg:px-4 xl:px-8">
                {/* 系列水印：顶栏居中、占文档流，避免与卡片重叠 */}
                <p
                  className="text-center text-[clamp(2rem,6.25vw,3.5rem)] font-black leading-tight tracking-tight select-none mb-4 md:mb-5"
                  style={{
                    color: `color-mix(in srgb, ${meta.accent} 38%, transparent)`,
                  }}
                  aria-hidden
                >
                  {meta.label}
                </p>
                <p className="text-sm text-base-mute max-w-2xl mx-auto leading-relaxed text-center">
                  {meta.desc}
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-x-10 sm:gap-y-10 lg:gap-x-12 xl:gap-x-16 lg:gap-y-8">
                  {types.map((type, itemIdx) => (
                    <motion.article
                      key={type.code}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{
                        duration: 0.5,
                        ease: [0.16, 0.84, 0.34, 1],
                        delay: (itemIdx % 4) * 0.06,
                      }}
                      className="group flex flex-col items-center text-center lg:min-w-0 lg:px-1 xl:px-2"
                    >
                      {/* 身份层：代码为锚点（MBTI 习惯），类型名是主标题 */}
                      <p
                        className="mb-2 text-xs font-black uppercase tracking-[0.18em]"
                        style={{ color: meta.accent }}
                      >
                        {type.code}
                      </p>
                      <h3 className="text-lg font-bold leading-snug text-center text-base-text">
                        {type.title}
                      </h3>

                      {/* 图片：点击放大查看（灯箱），悬浮仅保留轻微放大反馈 */}
                      <button
                        type="button"
                        onClick={() => setPreviewType(type)}
                        aria-label={t('types.card_view_aria').replace('{title}', type.title)}
                        className="relative mt-3 mb-4 w-full max-w-[240px] cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <TypeIllustration
                          code={type.code}
                          // 仅第一色带前 4 张 eager，避免 16 张同时抢带宽
                          priority={index === 0 && itemIdx < 4}
                        />
                      </button>

                      <p className="text-sm text-base-mute leading-relaxed text-center w-full max-w-[15.5rem] sm:max-w-[17rem] lg:max-w-[15rem] xl:max-w-[16rem] mx-auto">
                        {getTypeListingIntro(type, { emptyFallback: t('types.listing_empty') })}
                      </p>
                    </motion.article>
                  ))}
                </div>
              </div>
            </motion.section>
          )
        })}
      </div>

      <footer className="flex justify-center pt-10 pb-4">
        <StartTestButton onClick={onStartTest} label={t('common.start_test')} />
      </footer>

      <AnimatePresence>
        {previewType && (
          <TypeImageLightbox type={previewType} onClose={() => setPreviewType(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

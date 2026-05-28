import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Zap,
  BatteryLow,
  Lightbulb,
  Compass,
  MessageCircleHeart,
  Sparkles,
} from 'lucide-react'
import { DIMENSION_DETAILS, getResultByCode } from '../utils/scoring'
import { createDualInviteLink, createSingleShareLink, INVITE_SCHEMA_VERSION } from '../utils/inviteCodec'
import { QUESTIONS } from '../data/questions'
import { getTypeImageSources } from '../data/typeImages'
import { recordImageMetric } from '../utils/imageMetrics'
import { createDualInvite } from '../utils/statsApi'
import { useLanguage } from '../i18n/LanguageContext'
import { useLocalizedResultByCode } from '../i18n/useLocalizedData'

/**
 * ResultPoster — 多分节深度报告页（8 个分区）
 *
 * Props:
 *   result      — RESULTS_MAP 中对应记录
 *   percentages — { S, I, R, P, O, F, D, A }
 *   onRestart   — 重新测试回调
 */

const DIMENSION_ROWS = Object.values(DIMENSION_DETAILS)

/** 统一分区头：编号圈 + 标题 + 主题色细线 */
function SectionHeader({ num, title }) {
  return (
    <div className="result-section-header flex items-center gap-3">
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: 'var(--poster-accent)' }}
      >
        {num}
      </span>
      <h3 className="text-base font-bold text-base-text shrink-0">{title}</h3>
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: 'var(--poster-accent)', opacity: 0.25 }}
      />
    </div>
  )
}

/** 分区之间的间距分隔 */
function Divider() {
  return <div className="result-divider" />
}

function getLocalizedDim(t, row) {
  const k = `${row.posKey}${row.negKey}`
  return {
    posKey: row.posKey,
    negKey: row.negKey,
    title: t(`dim.${k}.title`, { fallback: row.title }),
    posLabel: t(`dim.${k}.posLabel`, { fallback: row.posLabel }),
    negLabel: t(`dim.${k}.negLabel`, { fallback: row.negLabel }),
  }
}

function renderSpectrum(percentages, t) {
  return (
    <div className="space-y-4">
      {DIMENSION_ROWS.map((row) => {
        const { posKey, negKey, posLabel, negLabel, title } = getLocalizedDim(t, row)
        const posVal = percentages[posKey] ?? 50
        const negVal = percentages[negKey] ?? 50
        return (
          <div key={posKey} className="space-y-1">
            <div className="text-[11px] text-base-mute font-medium">{title}</div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span
                className="text-xs font-semibold w-10 sm:w-12 text-right shrink-0"
                style={{ color: 'var(--poster-accent)' }}
              >
                {posLabel}
              </span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden min-w-0">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: 'var(--poster-accent)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${posVal}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                />
              </div>
              <span className="text-xs font-medium w-10 sm:w-12 shrink-0 text-base-mute">
                {negLabel}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-base-mute/70 px-[44px] sm:px-14">
              <span>{posVal}%</span>
              <span>{negVal}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ResultHeroIllustration({ code }) {
  const [src, setSrc] = useState(() => getTypeImageSources(code).webp)
  const [loaded, setLoaded] = useState(false)
  const [fallbackTried, setFallbackTried] = useState(false)
  const [broken, setBroken] = useState(false)
  const startTsRef = useRef(performance.now())

  useEffect(() => {
    const { webp } = getTypeImageSources(code)
    setSrc(webp)
    setLoaded(false)
    setFallbackTried(false)
    setBroken(false)
    startTsRef.current = performance.now()
  }, [code])

  function handleLoad() {
    setLoaded(true)
    recordImageMetric({
      page: 'result',
      code,
      status: fallbackTried ? 'fallback-success' : 'success',
      durationMs: Math.round(performance.now() - startTsRef.current),
      src,
    })
  }

  function handleError() {
    if (!fallbackTried) {
      setFallbackTried(true)
      setSrc(getTypeImageSources(code).png)
      return
    }
    setBroken(true)
    setLoaded(true)
    recordImageMetric({
      page: 'result',
      code,
      status: 'failed',
      durationMs: Math.round(performance.now() - startTsRef.current),
      src,
    })
  }

  if (broken) {
    return (
      <div
        className="w-full max-w-[280px] lg:max-w-[340px] aspect-[4/5] rounded-2xl border border-white/20 bg-white/10 flex items-center justify-center mx-auto lg:mx-0"
        aria-hidden
      >
        <div className="h-12 w-12 rounded-xl bg-white/20" />
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-[280px] lg:max-w-[340px] aspect-[4/5] mx-auto lg:mx-0 rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/20 bg-white/10">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-white/20" aria-hidden />
      )}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover object-center"
        style={{ opacity: loaded ? 1 : 0 }}
        loading="eager"
        fetchpriority="high"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

export default function ResultPoster({ resultData, onRestart, onOpenAi }) {
  const { t } = useLanguage()
  const posterRef = useRef(null)
  const [nickname1, setNickname1] = useState('')
  const [nickname2, setNickname2] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [singleInviteLink, setSingleInviteLink] = useState('')
  const [singleInviteError, setSingleInviteError] = useState('')
  const [singleInviteLoading, setSingleInviteLoading] = useState(false)

  const isDualMode = resultData.mode === 'dual'
  const perception = resultData.perception
  const relationship = resultData.relationship
  const primaryProfile = isDualMode ? relationship : perception
  const rawResult = primaryProfile.result
  // 用 i18n hook 选当前语言对应的 result 文案；如果取不到，fallback 到原始（中文）数据
  const localizedResult = useLocalizedResultByCode(rawResult?.code)
  const result = localizedResult || rawResult
  const percentages = primaryProfile.percentages
  const modeKey = isDualMode ? 'dual' : 'single'
  const resultIntro = result.introByMode?.[modeKey]
  const differenceHint = result.differenceHintByMode?.[modeKey]
  const soulmateResult = useLocalizedResultByCode(result.soulmate) || getResultByCode(result.soulmate)
  const nemesisResult  = useLocalizedResultByCode(result.nemesis)  || getResultByCode(result.nemesis)

  const n1 = nickname1.trim() || t('result.nickname_default_other')
  const n2 = nickname2.trim() || t('result.nickname_default_self')
  const canGenerateSinglePoster = nickname2.trim().length > 0
  const fromDualPreview = (() => {
    if (typeof window === 'undefined') return false
    try {
      return new URLSearchParams(window.location.search).get('fromDualPreview') === '1'
    } catch {
      return false
    }
  })()

  useEffect(() => {
    if (!inviteCopied) return undefined
    const timer = setTimeout(() => setInviteCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [inviteCopied])

  useEffect(() => {
    if (!shareCopied) return undefined
    const timer = setTimeout(() => setShareCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [shareCopied])

  function handleGenerate() {
    if (!isDualMode && !canGenerateSinglePoster) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleCopySingleInvite() {
    if (!isDualMode && !perception?.sourceAnswers) return

    let link = singleInviteLink
    if (!link) {
      try {
        setSingleInviteLoading(true)
        setSingleInviteError('')
        const created = await createDualInvite({
          answersA: perception.sourceAnswers,
          questionCount: QUESTIONS.length,
          schemaVersion: INVITE_SCHEMA_VERSION,
          ttlHours: 24,
        })
        link = createDualInviteLink(created.token)
        setSingleInviteLink(link)
      } catch (error) {
        setSingleInviteError(error?.message || t('result.invite_copy_failed_dual'))
        return
      } finally {
        setSingleInviteLoading(false)
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        window.prompt(t('result.invite_clipboard_prompt_dual'), link)
      }
      setInviteCopied(true)
    } catch {
      window.prompt(t('result.invite_clipboard_prompt_dual'), link)
      setInviteCopied(true)
    }
  }

  async function handleCopySingleShareLink() {
    if (isDualMode || !perception?.sourceAnswers) return
    let link = ''
    try {
      link = createSingleShareLink(QUESTIONS, perception.sourceAnswers)
    } catch {
      setSingleInviteError(t('result.invite_copy_failed_single'))
      return
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        window.prompt(t('result.invite_clipboard_prompt_single'), link)
      }
      setShareCopied(true)
    } catch {
      window.prompt(t('result.invite_clipboard_prompt_single'), link)
      setShareCopied(true)
    }
  }

  return (
    <div className="w-full max-w-none mx-auto pb-16">
      {!isDualMode && fromDualPreview && (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">{t('result.from_dual_preview_title')}</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800/90">
            {t('result.from_dual_preview_desc')}
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          海报主体（供 html2canvas 截图）
      ══════════════════════════════════════════════ */}
      <div ref={posterRef} className={`cpti-poster ${result.themeClass}`}>

        <div
          className="cpti-result-hero-bleed hero-band-reveal shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--poster-accent) 48%, #221e2e)',
          }}
        >
          <div className="mx-auto max-w-6xl xl:max-w-7xl 2xl:max-w-[min(100%,90rem)] px-4 md:px-8 lg:px-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-14 pt-8 pb-2 md:pt-12 md:pb-3">
            <div className="text-center lg:text-left space-y-2 md:space-y-3 lg:max-w-xl shrink-0">
              <motion.p
                className="font-display text-[11px] uppercase tracking-[0.22em] text-white/85"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                {isDualMode ? t('result.eyebrow_dual') : t('result.eyebrow_single')}
              </motion.p>
              <p className="text-sm sm:text-base font-semibold text-white leading-snug break-words">
                {isDualMode
                  ? t('result.hero_dual_template', { n1, n2 })
                  : t('result.hero_single_template', { n2 })}
              </p>
              {/* 字母代码 — 逐字 stagger 入场 */}
              <div className="font-display text-[48px] min-[360px]:text-[56px] sm:text-[64px] lg:text-[80px] font-black leading-none tracking-[0.06em] text-white pt-1 drop-shadow-sm flex justify-center lg:justify-start">
                {result.code.split('').map((letter, idx) => (
                  <motion.span
                    key={`${letter}-${idx}`}
                    initial={{ opacity: 0, y: 20, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      delay: 0.5 + idx * 0.08,
                      duration: 0.5,
                      ease: [0.16, 1.2, 0.34, 1],
                    }}
                    className="inline-block"
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
              <motion.h2
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.45 }}
              >
                {result.title}
              </motion.h2>
              <motion.p
                className="text-sm sm:text-base text-white/85 italic max-w-prose mx-auto lg:mx-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.05, duration: 0.4 }}
              >
                {result.slogan}
              </motion.p>
            </div>
            <div className="flex justify-center lg:justify-end lg:flex-1 min-w-0 pb-2">
              <ResultHeroIllustration code={result.code} />
            </div>
          </div>
        </div>

        <div
          className="pt-8 md:pt-10 lg:pt-12 -mx-4 px-4 sm:mx-0 sm:px-0 md:px-0"
          style={{ backgroundColor: 'var(--poster-bg)' }}
        >
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-10 xl:gap-x-14 lg:items-start">
            <div className="lg:col-span-8 order-1">
              <SectionHeader num="①" title={t('result.section_profile')} />

              <div className="rounded-xl border border-gray-100 bg-gray-50/90 px-4 py-3 text-left mb-5">
                <p className="text-xs font-semibold text-base-text">
                  {isDualMode ? t('result.intro_dual_title') : t('result.intro_single_title')}
                </p>
                <p className="result-prose-muted mt-2">
                  {resultIntro ?? (isDualMode
                    ? t('result.intro_dual_fallback')
                    : t('result.intro_single_fallback'))}
                </p>
              </div>

              <div className="result-list text-left">
                {result.description.map((line, i) => (
                  <p key={i} className="result-prose">
                    {line}
                  </p>
                ))}
              </div>

              <Divider />
            </div>

            <aside className="lg:col-span-4 order-2 lg:sticky lg:top-24 lg:self-start mb-8 lg:mb-0 rounded-xl border border-gray-100/80 bg-base-card/80 p-4 md:p-5 shadow-sm backdrop-blur-sm">
              <SectionHeader num="②" title={isDualMode ? t('result.section_spectrum_dual') : t('result.section_spectrum_single')} />
              {renderSpectrum(percentages, t)}
            </aside>

            <div className="lg:col-span-8 order-3 space-y-0 lg:col-start-1">
        {isDualMode && (
          <>
            <Divider />
            <SectionHeader num="③" title={t('result.section_alignment')} />
            <div className="result-list">
              <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-green-600" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-green-700">
                    {t('result.most_aligned')}
                  </span>
                </div>
                <p className="text-sm font-semibold text-base-text">
                  {(() => {
                    const dim = resultData.alignment.mostAlignedDimension
                    const k = `${dim.posKey}${dim.negKey}`
                    return t(`dim.${k}.title`, { fallback: dim.title })
                  })()}
                </p>
                <p className="result-prose-muted mt-2">
                  {t('result.aligned_template', { consensus: resultData.alignment.mostAlignedDimension.consensus })}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    {t('result.most_misaligned')}
                  </span>
                </div>
                <p className="text-sm font-semibold text-base-text">
                  {(() => {
                    const dim = resultData.alignment.mostMisalignedDimension
                    const k = `${dim.posKey}${dim.negKey}`
                    return t(`dim.${k}.title`, { fallback: dim.title })
                  })()}
                </p>
                <p className="result-prose-muted mt-2">
                  {differenceHint ?? t('result.misaligned_fallback')}
                </p>
              </div>
            </div>

            <Divider />
            <SectionHeader num="④" title={t('result.section_perspectives')} />
            <div className="result-list">
              {resultData.players.map((player, idx) => (
                <div key={player.id} className="rounded-xl border border-gray-100 bg-white/90 p-4">
                  <p className="text-xs font-semibold text-base-mute">{t('result.perspective_player_n', { n: idx + 1 })}</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-base-text">{player.code}</p>
                      <p className="text-xs text-base-mute">{player.result?.title}</p>
                    </div>
                    <p className="result-prose-muted">{t('result.perspective_subjective')}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Divider />

        {/* ── ③/⑤ 关系优势 ────────────────────────────── */}
        <SectionHeader num={isDualMode ? '⑤' : '③'} title={t('result.section_strengths')} />

        <div className="result-list">
          {result.strengths.map(({ title, desc }, i) => (
            <motion.div
              key={i}
              className="flex gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <CheckCircle2 size={18} className="shrink-0 mt-1" style={{ color: 'var(--poster-accent)' }} />
              <div className="min-w-0">
                <p className="result-item-title">{title}</p>
                <p className="result-item-desc">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <Divider />

        {/* ── ④/⑥ 关系挑战 ────────────────────────────── */}
        <SectionHeader num={isDualMode ? '⑥' : '④'} title={t('result.section_challenges')} />

        <div className="result-list">
          {result.challenges.map(({ title, desc }, i) => (
            <motion.div
              key={i}
              className="flex gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <AlertCircle size={18} className="shrink-0 mt-1 text-amber-400" />
              <div className="min-w-0">
                <p className="result-item-title">{title}</p>
                <p className="result-item-desc">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <Divider />

        {/* ── ⑤/⑦ 冲突模式 ────────────────────────────── */}
        <SectionHeader num={isDualMode ? '⑦' : '⑤'} title={t('result.section_conflict')} />

        <div className="result-list">
          {/* 触发模式 */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ backgroundColor: 'color-mix(in srgb, var(--poster-accent) 10%, white)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageCircleHeart size={14} style={{ color: 'var(--poster-accent)' }} />
              <span className="text-[11px] font-semibold text-base-mute uppercase tracking-wider">
                {t('result.conflict_pattern_label')}
              </span>
            </div>
            <p className="result-prose">
              {result.conflictPattern.pattern}
            </p>
          </div>

          {/* 和解方式 */}
          <div className="rounded-xl p-4 space-y-2 bg-green-50/60 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} className="text-green-500" />
              <span className="text-[11px] font-semibold text-green-600 uppercase tracking-wider">
                {t('result.conflict_resolution_label')}
              </span>
            </div>
            <p className="result-prose">
              {result.conflictPattern.resolution}
            </p>
          </div>
        </div>

        <Divider />

        {/* ── ⑥/⑧ 充电 vs 耗电 ──────────────────────── */}
        <SectionHeader num={isDualMode ? '⑧' : '⑥'} title={t('result.section_energy')} />

        <div className="space-y-4">
          {/* 充电 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} style={{ color: 'var(--poster-accent)' }} />
              <span className="text-xs font-semibold text-base-text">{t('result.energy_charging')}</span>
            </div>
            <div className="space-y-2">
              {result.energyMap.charging.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--poster-accent) 12%, white)' }}
                >
                  <span
                    className="text-[10px] font-bold shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: 'var(--poster-accent)' }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-xs text-base-text leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 耗电 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BatteryLow size={15} className="text-base-mute" />
              <span className="text-xs font-semibold text-base-text">{t('result.energy_draining')}</span>
            </div>
            <div className="space-y-2">
              {result.energyMap.draining.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 bg-gray-50 border border-gray-100"
                >
                  <span className="text-[10px] font-bold shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white bg-gray-300">
                    {i + 1}
                  </span>
                  <p className="text-xs text-base-mute leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Divider />

        {/* ── ⑦/⑨ 长期走向 ───────────────────────────── */}
        <SectionHeader num={isDualMode ? '⑨' : '⑦'} title={t('result.section_longterm')} />

        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--poster-accent) 8%, white)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Compass size={15} style={{ color: 'var(--poster-accent)' }} />
            <span className="text-xs font-semibold text-base-mute">{t('result.longterm_subhead')}</span>
          </div>
          <p className="result-prose">{result.longterm}</p>
        </div>

        <Divider />

        {/* ── ⑧/⑩ 相处 Tips ──────────────────────────── */}
        <SectionHeader num={isDualMode ? '⑩' : '⑧'} title={t('result.section_tips')} />

        <div className="result-list">
          {result.tipsForCouple.map((tip, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div
                className="shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--poster-accent) 20%, white)' }}
              >
                <Lightbulb size={12} style={{ color: 'var(--poster-accent)' }} />
              </div>
              <p className="result-prose">{tip}</p>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── 趣味数据 ──────────────────────────────── */}
        <SectionHeader num="📊" title={isDualMode ? t('result.section_data_dual') : t('result.section_data_single')} />

        <div className="grid grid-cols-2 gap-2">
          {result.funFacts.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl p-2.5 sm:p-3 space-y-0.5 min-w-0"
              style={{ backgroundColor: 'color-mix(in srgb, var(--poster-accent) 12%, white)' }}
            >
              <p className="text-[10px] text-base-mute truncate">{label}</p>
              <p
                className="text-xs sm:text-sm font-bold leading-snug break-words"
                style={{ color: 'var(--poster-accent)' }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── 关系星盘 ──────────────────────────────── */}
        <SectionHeader num="✨" title={t('result.section_star')} />

        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 rounded-xl p-2.5 sm:p-3 border border-green-100 bg-green-50/50">
            <p className="text-[10px] text-green-600 font-semibold mb-1">{t('result.star_soulmate')}</p>
            <p className="text-xs sm:text-sm font-bold text-base-text leading-snug break-words">
              {soulmateResult?.title ?? result.soulmate}
            </p>
            <p className="text-[10px] text-base-mute mt-0.5">{result.soulmate}</p>
          </div>
          <div className="flex-1 min-w-0 rounded-xl p-2.5 sm:p-3 border border-red-100 bg-red-50/50">
            <p className="text-[10px] text-red-500 font-semibold mb-1">{t('result.star_nemesis')}</p>
            <p className="text-xs sm:text-sm font-bold text-base-text leading-snug break-words">
              {nemesisResult?.title ?? result.nemesis}
            </p>
            <p className="text-[10px] text-base-mute mt-0.5">{result.nemesis}</p>
          </div>
        </div>

        {/* 底部水印 */}
        <div className="pt-8 text-center">
          <p className="text-[10px] text-base-mute/50 tracking-wide break-words">
            {t('result.watermark')}
          </p>
        </div>

            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════
          海报区域外：昵称 → 分享 → AI（不参与截图）
      ══════════════════════════════════════════════ */}

      <div className="my-8 h-px bg-gray-200" />

      {/* 1. 昵称 + 生成报告 */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-base-text">
            {isDualMode ? t('result.nickname_dual_title') : t('result.nickname_single_title')}
          </p>
          <p className="text-xs text-base-mute mt-0.5">
            {isDualMode ? t('result.nickname_dual_desc') : t('result.nickname_single_desc')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            maxLength={10}
            placeholder={t('result.nickname_placeholder_other')}
            value={nickname1}
            onChange={e => setNickname1(e.target.value)}
            className="w-full border border-gray-200 rounded-btn px-3 py-2.5 text-sm text-base-text placeholder:text-gray-300 focus:outline-none focus:border-brand-cyan transition-colors bg-white"
          />
          <input
            type="text"
            maxLength={10}
            placeholder={t('result.nickname_placeholder_self')}
            value={nickname2}
            onChange={e => setNickname2(e.target.value)}
            className="w-full border border-gray-200 rounded-btn px-3 py-2.5 text-sm text-base-text placeholder:text-gray-300 focus:outline-none focus:border-brand-cyan transition-colors bg-white"
          />
        </div>

        {!isDualMode && (
          <button
            type="button"
            className={[
              'w-full py-3 text-sm rounded-btn font-semibold transition-all duration-150',
              canGenerateSinglePoster
                ? 'bg-brand-cyan text-white hover:opacity-90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            ].join(' ')}
            onClick={handleGenerate}
            disabled={!canGenerateSinglePoster}
          >
            {t('result.generate_single_btn')}
          </button>
        )}

        {isDualMode && (
          <button
            className="btn-primary w-full py-3 text-sm"
            onClick={handleGenerate}
          >
            {t('result.generate_dual_btn')}
          </button>
        )}
      </div>

      {/* 2. 邀请 TA / 分享链接（单人模式） */}
      {!isDualMode && (
        <>
          <div className="my-8 h-px bg-gray-200" />
          <div className="rounded-card border border-brand-purple/15 bg-brand-purple/5 p-4">
            <p className="text-sm font-semibold text-base-text">{t('result.invite_section_title')}</p>
            <p className="mt-1 text-xs leading-relaxed text-base-mute">
              {t('result.invite_section_desc')}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className={[
                  'flex-1 py-3 rounded-btn text-sm font-semibold transition-all duration-150',
                  shareCopied
                    ? 'bg-brand-green text-white border border-brand-green shadow-sm'
                    : 'btn-ghost',
                ].join(' ')}
                onClick={handleCopySingleShareLink}
              >
                {shareCopied ? t('result.invite_copy_single_done') : t('result.invite_copy_single')}
              </button>
              <button
                type="button"
                className={[
                  'flex-1 py-3 rounded-btn text-sm font-semibold transition-all duration-150',
                  inviteCopied
                    ? 'bg-brand-green text-white border border-brand-green shadow-sm'
                    : 'btn-primary',
                ].join(' ')}
                onClick={handleCopySingleInvite}
                disabled={singleInviteLoading}
              >
                {singleInviteLoading
                  ? t('result.invite_copy_dual_loading')
                  : inviteCopied
                    ? t('result.invite_copy_dual_done')
                    : t('result.invite_copy_dual')}
              </button>
              {singleInviteLink && (
                <a
                  className="btn-ghost flex-1 py-3 text-center"
                  href={singleInviteLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('result.invite_preview_link')}
                </a>
              )}
            </div>
            {singleInviteError && (
              <p className="mt-2 text-xs text-rose-600">{singleInviteError}</p>
            )}
            <p className="mt-2 text-xs text-green-600 min-h-[1.25rem]">
              {inviteCopied
                ? t('result.invite_copy_dual_done_tip')
                : shareCopied
                  ? t('result.invite_copy_single_done_tip')
                  : ' '}
            </p>
          </div>
        </>
      )}

      {/* 3. AI 关系助手 */}
      <div className="my-8 h-px bg-gray-200" />

      <div className={result.themeClass}>
        <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-card">
          <div className="bg-gradient-to-r from-brand-cyan/10 via-white to-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-cyan text-white shadow-sm">
                  <MessageCircleHeart size={21} aria-hidden />
                </span>
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-base-text">{t('result.ai_card_title')}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-cyan/10 px-2 py-1 text-[10px] font-semibold text-brand-cyan">
                      <Sparkles size={12} aria-hidden />
                      {t('result.ai_card_based', { code: result.code })}
                    </span>
                  </div>
                  <p className="text-xs leading-6 text-base-mute">
                    {t('result.ai_card_desc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenAi}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand-cyan px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-90"
              >
                {t('result.ai_card_btn')}
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 text-center space-y-1">
        <p className="text-sm text-base-mute">
          {isDualMode ? t('result.poster_share_dual_save') : t('result.poster_share_single_save')}
        </p>
        <p className="text-sm text-base-mute">
          {isDualMode ? t('result.poster_share_dual_share') : t('result.poster_share_single_share')}
        </p>
      </div>

      <div className="mt-5 text-center">
        <button className="btn-ghost px-8 py-2" onClick={onRestart}>
          {t('common.restart')}
        </button>
      </div>
    </div>
  )
}

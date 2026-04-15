import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
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

function renderSpectrum(percentages) {
  return (
    <div className="space-y-4">
      {DIMENSION_ROWS.map(({ posKey, negKey, posLabel, negLabel, title }) => {
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
        fetchPriority="high"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

export default function ResultPoster({ resultData, onRestart }) {
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
  const result = primaryProfile.result
  const percentages = primaryProfile.percentages
  const modeKey = isDualMode ? 'dual' : 'single'
  const resultIntro = result.introByMode?.[modeKey]
  const differenceHint = result.differenceHintByMode?.[modeKey]
  const soulmateResult = getResultByCode(result.soulmate)
  const nemesisResult  = getResultByCode(result.nemesis)

  const n1 = nickname1.trim() || 'TA'
  const n2 = nickname2.trim() || '你'
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
        setSingleInviteError(error?.message || '双人链接生成失败，请稍后重试。')
        return
      } finally {
        setSingleInviteLoading(false)
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        window.prompt('复制下面的双人拼图链接', link)
      }
      setInviteCopied(true)
    } catch {
      window.prompt('复制下面的双人拼图链接', link)
      setInviteCopied(true)
    }
  }

  async function handleCopySingleShareLink() {
    if (isDualMode || !perception?.sourceAnswers) return
    let link = ''
    try {
      link = createSingleShareLink(QUESTIONS, perception.sourceAnswers)
    } catch {
      setSingleInviteError('单人链接生成失败，请稍后重试。')
      return
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        window.prompt('复制下面的单人结果链接', link)
      }
      setShareCopied(true)
    } catch {
      window.prompt('复制下面的单人结果链接', link)
      setShareCopied(true)
    }
  }

  return (
    <div className="w-full max-w-none mx-auto pb-16">
      {!isDualMode && fromDualPreview && (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">这是“你的视角”完整报告（非双人合成结果）</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800/90">
            双人模式的最终 Couple Type 需要 TA 完成作答后合成。你仍可以回到上一页复制邀请链接继续拼图。
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          海报主体（供 html2canvas 截图）
      ══════════════════════════════════════════════ */}
      <div ref={posterRef} className={`cpti-poster ${result.themeClass}`}>

        <div
          className="cpti-result-hero-bleed shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--poster-accent) 48%, #221e2e)',
          }}
        >
          <div className="mx-auto max-w-6xl xl:max-w-7xl 2xl:max-w-[min(100%,90rem)] px-4 md:px-8 lg:px-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-14 pt-8 pb-2 md:pt-12 md:pb-3">
            <div className="text-center lg:text-left space-y-2 md:space-y-3 lg:max-w-xl shrink-0">
              <p className="text-xs text-white/75 tracking-wide">
                {isDualMode ? '你们共同拼出的 CPTI 报告' : '你眼中的关系感知报告'}
              </p>
              <p className="text-sm sm:text-base font-semibold text-white leading-snug break-words">
                {isDualMode
                  ? `【${n1} & ${n2}】的亲密关系体检报告`
                  : `【${n2}】眼中的关系感知画像`}
              </p>
              <motion.div
                className="text-[48px] min-[360px]:text-[56px] sm:text-[64px] lg:text-[72px] font-black leading-none tracking-wide text-white pt-1 drop-shadow-sm"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 16 }}
              >
                {result.code}
              </motion.div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
                {result.title}
              </h2>
              <p className="text-sm sm:text-base text-white/85 italic max-w-prose mx-auto lg:mx-0">
                {result.slogan}
              </p>
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
              <SectionHeader num="①" title="关系画像" />

              <div className="rounded-xl border border-gray-100 bg-gray-50/90 px-4 py-3 text-left mb-5">
                <p className="text-xs font-semibold text-base-text">
                  {isDualMode ? '结果解释' : '单人结果说明'}
                </p>
                <p className="result-prose-muted mt-2">
                  {resultIntro ?? (isDualMode
                    ? '这份结果来自双方独立作答后的合成结果，会同时展示你们的一致部分和错位部分。'
                    : '这份结果代表你如何理解这段关系，是你的主观感知画像，不等于双方最终完全一致的 Couple Type。')}
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
              <SectionHeader num="②" title={isDualMode ? '关系合成光谱' : '你的关系光谱'} />
              {renderSpectrum(percentages)}
            </aside>

            <div className="lg:col-span-8 order-3 space-y-0 lg:col-start-1">
        {isDualMode && (
          <>
            <Divider />
            <SectionHeader num="③" title="一致与错位" />
            <div className="result-list">
              <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-green-600" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-green-700">
                    你们最一致的维度
                  </span>
                </div>
                <p className="text-sm font-semibold text-base-text">
                  {resultData.alignment.mostAlignedDimension.title}
                </p>
                <p className="result-prose-muted mt-2">
                  双方在这个维度上的一致度为 {resultData.alignment.mostAlignedDimension.consensus}%。
                  这意味着你们对这段关系的理解高度同频，更容易形成“我们本来就是这样”的稳定默契。
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    最容易错位的维度
                  </span>
                </div>
                <p className="text-sm font-semibold text-base-text">
                  {resultData.alignment.mostMisalignedDimension.title}
                </p>
                <p className="result-prose-muted mt-2">
                  {differenceHint ?? '这里是你们最容易“各自觉得自己很合理”的地方。它不代表不合适，只说明双方感知落差最大，最值得在日常里多确认一次彼此真正的需要。'}
                </p>
              </div>
            </div>

            <Divider />
            <SectionHeader num="④" title="双方视角对照" />
            <div className="result-list">
              {resultData.players.map((player, idx) => (
                <div key={player.id} className="rounded-xl border border-gray-100 bg-white/90 p-4">
                  <p className="text-xs font-semibold text-base-mute">第 {idx + 1} 位视角</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-base-text">{player.code}</p>
                      <p className="text-xs text-base-mute">{player.result?.title}</p>
                    </div>
                    <p className="result-prose-muted">这是 Ta 主观看到的关系版本</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Divider />

        {/* ── ③/⑤ 关系优势 ────────────────────────────── */}
        <SectionHeader num={isDualMode ? '⑤' : '③'} title="关系优势" />

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
        <SectionHeader num={isDualMode ? '⑥' : '④'} title="关系挑战" />

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
        <SectionHeader num={isDualMode ? '⑦' : '⑤'} title="冲突模式" />

        <div className="result-list">
          {/* 触发模式 */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ backgroundColor: 'color-mix(in srgb, var(--poster-accent) 10%, white)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageCircleHeart size={14} style={{ color: 'var(--poster-accent)' }} />
              <span className="text-[11px] font-semibold text-base-mute uppercase tracking-wider">
                典型触发模式
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
                惯用和解方式
              </span>
            </div>
            <p className="result-prose">
              {result.conflictPattern.resolution}
            </p>
          </div>
        </div>

        <Divider />

        {/* ── ⑥/⑧ 充电 vs 耗电 ──────────────────────── */}
        <SectionHeader num={isDualMode ? '⑧' : '⑥'} title="充电 vs 耗电" />

        <div className="space-y-4">
          {/* 充电 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} style={{ color: 'var(--poster-accent)' }} />
              <span className="text-xs font-semibold text-base-text">让感情充电的事</span>
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
              <span className="text-xs font-semibold text-base-text">让感情耗电的事</span>
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
        <SectionHeader num={isDualMode ? '⑨' : '⑦'} title="长期走向" />

        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--poster-accent) 8%, white)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Compass size={15} style={{ color: 'var(--poster-accent)' }} />
            <span className="text-xs font-semibold text-base-mute">这段关系未来的样子</span>
          </div>
          <p className="result-prose">{result.longterm}</p>
        </div>

        <Divider />

        {/* ── ⑧/⑩ 相处 Tips ──────────────────────────── */}
        <SectionHeader num={isDualMode ? '⑩' : '⑧'} title="相处 Tips" />

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
        <SectionHeader num="📊" title={isDualMode ? '双人数据报告' : '感知数据报告'} />

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
        <SectionHeader num="✨" title="关系星盘" />

        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 rounded-xl p-2.5 sm:p-3 border border-green-100 bg-green-50/50">
            <p className="text-[10px] text-green-600 font-semibold mb-1">天选 CP</p>
            <p className="text-xs sm:text-sm font-bold text-base-text leading-snug break-words">
              {soulmateResult?.title ?? result.soulmate}
            </p>
            <p className="text-[10px] text-base-mute mt-0.5">{result.soulmate}</p>
          </div>
          <div className="flex-1 min-w-0 rounded-xl p-2.5 sm:p-3 border border-red-100 bg-red-50/50">
            <p className="text-[10px] text-red-500 font-semibold mb-1">致命克星</p>
            <p className="text-xs sm:text-sm font-bold text-base-text leading-snug break-words">
              {nemesisResult?.title ?? result.nemesis}
            </p>
            <p className="text-[10px] text-base-mute mt-0.5">{result.nemesis}</p>
          </div>
        </div>

        {/* 底部水印 */}
        <div className="pt-8 text-center">
          <p className="text-[10px] text-base-mute/50 tracking-wide break-words">
            CPTI 亲密光谱测试 · 在16种爱情的颜色里，找到属于你们的那一抹光
          </p>
        </div>

            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════
          海报区域外：昵称输入 + 操作（不参与截图）
      ══════════════════════════════════════════════ */}

      <div className="my-8 h-px bg-gray-200" />

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-base-text">
            {isDualMode ? '填入昵称，让合成报告更专属' : '填入昵称，让感知报告更专属'}
          </p>
          <p className="text-xs text-base-mute mt-0.5">
            {isDualMode
              ? '填完后报告抬头自动更新，也可直接跳过'
              : '单人模式下，你会看到“我眼中的我们”，之后也可以再邀请 TA 一起拼图'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            maxLength={10}
            placeholder="TA 的名字"
            value={nickname1}
            onChange={e => setNickname1(e.target.value)}
            className="w-full border border-gray-200 rounded-btn px-3 py-2.5 text-sm text-base-text placeholder:text-gray-300 focus:outline-none focus:border-brand-cyan transition-colors bg-white"
          />
          <input
            type="text"
            maxLength={10}
            placeholder="你的名字"
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
            生成我的感知报告
          </button>
        )}

        {!isDualMode && (
          <div className="rounded-card border border-brand-purple/15 bg-brand-purple/5 p-4">
            <p className="text-sm font-semibold text-base-text">下一步建议：邀请 TA 一起拼图</p>
            <p className="mt-1 text-xs leading-relaxed text-base-mute">
              你现在拿到的是你视角下的关系画像。真正的 Couple Type 需要双方分别作答后再合成，才能看到你们最一致和最错位的地方。
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
                {shareCopied ? '单人链接已复制' : '复制单人结果链接'}
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
                  ? '正在生成双人链接...'
                  : inviteCopied
                    ? '双人链接已复制'
                    : '复制双人拼图链接'}
              </button>
              {singleInviteLink && (
                <a
                  className="btn-ghost flex-1 py-3 text-center"
                  href={singleInviteLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  预览邀请链接
                </a>
              )}
            </div>
            {singleInviteError && (
              <p className="mt-2 text-xs text-rose-600">{singleInviteError}</p>
            )}
            <p className="mt-2 text-xs text-green-600 min-h-[1.25rem]">
              {inviteCopied
                ? '双人链接已复制，可直接发给 TA'
                : shareCopied
                  ? '单人结果链接可反复打开/分享'
                  : ' '}
            </p>
          </div>
        )}

        {isDualMode && (
          <button
            className="btn-primary w-full py-3 text-sm"
            onClick={handleGenerate}
          >
            跳过，直接生成双人报告 ↑
          </button>
        )}
      </div>

      <div className="mt-5 text-center space-y-1">
        <p className="text-sm text-base-mute">
          {isDualMode ? '长按上方图片保存双人结果' : '长按上方图片保存你的感知结果'}
        </p>
        <p className="text-sm text-base-mute">
          {isDualMode ? '点击右上角分享给好友 / 朋友圈' : '也可以把这份结果发给 TA，邀请一起完成双人拼图'}
        </p>
      </div>

      <div className="mt-5 text-center">
        <button className="btn-ghost px-8 py-2" onClick={onRestart}>
          重新测试
        </button>
      </div>
    </div>
  )
}

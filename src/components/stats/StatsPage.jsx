import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { fetchStatsSummary } from '../../utils/statsApi'

const TYPE_COLORS = [
  '#EF476F', '#FF6B6B', '#F9844A', '#F9C74F',
  '#90BE6D', '#43AA8B', '#2A9D8F', '#4D96FF',
  '#277DA1', '#577590', '#7B2CBF', '#9D4EDD',
  '#C77DFF', '#F15BB5', '#00BBF9', '#00F5D4',
]

const PLACEHOLDER_RANKED = Array.from({ length: 8 }, (_, index) => ({
  code: '--',
  title: '--',
  percent: 0,
  count: 0,
  key: `placeholder-ranked-${index}`,
}))

const PLACEHOLDER_GROUPS = Array.from({ length: 4 }, (_, index) => ({
  group: `g-${index}`,
  label: '--',
  percent: 0,
  count: 0,
  accent: '#E5E7EB',
}))

const PLACEHOLDER_TOP_BOTTOM = Array.from({ length: 3 }, (_, index) => ({
  code: '--',
  title: '--',
  percent: 0,
  key: `placeholder-top-bottom-${index}`,
}))

const PLACEHOLDER_INSIGHTS = Array.from({ length: 3 }, (_, index) => ({
  title: '--',
  value: '--',
  note: '--',
  key: `placeholder-insight-${index}`,
}))

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function CountUpNumber({ target }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let raf = 0
    const duration = 1000
    const start = performance.now()

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(target * progress))
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return <span>{formatNumber(display)}</span>
}

function PrimaryButton({ children, onClick }) {
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

function GhostButton({ children, onClick }) {
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

function polarToCartesian(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  }
}

function createDonutSlicePath(cx, cy, outerR, innerR, startDeg, endDeg) {
  const startOuter = polarToCartesian(cx, cy, outerR, startDeg)
  const endOuter = polarToCartesian(cx, cy, outerR, endDeg)
  const startInner = polarToCartesian(cx, cy, innerR, startDeg)
  const endInner = polarToCartesian(cx, cy, innerR, endDeg)
  const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

export default function StatsPage({ onStartTest, onGoTypes }) {
  const [statsData, setStatsData] = useState(null)
  const [requestState, setRequestState] = useState('loading')
  const [statsError, setStatsError] = useState('')
  const [metricMode, setMetricMode] = useState('percent')
  const [activeCode, setActiveCode] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const isLoading = requestState === 'loading'
  const hasData = requestState === 'success' && !!statsData?.typeDistribution?.length
  const isError = requestState === 'error'

  useEffect(() => {
    let disposed = false

    async function loadRemoteStats() {
      setRequestState('loading')
      try {
        const remote = await fetchStatsSummary()
        if (disposed || !remote?.typeDistribution?.length) return
        setStatsData(remote)
        setActiveCode(remote.typeDistribution[0]?.code ?? null)
        setRequestState('success')
        setStatsError('')
      } catch {
        if (disposed) return
        setStatsData(null)
        setActiveCode(null)
        setRequestState('error')
        setStatsError('获取统计数据失败，请稍后刷新重试。')
      }
    }

    loadRemoteStats()
    return () => { disposed = true }
  }, [retryCount])

  const typeColorMap = useMemo(() => {
    if (!hasData) return {}
    return Object.fromEntries(
      statsData.typeDistribution.map((item, idx) => [item.code, TYPE_COLORS[idx % TYPE_COLORS.length]])
    )
  }, [hasData, statsData])

  const donutSlices = useMemo(() => {
    if (!hasData) return []
    let currentAngle = 0
    return statsData.typeDistribution.map((item) => {
      const span = (item.percent / 100) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + span
      currentAngle = endAngle
      return {
        ...item,
        startAngle,
        endAngle,
        color: typeColorMap[item.code],
      }
    })
  }, [hasData, statsData, typeColorMap])

  const activeType = useMemo(() => {
    if (!hasData) {
      return { code: '--', title: '--', percent: 0, count: 0 }
    }
    return statsData.typeDistribution.find((item) => item.code === activeCode) ?? statsData.typeDistribution[0]
  }, [activeCode, hasData, statsData])

  const rankedTypes = useMemo(() => {
    if (!hasData) return PLACEHOLDER_RANKED
    const list = [...statsData.typeDistribution]
    if (metricMode === 'count') {
      return list.sort((a, b) => b.count - a.count)
    }
    return list.sort((a, b) => b.percent - a.percent)
  }, [hasData, metricMode, statsData])

  useEffect(() => {
    if (!hasData) return
    const exists = statsData.typeDistribution.some((item) => item.code === activeCode)
    if (!exists) {
      setActiveCode(statsData.typeDistribution[0].code)
    }
  }, [activeCode, hasData, statsData])

  return (
    <div className="pb-10">
      <header className="pt-4 pb-8 text-center md:pt-8">
        <p className="text-eyebrow">CPTI · DATA VIEW</p>
        <h1 className="mt-2 text-2xl md:text-[32px] font-extrabold text-base-text leading-tight">CPTI 亲密关系光谱</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-base-mute">
          这是阶段性样本统计结果，用来帮助你观察“人群中的关系偏好分布”。
          <br />
          数据用于理解趋势，不用于定义关系价值高低。
        </p>

        {/* 累计份数 — 编辑物风格 hairline 数据陈列 */}
        <div className="mx-auto mt-7 max-w-md">
          <div className="relative pl-4 text-left">
            <span
              className="absolute left-0 top-1 h-[calc(100%-0.25rem)] w-[3px] rounded-full bg-brand-cyan"
              aria-hidden
            />
            <p className="text-eyebrow">累计问卷份数</p>
            <p className="font-display mt-1 text-4xl md:text-5xl font-black tabular-nums text-base-text leading-none">
              {isLoading ? (
                <span className="inline-block h-12 w-32 rounded bg-gray-200 animate-pulse" />
              ) : hasData ? (
                <CountUpNumber target={statsData.totalSubmissions} />
              ) : (
                '--'
              )}
            </p>
            <p className="mt-2 text-xs text-base-mute">
              数据更新时间：{hasData ? statsData.lastUpdated : '--'} · {hasData ? statsData.sourceNote : '--'}
            </p>
            {isError && statsError && (
              <div className="mt-2 flex flex-col items-start gap-2">
                <p className="text-xs text-amber-600">{statsError}</p>
                <button
                  type="button"
                  className="rounded-full border border-brand-cyan/30 bg-white px-3 py-1 text-xs font-semibold text-brand-cyan transition hover:bg-brand-cyan hover:text-white"
                  onClick={() => setRetryCount((count) => count + 1)}
                >
                  重试获取数据
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {isLoading ? (
            Array.from({ length: 5 }, (_, index) => (
              <span
                key={`tag-skeleton-${index}`}
                className="inline-block h-7 w-24 rounded-full bg-gray-200 animate-pulse"
              />
            ))
          ) : hasData ? (
            <>
              {statsData.cuteTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-100 bg-white/70 backdrop-blur-sm px-3 py-1 text-xs text-base-mute"
                >
                  <Sparkles size={12} className="text-brand-cyan" aria-hidden />
                  {tag}
                </span>
              ))}
              <span className="inline-flex items-center rounded-full border border-gray-100 bg-white/70 backdrop-blur-sm px-3 py-1 text-xs text-base-mute">
                在线共享数据
              </span>
            </>
          ) : (
            <span className="inline-flex items-center rounded-full border border-gray-100 bg-white/70 px-3 py-1 text-xs text-base-mute">
              --
            </span>
          )}
        </div>
      </header>

      <section className="border-t border-gray-100 pt-6 md:pt-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-6 w-[3px] shrink-0 rounded-full bg-brand-cyan" aria-hidden />
            <div>
              <p className="text-eyebrow">Distribution · 16 Types</p>
              <h2 className="mt-1 text-lg md:text-xl font-bold text-base-text leading-snug">16 型占比</h2>
            </div>
          </div>
          <div className="inline-flex rounded-full border border-gray-200 bg-white/70 p-1">
            <button
              type="button"
              className={[
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                metricMode === 'percent' ? 'bg-brand-cyan text-white' : 'text-base-mute',
              ].join(' ')}
              onClick={() => setMetricMode('percent')}
            >
              按占比
            </button>
            <button
              type="button"
              className={[
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                metricMode === 'count' ? 'bg-brand-cyan text-white' : 'text-base-mute',
              ].join(' ')}
              onClick={() => setMetricMode('count')}
            >
              按人数
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="mx-auto max-w-[280px]">
            {isLoading ? (
              <div className="relative mx-auto h-[220px] w-[220px] sm:h-[240px] sm:w-[240px] rounded-full bg-gray-200 animate-pulse" />
            ) : (
              <motion.div
                className="relative mx-auto h-[220px] w-[220px] sm:h-[240px] sm:w-[240px]"
                initial={{ rotate: -15, opacity: 0.4 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              >
                <svg viewBox="0 0 240 240" className="h-full w-full">
                  {donutSlices.map((slice) => {
                    const isActive = activeType?.code === slice.code
                    const path = createDonutSlicePath(120, 120, isActive ? 108 : 104, 62, slice.startAngle, slice.endAngle)
                    return (
                      <path
                        key={slice.code}
                        d={path}
                        fill={slice.color}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="cursor-pointer transition-all duration-150"
                        opacity={isActive ? 1 : 0.9}
                        onMouseEnter={() => setActiveCode(slice.code)}
                        onClick={() => setActiveCode(slice.code)}
                      >
                        <title>{`${slice.code} · ${slice.title} · ${slice.percent.toFixed(1)}%`}</title>
                      </path>
                    )
                  })}
                </svg>
                <div className="absolute inset-[26%] rounded-full bg-white shadow-inner flex flex-col items-center justify-center text-center px-2">
                  <p className="text-[11px] tracking-wide text-base-mute">当前高亮</p>
                  <p className="text-sm font-bold text-base-text">{activeType.code}</p>
                  <p className="text-[11px] text-base-mute mt-0.5 truncate max-w-full">{activeType.title}</p>
                  <p className="text-xs font-semibold text-brand-cyan mt-0.5">
                    {hasData ? `${activeType.percent.toFixed(1)}%` : '--'}
                  </p>
                </div>
              </motion.div>
            )}
            <p className="mt-2 text-center text-xs text-base-mute">
              提示：悬浮或点击任意扇区，查看对应 CPTI 信息
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-4">
            {rankedTypes.map((item, idx) => {
              const rank = idx + 1
              const valueText = metricMode === 'count'
                ? `${formatNumber(item.count)} 人`
                : `${item.percent.toFixed(1)}%`
              const isActive = activeType?.code === item.code
              return (
                <button
                  key={item.code === '--' ? item.key : item.code}
                  type="button"
                  onMouseEnter={() => setActiveCode(item.code)}
                  onClick={() => setActiveCode(item.code)}
                  className={[
                    'group w-full text-left border-t border-gray-100 py-2.5 transition-colors duration-150',
                    isActive ? 'bg-brand-cyan/[0.04]' : 'hover:bg-gray-50/50',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="font-display text-xs font-bold tabular-nums text-base-mute shrink-0 w-6"
                    >
                      {String(rank).padStart(2, '0')}
                    </span>
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: typeColorMap[item.code] }}
                    />
                    <p className="font-display text-sm font-bold text-base-text shrink-0 tracking-wide">
                      {item.code}
                    </p>
                    <p className="text-[11px] text-base-mute truncate min-w-0 flex-1">· {item.title}</p>
                    <span className="ml-auto font-display text-xs text-brand-cyan font-bold tabular-nums shrink-0">
                      {hasData ? valueText : '--'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 border-t border-gray-100 pt-7">
        <div>
          <div className="flex items-start gap-3 mb-5">
            <span className="mt-1 h-6 w-[3px] shrink-0 rounded-full" style={{ background: 'linear-gradient(180deg, #F4A7B0, #8ED6B4)' }} aria-hidden />
            <div>
              <p className="text-eyebrow">Color Group Share</p>
              <h2 className="mt-1 text-lg md:text-xl font-bold text-base-text leading-snug">四色系占比</h2>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {(hasData ? statsData.groupDistribution : PLACEHOLDER_GROUPS).map((item) => (
              <div key={item.group} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-base-text">{item.label}</span>
                  <span className="font-display tabular-nums text-base-mute">
                    {hasData ? `${item.percent.toFixed(1)}% · ${formatNumber(item.count)} 人` : '--'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100/80 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: item.accent,
                      boxShadow: hasData ? `0 0 8px ${item.accent}80` : 'none',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${hasData ? item.percent : 0}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 0.84, 0.34, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-start gap-3 mb-5">
            <span className="mt-1 h-6 w-[3px] shrink-0 rounded-full bg-brand-cyan" aria-hidden />
            <div>
              <p className="text-eyebrow">Insights</p>
              <h2 className="mt-1 text-lg md:text-xl font-bold text-base-text leading-snug">趣味洞察</h2>
            </div>
          </div>
          <div className="space-y-5">
            {(hasData ? statsData.insights : PLACEHOLDER_INSIGHTS).map((insight, idx) => (
              <article
                key={insight.title === '--' ? insight.key : insight.title}
                className={[
                  'relative pl-4',
                  idx > 0 ? 'pt-5 border-t border-gray-100' : '',
                ].join(' ')}
              >
                <span
                  className="absolute left-0 w-[2px] rounded-full bg-brand-cyan/60"
                  style={{ top: idx > 0 ? '1.25rem' : '0.25rem', bottom: '0.25rem' }}
                  aria-hidden
                />
                <p className="text-eyebrow">{insight.title}</p>
                <p className="mt-1 text-base font-bold text-base-text">{insight.value}</p>
                <p className="mt-1 text-xs leading-relaxed text-base-mute">{insight.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 border-t border-gray-100 pt-7">
        <div className="relative pl-4">
          <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-emerald-500/70" aria-hidden />
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="text-emerald-600" aria-hidden />
            <p className="text-eyebrow" style={{ color: '#059669' }}>Top 3 · Most Frequent</p>
          </div>
          <h3 className="text-sm font-bold text-base-text mb-3">高频类型</h3>
          <ol className="space-y-2">
            {(hasData ? statsData.top3 : PLACEHOLDER_TOP_BOTTOM).map((item, idx) => (
              <li key={item.code === '--' ? item.key : item.code} className="flex items-baseline gap-2.5 text-sm">
                <span className="font-display text-xs font-black tabular-nums text-emerald-600 shrink-0 w-5">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="font-display font-bold tracking-wide text-base-text">{item.code}</span>
                <span className="text-xs text-base-mute truncate">· {item.title}</span>
                <span className="ml-auto font-display tabular-nums text-xs text-base-mute shrink-0">
                  {hasData ? `${item.percent.toFixed(1)}%` : '--'}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative pl-4">
          <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-amber-400/70" aria-hidden />
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={15} className="text-amber-600" aria-hidden />
            <p className="text-eyebrow" style={{ color: '#d97706' }}>Top 3 · Rarest</p>
          </div>
          <h3 className="text-sm font-bold text-base-text mb-3">稀有类型</h3>
          <ol className="space-y-2">
            {(hasData ? statsData.bottom3 : PLACEHOLDER_TOP_BOTTOM).map((item, idx) => (
              <li key={item.code === '--' ? item.key : item.code} className="flex items-baseline gap-2.5 text-sm">
                <span className="font-display text-xs font-black tabular-nums text-amber-600 shrink-0 w-5">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="font-display font-bold tracking-wide text-base-text">{item.code}</span>
                <span className="text-xs text-base-mute truncate">· {item.title}</span>
                <span className="ml-auto font-display tabular-nums text-xs text-base-mute shrink-0">
                  {hasData ? `${item.percent.toFixed(1)}%` : '--'}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="mt-12 pt-8 border-t border-gray-100 text-center">
        <p className="mb-5 text-sm text-base-mute">
          看完人群趋势后，不妨回到你们自己的关系现场，做一次真正属于你们的测评。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton onClick={onStartTest}>开始测试</PrimaryButton>
          <GhostButton onClick={onGoTypes}>查看情侣类型</GhostButton>
        </div>
      </footer>
    </div>
  )
}

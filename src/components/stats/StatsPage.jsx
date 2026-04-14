import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { STATS_DATA } from '../../data/stats'
import { fetchStatsSummary } from '../../utils/statsApi'

const TYPE_COLORS = [
  '#EF476F', '#FF6B6B', '#F9844A', '#F9C74F',
  '#90BE6D', '#43AA8B', '#2A9D8F', '#4D96FF',
  '#277DA1', '#577590', '#7B2CBF', '#9D4EDD',
  '#C77DFF', '#F15BB5', '#00BBF9', '#00F5D4',
]

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
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-cyan px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-[0.98]"
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
      className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-cyan px-7 py-3 text-sm font-semibold text-brand-cyan transition hover:bg-brand-cyan hover:text-white active:scale-[0.98]"
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
  const [statsData, setStatsData] = useState(STATS_DATA)
  const [statsSource, setStatsSource] = useState('fallback')
  const [statsError, setStatsError] = useState('')
  const [metricMode, setMetricMode] = useState('percent')
  const [activeCode, setActiveCode] = useState(STATS_DATA.typeDistribution[0]?.code ?? null)

  useEffect(() => {
    let disposed = false

    async function loadRemoteStats() {
      try {
        const remote = await fetchStatsSummary()
        if (disposed || !remote?.typeDistribution?.length) return
        setStatsData(remote)
        setStatsSource('live')
        setStatsError('')
      } catch {
        if (disposed) return
        setStatsSource('fallback')
        setStatsError('当前展示为本地演示数据，稍后将自动重试在线统计。')
      }
    }

    loadRemoteStats()
    return () => { disposed = true }
  }, [])

  const typeColorMap = useMemo(() => {
    return Object.fromEntries(
      statsData.typeDistribution.map((item, idx) => [item.code, TYPE_COLORS[idx % TYPE_COLORS.length]])
    )
  }, [statsData.typeDistribution])

  const donutSlices = useMemo(() => {
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
  }, [statsData.typeDistribution, typeColorMap])

  const activeType = useMemo(() => {
    return statsData.typeDistribution.find((item) => item.code === activeCode) ?? statsData.typeDistribution[0]
  }, [activeCode, statsData.typeDistribution])

  const rankedTypes = useMemo(() => {
    const list = [...statsData.typeDistribution]
    if (metricMode === 'count') {
      return list.sort((a, b) => b.count - a.count)
    }
    return list.sort((a, b) => b.percent - a.percent)
  }, [metricMode, statsData.typeDistribution])

  useEffect(() => {
    if (!statsData.typeDistribution.length) return
    const exists = statsData.typeDistribution.some((item) => item.code === activeCode)
    if (!exists) {
      setActiveCode(statsData.typeDistribution[0].code)
    }
  }, [activeCode, statsData.typeDistribution])

  return (
    <div className="pb-10">
      <header className="pt-4 pb-7 text-center md:pt-8">
        <p className="text-xs tracking-wide text-brand-cyan font-semibold">CPTI DATA VIEW</p>
        <h1 className="mt-2 text-h1">CPTI 人群关系光谱</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-base-mute">
          这是阶段性样本统计结果，用来帮助你观察“人群中的关系偏好分布”。
          <br />
          数据用于理解趋势，不用于定义关系价值高低。
        </p>

        <div className="mt-6 rounded-card border border-brand-cyan/15 bg-brand-cyan/5 px-4 py-4 max-w-xl mx-auto shadow-card">
          <p className="text-xs text-brand-cyan font-semibold tracking-wide">累计问卷份数</p>
          <p className="mt-1 text-3xl md:text-4xl font-black text-base-text">
            <CountUpNumber target={statsData.totalSubmissions} />
          </p>
          <p className="mt-1 text-xs text-base-mute">
            数据更新时间：{statsData.lastUpdated} · {statsData.sourceNote}
          </p>
          {statsError && (
            <p className="mt-1 text-xs text-amber-600">{statsError}</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {statsData.cuteTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-base-mute"
            >
              <Sparkles size={12} className="text-brand-cyan" aria-hidden />
              {tag}
            </span>
          ))}
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-base-mute">
            {statsSource === 'live' ? '在线共享数据' : '演示回退数据'}
          </span>
        </div>
      </header>

      <section className="rounded-card border border-gray-100 bg-white p-4 shadow-card md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-h2">16 型占比</h2>
          <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
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
                <p className="text-xs font-semibold text-brand-cyan mt-0.5">{activeType.percent.toFixed(1)}%</p>
              </div>
            </motion.div>
            <p className="mt-2 text-center text-xs text-base-mute">
              提示：悬浮或点击任意扇区，查看对应 CPTI 信息
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {rankedTypes.map((item, idx) => {
              const rank = idx + 1
              const valueText = metricMode === 'count'
                ? `${formatNumber(item.count)} 人`
                : `${item.percent.toFixed(1)}%`
              const isActive = activeType?.code === item.code
              return (
                <button
                  key={item.code}
                  type="button"
                  onMouseEnter={() => setActiveCode(item.code)}
                  onClick={() => setActiveCode(item.code)}
                  className={[
                    'w-full text-left rounded-xl border bg-gray-50/70 p-2.5 transition-colors',
                    isActive ? 'border-brand-cyan/40 bg-brand-cyan/5' : 'border-gray-100',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: typeColorMap[item.code] }}
                    />
                    <p className="text-xs font-semibold text-base-text truncate">
                      {rank}. {item.code}
                    </p>
                    <span className="ml-auto text-[11px] text-brand-cyan font-semibold shrink-0">
                      {valueText}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-base-mute truncate">{item.title}</p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-gray-100 bg-white p-4 shadow-card md:p-5">
          <h2 className="text-h2">四色系占比</h2>
          <div className="mt-4 space-y-3">
            {statsData.groupDistribution.map((item) => (
              <div key={item.group} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-base-text">{item.label}</span>
                  <span className="text-base-mute">
                    {item.percent.toFixed(1)}% · {formatNumber(item.count)} 人
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.accent }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percent}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-gray-100 bg-white p-4 shadow-card md:p-5 space-y-4">
          <h2 className="text-h2">趣味洞察</h2>
          {statsData.insights.map((insight) => (
            <article key={insight.title} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
              <p className="text-xs font-semibold text-brand-cyan tracking-wide">{insight.title}</p>
              <p className="mt-1 text-sm font-semibold text-base-text">{insight.value}</p>
              <p className="mt-1 text-xs leading-relaxed text-base-mute">{insight.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-green-100 bg-green-50/60 p-4 md:p-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-green-600" aria-hidden />
            <h3 className="text-sm font-semibold text-base-text">Top 3 高频类型</h3>
          </div>
          <div className="mt-3 space-y-2">
            {statsData.top3.map((item) => (
              <p key={item.code} className="text-sm text-base-text">
                {item.code} · {item.title}
                <span className="ml-2 text-xs text-base-mute">{item.percent.toFixed(1)}%</span>
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-amber-100 bg-amber-50/60 p-4 md:p-5">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-amber-600" aria-hidden />
            <h3 className="text-sm font-semibold text-base-text">Top 3 稀有类型</h3>
          </div>
          <div className="mt-3 space-y-2">
            {statsData.bottom3.map((item) => (
              <p key={item.code} className="text-sm text-base-text">
                {item.code} · {item.title}
                <span className="ml-2 text-xs text-base-mute">{item.percent.toFixed(1)}%</span>
              </p>
            ))}
          </div>
        </div>
      </section>

      <footer className="pt-8 text-center">
        <p className="mb-4 text-sm text-base-mute">
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

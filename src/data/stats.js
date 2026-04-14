import { RESULTS_MAP } from './results'
import { TYPE_GROUP_META } from './typeGroups'

const BASE_TYPE_PERCENTAGES = [
  { code: 'SROD', percent: 10.8 },
  { code: 'SROA', percent: 8.4 },
  { code: 'SRFD', percent: 6.9 },
  { code: 'SRFA', percent: 4.9 },
  { code: 'SPOD', percent: 8.7 },
  { code: 'SPOA', percent: 6.8 },
  { code: 'SPFD', percent: 5.9 },
  { code: 'SPFA', percent: 4.6 },
  { code: 'IROD', percent: 6.3 },
  { code: 'IROA', percent: 5.8 },
  { code: 'IRFD', percent: 4.9 },
  { code: 'IRFA', percent: 4.0 },
  { code: 'IPOD', percent: 6.1 },
  { code: 'IPOA', percent: 5.7 },
  { code: 'IPFD', percent: 5.4 },
  { code: 'IPFA', percent: 4.8 },
]

function computeCountsByPercent(total, rows) {
  const withRaw = rows.map((row) => {
    const raw = (total * row.percent) / 100
    const floor = Math.floor(raw)
    return { ...row, count: floor, remainder: raw - floor }
  })

  let used = withRaw.reduce((sum, row) => sum + row.count, 0)
  const missing = total - used

  if (missing > 0) {
    const sorted = [...withRaw].sort((a, b) => b.remainder - a.remainder)
    for (let i = 0; i < missing; i += 1) {
      sorted[i % sorted.length].count += 1
    }
  }

  return withRaw.map((row) => {
    const matched = withRaw.find((item) => item.code === row.code)
    return {
      code: row.code,
      percent: row.percent,
      count: matched?.count ?? row.count,
      title: RESULTS_MAP[row.code]?.title ?? row.code,
      group: row.code.slice(0, 2),
    }
  })
}

function buildGroupDistribution(typeDistribution) {
  const grouped = typeDistribution.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = { group: item.group, percent: 0, count: 0 }
    }
    acc[item.group].percent += item.percent
    acc[item.group].count += item.count
    return acc
  }, {})

  return Object.values(grouped).map((item) => ({
    ...item,
    label: TYPE_GROUP_META[item.group]?.label ?? item.group,
    accent: TYPE_GROUP_META[item.group]?.accent ?? '#4298b4',
  }))
}

const TOTAL_SUBMISSIONS = 128420
const typeDistribution = computeCountsByPercent(TOTAL_SUBMISSIONS, BASE_TYPE_PERCENTAGES)
const groupDistribution = buildGroupDistribution(typeDistribution)
const sortedByPercent = [...typeDistribution].sort((a, b) => b.percent - a.percent)

export const STATS_DATA = {
  totalSubmissions: TOTAL_SUBMISSIONS,
  lastUpdated: '2026-04-14',
  sourceNote: '阶段性样本统计（演示数据）',
  typeDistribution,
  groupDistribution,
  top3: sortedByPercent.slice(0, 3),
  bottom3: sortedByPercent.slice(-3).reverse(),
  insights: [
    {
      title: '最常见类型',
      value: `${sortedByPercent[0].code} · ${sortedByPercent[0].title}`,
      note: `约占样本的 ${sortedByPercent[0].percent.toFixed(1)}%，是目前最常见的关系画像。`,
    },
    {
      title: '最稀有类型',
      value: `${sortedByPercent[sortedByPercent.length - 1].code} · ${sortedByPercent[sortedByPercent.length - 1].title}`,
      note: `约占样本的 ${sortedByPercent[sortedByPercent.length - 1].percent.toFixed(1)}%，属于人群中的少数派风格。`,
    },
    {
      title: '色系分布提示',
      value: '蜜桃粉系（SR）占比领先',
      note: '高陪伴 + 高表达的组合在样本里更常见，但不代表更优，只代表更普遍。',
    },
  ],
  cuteTags: ['今日热度观察', '关系光谱样本', '仅用于沟通参考', '不做优劣判断'],
}

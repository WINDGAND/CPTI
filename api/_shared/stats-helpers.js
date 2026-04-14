import { RESULTS_MAP } from '../../src/data/results.js'
import { TYPE_GROUP_META } from '../../src/data/typeGroups.js'

export const VALID_CODES = [
  'SROD', 'SROA', 'SRFD', 'SRFA',
  'SPOD', 'SPOA', 'SPFD', 'SPFA',
  'IROD', 'IROA', 'IRFD', 'IRFA',
  'IPOD', 'IPOA', 'IPFD', 'IPFA',
]

export const VALID_MODES = ['single', 'dual']

function buildTypeDistribution(totalSubmissions, codeToCount) {
  return VALID_CODES.map((code) => {
    const count = Number(codeToCount[code] ?? 0)
    const percent = totalSubmissions > 0
      ? Number(((count / totalSubmissions) * 100).toFixed(1))
      : 0

    return {
      code,
      count,
      percent,
      title: RESULTS_MAP[code]?.title ?? code,
      group: code.slice(0, 2),
    }
  })
}

function buildGroupDistribution(typeDistribution) {
  const grouped = typeDistribution.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = { group: item.group, count: 0, percent: 0 }
    }
    acc[item.group].count += item.count
    acc[item.group].percent += item.percent
    return acc
  }, {})

  return Object.values(grouped).map((item) => ({
    ...item,
    label: TYPE_GROUP_META[item.group]?.label ?? item.group,
    accent: TYPE_GROUP_META[item.group]?.accent ?? '#4298b4',
    percent: Number(item.percent.toFixed(1)),
  }))
}

function buildInsights(sortedByPercent) {
  if (sortedByPercent.length === 0) return []
  const top = sortedByPercent[0]
  const bottom = sortedByPercent[sortedByPercent.length - 1]

  return [
    {
      title: '最常见类型',
      value: `${top.code} · ${top.title}`,
      note: `约占样本的 ${top.percent.toFixed(1)}%，是目前最常见的关系画像。`,
    },
    {
      title: '最稀有类型',
      value: `${bottom.code} · ${bottom.title}`,
      note: `约占样本的 ${bottom.percent.toFixed(1)}%，属于样本中的少数派风格。`,
    },
    {
      title: '样本观察',
      value: '统计持续变化中',
      note: '这是一份滚动更新的阶段性样本，用于观察趋势，不用于评判关系优劣。',
    },
  ]
}

export function buildStatsPayload(totalSubmissions, updatedAt, codeToCount) {
  const typeDistribution = buildTypeDistribution(totalSubmissions, codeToCount)
  const sortedByPercent = [...typeDistribution].sort((a, b) => b.percent - a.percent)
  const groupDistribution = buildGroupDistribution(typeDistribution)

  return {
    totalSubmissions,
    lastUpdated: updatedAt,
    sourceNote: '全站滚动样本统计（Supabase）',
    typeDistribution,
    groupDistribution,
    top3: sortedByPercent.slice(0, 3),
    bottom3: sortedByPercent.slice(-3).reverse(),
    insights: buildInsights(sortedByPercent),
    cuteTags: ['实时样本更新', '跨设备共享统计', '仅用于沟通参考', '不做优劣判断'],
  }
}

/**
 * CPTI 公开统计载荷组装（纯函数，无网络、无存储）
 *
 * 职责：
 *   - 维护合法的 16 型代码与测评模式枚举，供服务端校验
 *   - 把「总样本数 + 各类型计数」转成统计页可用的分布、色系聚合与观察文案
 *
 * 百分比：单类型按 count/total 保留 1 位小数；色系占比由各型相加后再 round 到 1 位
 * 调用方：`server/stats-service.js` 的 `fetchStatsSummaryData`
 */

import { RESULTS_MAP } from '../../src/data/results.js'
import { TYPE_GROUP_META } from '../../src/data/typeGroups.js'

/**
 * 16 种情侣类型码（与 PRD 2.3 一致），顺序按四大色系分组
 * @type {readonly string[]}
 */
export const VALID_CODES = [
  'SROD', 'SROA', 'SRFD', 'SRFA',
  'SPOD', 'SPOA', 'SPFD', 'SPFA',
  'IROD', 'IROA', 'IRFD', 'IRFA',
  'IPOD', 'IPOA', 'IPFD', 'IPFA',
]

/**
 * 允许的测评模式：单人速通 / 双人拼图
 * @type {readonly string[]}
 */
export const VALID_MODES = ['single', 'dual']

/**
 * 按 16 型展开计数与占比，并带上中文标题与色系前缀（前两字母）
 * 总样本为 0 时占比一律记 0，避免除零得到 NaN
 *
 * @param {number} totalSubmissions 总样本数
 * @param {Record<string, number>} codeToCount 类型码 → 计数
 * @returns {Array<{code: string, count: number, percent: number, title: string, group: string}>}
 */
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

/**
 * 把 16 型按色系（SR / SP / IR / IP）聚合，复用 typeGroups 的中文标签与强调色
 *
 * @param {Array<{group: string, count: number, percent: number}>} typeDistribution
 * @returns {Array<{group: string, count: number, percent: number, label: string, accent: string}>}
 */
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

/**
 * 从已按占比降序排列的类型列表抽出「最常见 / 最稀有 / 样本说明」三条观察
 * 空列表直接返回 []，避免无样本时读越界
 *
 * @param {Array<{code: string, title: string, percent: number}>} sortedByPercent
 * @returns {Array<{title: string, value: string, note: string}>}
 */
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

/**
 * 组装统计页公开载荷：16 型分布、四大色系、Top3 / Bottom3 与观察文案
 *
 * @param {number} totalSubmissions 总样本数
 * @param {string} updatedAt 更新日期（通常 YYYY-MM-DD）
 * @param {Record<string, number>} codeToCount 类型码 → 计数
 * @returns {object} 供 `/api/stats-summary` 原样返回的 data
 */
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
    // slice(-3) 在降序列表上得到「较不常见的 3 个」，reverse 后最稀有的排在前面
    bottom3: sortedByPercent.slice(-3).reverse(),
    insights: buildInsights(sortedByPercent),
    cuteTags: ['实时样本更新', '跨设备共享统计', '仅用于沟通参考', '不做优劣判断'],
  }
}

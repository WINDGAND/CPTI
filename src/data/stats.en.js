/**
 * 统计页用到的少量本地化数据：
 *   - cuteTags 标签英文版
 *   - 数据来源说明（sourceNote）
 *
 * 这些数据可能由后端返回；当后端返回中文时，需要在 StatsPage 内通过 i18n
 * 重新组装显示，因此本文件仅提供静态备份字段。
 */

export const STATS_LOCALIZATION_EN = {
  cuteTags: ['Today\'s heat', 'Spectrum samples', 'For communication only', 'No good-or-bad ranking'],
  sourceNote: 'Stage sample stats (demo data)',
}

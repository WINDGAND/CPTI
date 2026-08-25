/**
 * 从测评结果对象解析对应 CPTI 类型的主题色 class。
 *
 * 海报、分享卡、聊天页用同一套 theme-* class 对齐四大色系：
 * 双人拼图跟 relationship.code，单人速通跟 perception.code。
 * 副作用：无
 */

import { getResultByCode } from './scoring'

/**
 * @param {{ mode?: string, relationship?: { code?: string }, perception?: { code?: string } }} [resultData]
 *   客户端保存的测评结果；缺字段时走默认蓝色
 * @returns {string} 如 `theme-pink` / `theme-blue` / `theme-purple` / `theme-green`
 */
export function getResultThemeClass(resultData) {
  // 双人模式主题跟「关系类型」走，单人模式跟「自我认知类型」走
  const code = resultData?.mode === 'dual'
    ? resultData?.relationship?.code
    : resultData?.perception?.code
  const result = getResultByCode(code)
  // 未知类型码回退湖水蓝系，避免海报/聊天页缺 class 掉样式
  return result?.themeClass || 'theme-blue'
}

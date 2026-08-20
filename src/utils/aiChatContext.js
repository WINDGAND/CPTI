/**
 * AI 关系助手 · 测评结果压缩为模型上下文
 *
 * 职责：
 *   - 从单人感知 / 双人关系结果里抽出类型码、百分比、优劣势等，截断到 token 预算内
 *   - 按 mode + 类型码生成 localStorage 会话键，避免不同报告串历史
 *
 * 副作用：无网络、无存储；本文件只做纯函数变换
 * 调用方：把返回的 context 交给 `/api/ai-chat`，并用 storage key 读写会话
 */

/** localStorage 会话键前缀；后面会拼 `_single|dual_<CODE>` */
const HISTORY_KEY_PREFIX = 'cpti_ai_chat'

/**
 * 折叠空白并截断，避免把整段报告原文塞进 prompt
 *
 * @param {unknown} value 任意文本
 * @param {number} [maxLength=280] 截断长度
 * @returns {string}
 */
function compactText(value, maxLength = 280) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

/**
 * 只保留前几条 strengths / tips；字符串与 `{title, desc}` 两种形态都支持
 *
 * @param {unknown} items
 * @param {number} [maxItems=3]
 * @returns {Array<string | {title: string, desc: string}>}
 */
function compactItems(items = [], maxItems = 3) {
  if (!Array.isArray(items)) return []
  return items.slice(0, maxItems).map((item) => {
    if (typeof item === 'string') return compactText(item)
    return {
      title: compactText(item?.title, 80),
      desc: compactText(item?.desc, 220),
    }
  }).filter((item) => {
    if (typeof item === 'string') return item.length > 0
    return item.title || item.desc
  })
}

/**
 * 把一份类型档案压成助手可消化的摘要（类型码、四维百分比、冲突模式等）
 *
 * @param {{ code?: string, result?: object, percentages?: object } | null | undefined} profile
 * @returns {object} 截断后的档案摘要
 */
function buildProfileSummary(profile) {
  const result = profile?.result || {}
  return {
    code: String(profile?.code || result.code || '').toUpperCase(),
    title: compactText(result.title, 80),
    slogan: compactText(result.slogan, 120),
    percentages: { ...(profile?.percentages || {}) },
    strengths: compactItems(result.strengths, 3),
    challenges: compactItems(result.challenges, 3),
    conflictPattern: {
      pattern: compactText(result.conflictPattern?.pattern, 420),
      resolution: compactText(result.conflictPattern?.resolution, 420),
    },
    tipsForCouple: compactItems(result.tipsForCouple, 3),
  }
}

/**
 * 由结果页载荷构建 AI 关系助手的上下文：单人用 perception，双人用 relationship
 *
 * @param {{ mode?: string, relationship?: object, perception?: object, players?: Array, alignment?: object } | null | undefined} resultData
 * @returns {object} 供 `sendAiChatMessage` 使用的压缩 context（双人额外含 players / alignment）
 */
export function buildAiRelationshipContext(resultData) {
  const isDualMode = resultData?.mode === 'dual'
  const primaryProfile = isDualMode ? resultData?.relationship : resultData?.perception
  const summary = buildProfileSummary(primaryProfile)

  const context = {
    mode: isDualMode ? 'dual' : 'single',
    ...summary,
  }

  if (isDualMode) {
    // 双人拼图才有双方标签与四维对齐度；单人模式没有 players / alignment
    context.players = (resultData?.players || []).slice(0, 2).map((player) => ({
      label: compactText(player?.label, 20),
      code: String(player?.code || '').toUpperCase(),
      title: compactText(player?.result?.title, 80),
    }))

    context.alignment = {
      mostAligned: {
        title: compactText(resultData?.alignment?.mostAlignedDimension?.title, 40),
        consensus: Number(resultData?.alignment?.mostAlignedDimension?.consensus ?? 0),
      },
      mostMisaligned: {
        title: compactText(resultData?.alignment?.mostMisalignedDimension?.title, 40),
        consensus: Number(resultData?.alignment?.mostMisalignedDimension?.consensus ?? 0),
      },
    }
  }

  return context
}

/**
 * 按测评模式 + 类型码生成 AI 会话的 localStorage 键
 *
 * @param {{ mode?: string, code?: string } | null | undefined} context `buildAiRelationshipContext` 的返回值
 * @returns {string} 形如 `cpti_ai_chat_dual_SROD`；缺码时用 `UNKNOWN`
 * 副作用：无；调用方负责用该键读写会话
 */
export function buildAiChatStorageKey(context) {
  const mode = context?.mode === 'dual' ? 'dual' : 'single'
  // 只保留 A-Z，避免类型码里的意外字符污染键名
  const code = String(context?.code || 'UNKNOWN').toUpperCase().replace(/[^A-Z]/g, '') || 'UNKNOWN'
  return `${HISTORY_KEY_PREFIX}_${mode}_${code}`
}

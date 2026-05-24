const HISTORY_KEY_PREFIX = 'cpti_ai_chat'

function compactText(value, maxLength = 280) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

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

export function buildAiRelationshipContext(resultData) {
  const isDualMode = resultData?.mode === 'dual'
  const primaryProfile = isDualMode ? resultData?.relationship : resultData?.perception
  const summary = buildProfileSummary(primaryProfile)

  const context = {
    mode: isDualMode ? 'dual' : 'single',
    ...summary,
  }

  if (isDualMode) {
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

export function buildAiChatStorageKey(context) {
  const mode = context?.mode === 'dual' ? 'dual' : 'single'
  const code = String(context?.code || 'UNKNOWN').toUpperCase().replace(/[^A-Z]/g, '') || 'UNKNOWN'
  return `${HISTORY_KEY_PREFIX}_${mode}_${code}`
}

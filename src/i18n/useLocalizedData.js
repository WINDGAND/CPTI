import { useMemo } from 'react'
import { useLanguage } from './LanguageContext'
import { RESULTS, RESULTS_MAP } from '../data/results'
import { RESULTS_EN } from '../data/results.en'
import { QUESTIONS } from '../data/questions'
import { QUESTION_TEXT_EN, QUESTION_MODE_COPY_EN } from '../data/questions.en'
import { TYPE_GROUP_META, TYPE_GROUP_ORDER } from '../data/typeGroups'
import { TYPE_GROUP_META_EN } from '../data/typeGroups.en'

/**
 * 把英文翻译 (按 code 索引) 与原始中文记录融合。
 * 仅替换翻译字段；保留 group / themeClass / soulmate / nemesis 等结构性字段。
 */
function mergeResultsEn() {
  const enByCode = Object.fromEntries(RESULTS_EN.map((r) => [r.code, r]))
  return RESULTS.map((zhResult) => {
    const en = enByCode[zhResult.code]
    if (!en) return zhResult
    const merged = {
      ...zhResult,
      title: en.title ?? zhResult.title,
      slogan: en.slogan ?? zhResult.slogan,
      description: en.description ?? zhResult.description,
      strengths: en.strengths ?? zhResult.strengths,
      challenges: en.challenges ?? zhResult.challenges,
      conflictPattern: en.conflictPattern ?? zhResult.conflictPattern,
      energyMap: en.energyMap ?? zhResult.energyMap,
      longterm: en.longterm ?? zhResult.longterm,
      tipsForCouple: en.tipsForCouple ?? zhResult.tipsForCouple,
      funFacts: en.funFacts ?? zhResult.funFacts,
    }
    // 重新生成 introByMode / differenceHintByMode，使其在英文环境里用英文模板
    merged.introByMode = {
      single: `From your perspective, the relationship looks closest to "${merged.title}". It captures how you understand your closeness, expression and daily rhythm — not a finalized two-sided verdict.`,
      dual: `Once both sets of answers are merged, the relationship's baseline reads closest to "${merged.title}". This is not any one person's view, but the Couple Type that emerges when you two interact.`,
    }
    merged.differenceHintByMode = {
      single: "If they answered, the result might not be identical. What matters is not just the type you got, but why you read the relationship this way.",
      dual: "The final type is just a label. What's more valuable is the most aligned and most misaligned axes — usually where understanding runs deepest and where misunderstandings most easily happen.",
    }
    return merged
  })
}

const RESULTS_LOCALIZED = {
  zh: RESULTS,
  en: mergeResultsEn(),
}

const RESULTS_MAP_LOCALIZED = {
  zh: RESULTS_MAP,
  en: Object.fromEntries(RESULTS_LOCALIZED.en.map((r) => [r.code, r])),
}

const TYPE_GROUP_META_LOCALIZED = {
  zh: TYPE_GROUP_META,
  en: Object.fromEntries(
    Object.entries(TYPE_GROUP_META).map(([code, zhMeta]) => {
      const en = TYPE_GROUP_META_EN[code]
      if (!en) return [code, zhMeta]
      return [code, { ...zhMeta, label: en.label, subtitle: en.subtitle, desc: en.desc }]
    })
  ),
}

const QUESTIONS_LOCALIZED = {
  zh: QUESTIONS,
  en: QUESTIONS.map((q) => ({ ...q, text: QUESTION_TEXT_EN[q.id] ?? q.text })),
}

function getLocalizedResults(lang) {
  return RESULTS_LOCALIZED[lang] || RESULTS_LOCALIZED.zh
}

function getLocalizedResultByCode(lang, code) {
  const map = RESULTS_MAP_LOCALIZED[lang] || RESULTS_MAP_LOCALIZED.zh
  return map[code]
}

function getLocalizedTypeGroupMeta(lang) {
  return TYPE_GROUP_META_LOCALIZED[lang] || TYPE_GROUP_META_LOCALIZED.zh
}

function getLocalizedQuestions(lang) {
  return QUESTIONS_LOCALIZED[lang] || QUESTIONS_LOCALIZED.zh
}

export function useLocalizedResults() {
  const { lang } = useLanguage()
  return useMemo(() => getLocalizedResults(lang), [lang])
}

export function useLocalizedResultByCode(code) {
  const { lang } = useLanguage()
  return useMemo(() => (code ? getLocalizedResultByCode(lang, code) : undefined), [lang, code])
}

export function useLocalizedTypeGroupMeta() {
  const { lang } = useLanguage()
  return useMemo(() => getLocalizedTypeGroupMeta(lang), [lang])
}

export function useLocalizedQuestions() {
  const { lang } = useLanguage()
  return useMemo(() => getLocalizedQuestions(lang), [lang])
}

export function useLocalizedQuestionModeCopy() {
  const { lang } = useLanguage()
  if (lang === 'en') return QUESTION_MODE_COPY_EN
  return null
}

export {
  getLocalizedResults,
  getLocalizedResultByCode,
  getLocalizedTypeGroupMeta,
  getLocalizedQuestions,
  TYPE_GROUP_ORDER,
}

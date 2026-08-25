import { useMemo } from 'react'
import { useLanguage } from './LanguageContext'
import { RESULTS, RESULTS_MAP } from '../data/results'
import { RESULTS_EN } from '../data/results.en'
import { QUESTIONS } from '../data/questions'
import { QUESTION_TEXT_EN, QUESTION_MODE_COPY_EN } from '../data/questions.en'
import { TYPE_GROUP_META, TYPE_GROUP_ORDER } from '../data/typeGroups'
import { TYPE_GROUP_META_EN } from '../data/typeGroups.en'

/**
 * CPTI 题库与结果文案的语言切换层（非文案表本身）
 *
 * 中文源数据保持权威；英文环境只覆盖可翻译字段，并保留 group、themeClass、
 * soulmate、nemesis 等结构性字段。未知语言一律回退到中文。
 *
 * 模块加载时预计算 RESULTS_LOCALIZED / QUESTIONS_LOCALIZED 等常量；
 * React hooks 只按当前 lang 取缓存，避免每次渲染都 merge。
 * 副作用：无（不读写 localStorage；语言状态来自 LanguageContext）
 */

/**
 * 把英文翻译（按 code 索引）与原始中文记录融合。
 * 仅替换翻译字段；保留 group / themeClass / soulmate / nemesis 等结构性字段。
 * @returns {typeof RESULTS} 与中文题库等长的结果数组
 */
function mergeResultsEn() {
  const enByCode = Object.fromEntries(RESULTS_EN.map((r) => [r.code, r]))
  return RESULTS.map((zhResult) => {
    const en = enByCode[zhResult.code]
    // 该类型尚无英译时沿用中文整条记录，避免缺字段把报告页打空
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

/** 色系元数据：英文只覆盖 label / subtitle / desc，色值与排序仍用中文源 */
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

/** 题干按 id 替换文案；dimension / polarity 等计分字段始终来自中文题库 */
const QUESTIONS_LOCALIZED = {
  zh: QUESTIONS,
  en: QUESTIONS.map((q) => ({ ...q, text: QUESTION_TEXT_EN[q.id] ?? q.text })),
}

/**
 * 按语言取 16 型结果列表；未知 lang 回退中文。
 * @param {string} lang `'zh'` | `'en'`
 * @returns {typeof RESULTS}
 */
function getLocalizedResults(lang) {
  return RESULTS_LOCALIZED[lang] || RESULTS_LOCALIZED.zh
}

/**
 * 按类型码取单条结果文案。
 * @param {string} lang `'zh'` | `'en'`
 * @param {string} code 四字母类型码，如 `SROD`
 * @returns {object | undefined} 查无此码时为 undefined
 */
function getLocalizedResultByCode(lang, code) {
  const map = RESULTS_MAP_LOCALIZED[lang] || RESULTS_MAP_LOCALIZED.zh
  return map[code]
}

/**
 * 按语言取四大色系元数据（标签、副标题、简介）。
 * @param {string} lang `'zh'` | `'en'`
 */
function getLocalizedTypeGroupMeta(lang) {
  return TYPE_GROUP_META_LOCALIZED[lang] || TYPE_GROUP_META_LOCALIZED.zh
}

/**
 * 按语言取问卷题干数组（题序与中文题库一致）。
 * @param {string} lang `'zh'` | `'en'`
 */
function getLocalizedQuestions(lang) {
  return QUESTIONS_LOCALIZED[lang] || QUESTIONS_LOCALIZED.zh
}

/**
 * 当前界面语言下的 16 型结果列表（随 LanguageContext 变化）。
 * @returns {typeof RESULTS}
 */
export function useLocalizedResults() {
  const { lang } = useLanguage()
  return useMemo(() => getLocalizedResults(lang), [lang])
}

/**
 * 按类型码取当前语言的单条结果；code 为空时不查表。
 * @param {string} [code]
 * @returns {object | undefined}
 */
export function useLocalizedResultByCode(code) {
  const { lang } = useLanguage()
  return useMemo(() => (code ? getLocalizedResultByCode(lang, code) : undefined), [lang, code])
}

/**
 * 当前语言下的色系元数据（蜜桃粉 / 湖水蓝 / 罗兰紫 / 薄荷绿）。
 */
export function useLocalizedTypeGroupMeta() {
  const { lang } = useLanguage()
  return useMemo(() => getLocalizedTypeGroupMeta(lang), [lang])
}

/**
 * 当前语言下的问卷题干；计分字段与中文题库对齐。
 */
export function useLocalizedQuestions() {
  const { lang } = useLanguage()
  return useMemo(() => getLocalizedQuestions(lang), [lang])
}

/**
 * 英文问卷的模式说明文案（单人速通 / 双人拼图）。
 * 中文调用方继续用 questions.js 内置 copy，因此非 en 返回 null。
 * @returns {object | null}
 */
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

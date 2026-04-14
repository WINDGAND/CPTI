/**
 * CPTI 客户端计分模块（纯函数，无任何副作用，全部在浏览器端执行）
 *
 * 依赖：
 *   - src/data/results.js  → RESULTS_MAP
 *
 * 题库约定接口（tasks 4 实现，此处对接）：
 *   questions[]: Array<{
 *     id:        string,
 *     dimension: 'SI' | 'RP' | 'OF' | 'DA',
 *     polarity:  1 | -1,
 *     // polarity=1  → 完全同意(index 0) 偏向第一字母 (S/R/O/D) +3
 *     // polarity=-1 → 完全同意(index 0) 偏向第二字母 (I/P/F/A) +3
 *   }>
 *
 *   answers[]: Array<{
 *     questionId:    string,
 *     selectedIndex: 0-6   // 0=完全同意 … 6=完全不同意
 *   }>
 */

import { RESULTS_MAP } from '../data/results'

// ─── 常量 ─────────────────────────────────────────────────────

/** 7 选项索引 → 原始得分（对应 PRD 2.2：+3, +2, +1, 0, -1, -2, -3） */
export const RAW_VALUES = [3, 2, 1, 0, -1, -2, -3]

/**
 * 各维度的字母对（正方向 / 负方向）
 * 正总分 → 第一字母；负总分 → 第二字母；0 → 第一字母（中性偏正）
 */
const DIMENSION_LETTERS = {
  SI: ['S', 'I'],
  RP: ['R', 'P'],
  OF: ['O', 'F'],
  DA: ['D', 'A'],
}

export const DIMENSION_DETAILS = {
  SI: { title: '空间距离', posKey: 'S', negKey: 'I', posLabel: '黏人', negLabel: '独立' },
  RP: { title: '情感表达', posKey: 'R', negKey: 'P', posLabel: '仪式感', negLabel: '务实' },
  OF: { title: '生活节奏', posKey: 'O', negKey: 'F', posLabel: '有序', negLabel: '随性' },
  DA: { title: '冲突解决', posKey: 'D', negKey: 'A', posLabel: '直球', negLabel: '缓冲' },
}

// ─── 核心函数 ─────────────────────────────────────────────────

/**
 * 计算四维原始得分
 *
 * @param {Array} questions  题库数组（含 dimension / polarity）
 * @param {Array} answers    用户作答数组（含 questionId / selectedIndex）
 * @returns {{ SI: number, RP: number, OF: number, DA: number }}
 *
 * 算法：对每道已作答题目
 *   rawValue = RAW_VALUES[selectedIndex]          // +3 ~ -3
 *   contribution = question.polarity × rawValue   // 乘极性翻转
 *   dimensionScore += contribution
 */
export function calculateDimensionScores(questions, answers) {
  // 以 questionId 为 key 建快速查表
  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]))
  const answerMap   = Object.fromEntries(answers.map((a) => [a.questionId, a]))

  const scores = { SI: 0, RP: 0, OF: 0, DA: 0 }

  for (const q of questions) {
    const answer = answerMap[q.id]
    if (answer == null) continue                     // 未作答跳过
    const rawValue   = RAW_VALUES[answer.selectedIndex] ?? 0
    scores[q.dimension] += q.polarity * rawValue
  }

  return scores
}

/**
 * 根据四维得分确定类型码与各维百分比
 *
 * @param {{ SI: number, RP: number, OF: number, DA: number }} dimensionScores
 * @param {number} questionsPerDimension  每维题目数量（决定最大可能得分）
 * @returns {{
 *   code: string,           // 如 'SROD'
 *   percentages: {          // 正反两侧各维百分比，之和恒为 100
 *     S: number, I: number,
 *     R: number, P: number,
 *     O: number, F: number,
 *     D: number, A: number,
 *   }
 * }}
 *
 * 百分比算法：
 *   max = questionsPerDimension × 3
 *   positivePercent = Math.round((score + max) / (2 * max) × 100)
 *   negativePercent = 100 - positivePercent
 *
 *   当 score=max  → 100% 正方向
 *   当 score=0    →  50%（中性，类型归正方向）
 *   当 score=-max →   0% 正方向（即 100% 负方向）
 */
export function determineType(dimensionScores, questionsPerDimension) {
  const max = questionsPerDimension * 3
  const percentages = {}
  let code = ''

  for (const [dim, [pos, neg]] of Object.entries(DIMENSION_LETTERS)) {
    const score   = dimensionScores[dim] ?? 0
    // 安全钳位：防止题库数量变化时越界
    const clamped = Math.max(-max, Math.min(max, score))

    const posPercent = max === 0
      ? 50
      : Math.round(((clamped + max) / (2 * max)) * 100)
    const negPercent = 100 - posPercent

    percentages[pos] = posPercent
    percentages[neg] = negPercent

    // 得分 ≥ 0 → 正方向字母（score=0 时默认正方向）
    code += clamped >= 0 ? pos : neg
  }

  return { code, percentages }
}

/**
 * 根据类型码从结果库中获取完整记录
 *
 * @param {string} code  四字母类型码，如 'SROD'
 * @returns {object | undefined}  results.js 中对应的记录
 */
export function getResultByCode(code) {
  return RESULTS_MAP[code]
}

function buildProfileFromScores(dimensionScores, questionsPerDimension) {
  const { code, percentages } = determineType(dimensionScores, questionsPerDimension)
  const result = getResultByCode(code)
  return {
    code,
    percentages,
    result,
    dimensionScores,
  }
}

function normalizeAnswers(rawAnswers) {
  return Object.entries(rawAnswers).map(([questionId, selectedIndex]) => ({
    questionId,
    selectedIndex,
  }))
}

function averageDimensionScores(scoresA, scoresB) {
  return Object.fromEntries(
    Object.keys(DIMENSION_LETTERS).map((dim) => [
      dim,
      Math.round(((scoresA[dim] ?? 0) + (scoresB[dim] ?? 0)) / 2),
    ])
  )
}

function computeAlignment(scoresA, scoresB, questionsPerDimension) {
  const maxGap = questionsPerDimension * 6
  const dimensions = Object.fromEntries(
    Object.entries(DIMENSION_DETAILS).map(([dim, meta]) => {
      const scoreA = scoresA[dim] ?? 0
      const scoreB = scoresB[dim] ?? 0
      const gap = Math.abs(scoreA - scoreB)
      const consensus = maxGap === 0 ? 100 : Math.round((1 - gap / maxGap) * 100)

      return [dim, {
        ...meta,
        scoreA,
        scoreB,
        gap,
        consensus,
      }]
    })
  )

  const ordered = Object.values(dimensions).sort((a, b) => a.gap - b.gap)

  return {
    dimensions,
    mostAlignedDimension: ordered[0],
    mostMisalignedDimension: ordered[ordered.length - 1],
  }
}

export function computeSingleModeResult(questions, rawAnswers, questionsPerDimension) {
  const answers = Array.isArray(rawAnswers) ? rawAnswers : normalizeAnswers(rawAnswers)
  const dimensionScores = calculateDimensionScores(questions, answers)
  const sourceAnswers = Array.isArray(rawAnswers)
    ? Object.fromEntries(rawAnswers.map((answer) => [answer.questionId, answer.selectedIndex]))
    : rawAnswers

  return {
    mode: 'single',
    perception: {
      ...buildProfileFromScores(dimensionScores, questionsPerDimension),
      sourceAnswers,
    },
  }
}

export function computeDualModeResult(questions, rawAnswerSets, questionsPerDimension) {
  const [playerARaw = {}, playerBRaw = {}] = rawAnswerSets
  const playerAAnswers = Array.isArray(playerARaw) ? playerARaw : normalizeAnswers(playerARaw)
  const playerBAnswers = Array.isArray(playerBRaw) ? playerBRaw : normalizeAnswers(playerBRaw)

  const playerAScores = calculateDimensionScores(questions, playerAAnswers)
  const playerBScores = calculateDimensionScores(questions, playerBAnswers)
  const relationshipScores = averageDimensionScores(playerAScores, playerBScores)
  const alignment = computeAlignment(playerAScores, playerBScores, questionsPerDimension)

  return {
    mode: 'dual',
    players: [
      { id: 'player-1', label: '第一位', ...buildProfileFromScores(playerAScores, questionsPerDimension) },
      { id: 'player-2', label: '第二位', ...buildProfileFromScores(playerBScores, questionsPerDimension) },
    ],
    relationship: buildProfileFromScores(relationshipScores, questionsPerDimension),
    alignment,
  }
}

/**
 * 一步完成：给定题库、答案、每维题数，直接返回 { code, percentages, result }
 * 便于 Questionnaire 完成后的一次性调用
 *
 * @param {Array}  questions
 * @param {Array}  answers
 * @param {number} questionsPerDimension
 * @returns {{ code: string, percentages: object, result: object }}
 */
export function computeResult(questions, answers, questionsPerDimension) {
  const normalizedAnswers = Array.isArray(answers) ? answers : normalizeAnswers(answers)
  const dimensionScores = calculateDimensionScores(questions, normalizedAnswers)
  return buildProfileFromScores(dimensionScores, questionsPerDimension)
}

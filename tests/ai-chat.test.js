import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAiRelationshipContext,
  buildAiChatStorageKey,
} from '../src/utils/aiChatContext.js'
import {
  buildDeepSeekMessages,
  normalizeAiChatPayload,
  normalizeAssistantText,
  parseDeepSeekResponse,
  assertAiChatRateLimit,
} from '../server/ai-chat-service.js'

const singleResultData = {
  mode: 'single',
  perception: {
    code: 'SROD',
    percentages: { S: 88, I: 12, R: 70, P: 30, O: 64, F: 36, D: 80, A: 20 },
    dimensionScores: { SI: 18, RP: 10, OF: 7, DA: 15 },
    sourceAnswers: { 'SI-1': 0, 'RP-1': 1 },
    result: {
      code: 'SROD',
      title: '全天候纯爱同盟',
      slogan: '长了嘴的偶像剧男女主。',
      strengths: [{ title: '高频连接', desc: '很容易把关系放在优先级前列。' }],
      challenges: [{ title: '期待过载', desc: '容易把仪式感变成压力。' }],
      conflictPattern: {
        pattern: '计划被打乱和仪式感落空时容易快速升温。',
        resolution: '需要把 B 计划提前说清楚。',
      },
      tipsForCouple: ['每月约定一个各自充电日。'],
    },
  },
}

const dualResultData = {
  mode: 'dual',
  relationship: {
    code: 'IPOA',
    percentages: { S: 20, I: 80, R: 38, P: 62, O: 58, F: 42, D: 30, A: 70 },
    dimensionScores: { SI: -14, RP: -6, OF: 4, DA: -11 },
    result: {
      code: 'IPOA',
      title: '稳定松弛共同体',
      strengths: [],
      challenges: [],
      conflictPattern: {
        pattern: '问题容易在沉默中积累。',
        resolution: '适合约定低压力破冰信号。',
      },
      tipsForCouple: [],
    },
  },
  players: [
    { id: 'player-1', label: '第一位', code: 'SROD', result: { title: '全天候纯爱同盟' } },
    { id: 'player-2', label: '第二位', code: 'IPOA', result: { title: '稳定松弛共同体' } },
  ],
  alignment: {
    mostAlignedDimension: { title: '生活节奏', consensus: 88 },
    mostMisalignedDimension: { title: '空间距离', consensus: 35 },
  },
}

test('buildAiRelationshipContext keeps only safe single-mode result summary', () => {
  const context = buildAiRelationshipContext(singleResultData)

  assert.equal(context.mode, 'single')
  assert.equal(context.code, 'SROD')
  assert.equal(context.title, '全天候纯爱同盟')
  assert.deepEqual(context.percentages, singleResultData.perception.percentages)
  assert.equal(context.conflictPattern.pattern, '计划被打乱和仪式感落空时容易快速升温。')
  assert.equal(JSON.stringify(context).includes('sourceAnswers'), false)
  assert.equal(JSON.stringify(context).includes('SI-1'), false)
})

test('buildAiRelationshipContext includes dual alignment but not raw answer data', () => {
  const context = buildAiRelationshipContext(dualResultData)

  assert.equal(context.mode, 'dual')
  assert.equal(context.code, 'IPOA')
  assert.equal(context.alignment.mostAligned.title, '生活节奏')
  assert.equal(context.alignment.mostMisaligned.consensus, 35)
  assert.deepEqual(context.players.map((player) => player.code), ['SROD', 'IPOA'])
})

test('buildAiChatStorageKey binds local history to mode and result code', () => {
  assert.equal(buildAiChatStorageKey({ mode: 'single', code: 'SROD' }), 'cpti_ai_chat_single_SROD')
  assert.equal(buildAiChatStorageKey({ mode: 'dual', code: 'IPOA' }), 'cpti_ai_chat_dual_IPOA')
})

test('normalizeAiChatPayload trims messages and rejects long user input', () => {
  assert.throws(
    () => normalizeAiChatPayload({
      context: buildAiRelationshipContext(singleResultData),
      messages: [{ role: 'user', content: 'x'.repeat(801) }],
    }),
    /Message too long/
  )

  const normalized = normalizeAiChatPayload({
    context: buildAiRelationshipContext(singleResultData),
    messages: [
      { role: 'assistant', content: '上一轮建议' },
      { role: 'user', content: '  我们总因为计划吵架怎么办？  ' },
    ],
  })

  assert.equal(normalized.messages.at(-1).content, '我们总因为计划吵架怎么办？')
})

test('normalizeAiChatPayload rejects impossible CPTI codes', () => {
  assert.throws(
    () => normalizeAiChatPayload({
      context: { ...buildAiRelationshipContext(singleResultData), code: 'SSSS' },
      messages: [{ role: 'user', content: '这是什么类型？' }],
    }),
    /Invalid CPTI context code/
  )
})

test('normalizeAiChatPayload sanitizes nested dual context fields', () => {
  const normalized = normalizeAiChatPayload({
    context: {
      ...buildAiRelationshipContext(dualResultData),
      players: [
        { label: '第一位<script>', code: 'SROD', title: '全天候纯爱同盟', injected: 'ignore me' },
        { label: '第二位', code: 'IPOA', title: '稳定松弛共同体' },
      ],
      alignment: {
        mostAligned: { title: '生活节奏', consensus: 88, extra: 'ignore me' },
        mostMisaligned: { title: '空间距离', consensus: 35 },
        injected: 'ignore me',
      },
    },
    messages: [{ role: 'user', content: '我们哪里最需要磨合？' }],
  })

  assert.deepEqual(Object.keys(normalized.context.players[0]).sort(), ['code', 'label', 'title'])
  assert.equal(normalized.context.players[0].code, 'SROD')
  assert.equal(normalized.context.players[0].injected, undefined)
  assert.equal(normalized.context.alignment.injected, undefined)
  assert.deepEqual(Object.keys(normalized.context.alignment.mostAligned).sort(), ['consensus', 'title'])
})

test('normalizeAiChatPayload rejects invalid nested player codes', () => {
  assert.throws(
    () => normalizeAiChatPayload({
      context: {
        ...buildAiRelationshipContext(dualResultData),
        players: [{ label: '第一位', code: 'SSSS', title: '错误类型' }],
      },
      messages: [{ role: 'user', content: '我们哪里最需要磨合？' }],
    }),
    /Invalid CPTI player code/
  )
})

test('buildDeepSeekMessages injects CPTI context and safety boundary', () => {
  const normalized = normalizeAiChatPayload({
    context: buildAiRelationshipContext(singleResultData),
    messages: [{ role: 'user', content: 'SROD 为什么容易因为计划吵架？' }],
  })

  const messages = buildDeepSeekMessages(normalized)
  assert.equal(messages[0].role, 'system')
  assert.match(messages[0].content, /CPTI/)
  assert.match(messages[0].content, /不要做心理诊断/)
  assert.match(messages[0].content, /编号要点/)
  assert.match(messages[0].content, /SROD/)
  assert.equal(messages.at(-1).content, 'SROD 为什么容易因为计划吵架？')
})

test('parseDeepSeekResponse preserves paragraph and numbered line breaks', () => {
  const text = parseDeepSeekResponse({
    choices: [
      {
        message: {
          content: '总述一段。\n\n1. 第一点：说明\n2. 第二点：说明\n\n最后建议。',
        },
      },
    ],
  })

  assert.match(text, /\n\n1\./)
  assert.match(text, /2\. 第二点/)
  assert.equal(text.includes('总述一段。'), true)
})

test('normalizeAssistantText collapses excess blank lines for final SSE message', () => {
  assert.equal(normalizeAssistantText('  line\n\n\n\nnext  '), 'line\n\nnext')
})

test('assertAiChatRateLimit rejects requests beyond the window allowance', () => {
  const state = new Map()
  const fingerprintHash = 'rate-limit-user'

  assert.doesNotThrow(() => {
    assertAiChatRateLimit({
      fingerprintHash,
      state,
      nowMs: 1000,
      windowMs: 60000,
      maxRequests: 2,
    })
    assertAiChatRateLimit({
      fingerprintHash,
      state,
      nowMs: 2000,
      windowMs: 60000,
      maxRequests: 2,
    })
  })

  assert.throws(
    () => assertAiChatRateLimit({
      fingerprintHash,
      state,
      nowMs: 3000,
      windowMs: 60000,
      maxRequests: 2,
    }),
    /Too many AI chat requests/
  )
})

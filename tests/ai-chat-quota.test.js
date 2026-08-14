import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { TRANSLATIONS } from '../src/i18n/translations.js'
import { sendAiChatMessage } from '../src/utils/aiChatApi.js'
import { buildAiRelationshipContext } from '../src/utils/aiChatContext.js'
import {
  createMemoryQuotaStore,
  encodeSseEvent,
  parseAiChatQuotaConfig,
  requestAiChatCompletion,
  reserveAiChatQuota,
  releaseAiChatQuota,
  secondsUntilNextShanghaiMidnight,
  shanghaiDayKey,
  streamAiChatCompletionEvents,
} from '../server/ai-chat-service.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const singleResultData = {
  mode: 'single',
  perception: {
    code: 'SROD',
    percentages: { S: 88, I: 12, R: 70, P: 30, O: 64, F: 36, D: 80, A: 20 },
    result: {
      code: 'SROD',
      title: '全天候纯爱同盟',
      slogan: 'slogan',
      strengths: [],
      challenges: [],
      conflictPattern: { pattern: 'p', resolution: 'r' },
      tipsForCouple: [],
    },
  },
}

function quotaLimits(overrides = {}) {
  return {
    burstLimit: 20,
    burstWindowSec: 900,
    dailyLimit: 50,
    globalDailyLimit: 3000,
    ...overrides,
  }
}

function validBody(text = '我们吵架了怎么办？') {
  return {
    context: buildAiRelationshipContext(singleResultData),
    messages: [{ role: 'user', content: text }],
  }
}

function createFakeSupabase(store, nowMs) {
  const calls = []
  return {
    calls,
    rpc(name, args) {
      calls.push({ name, args })
      if (name === 'reserve_ai_chat_quota') {
        return Promise.resolve({
          data: store.reserve({
            fingerprintHash: args.p_fingerprint,
            limits: {
              burstLimit: args.p_burst_limit,
              burstWindowSec: args.p_burst_window_sec,
              dailyLimit: args.p_daily_limit,
              globalDailyLimit: args.p_global_daily_limit,
            },
            nowMs,
          }),
          error: null,
        })
      }
      if (name === 'release_ai_chat_quota') {
        store.release({ fingerprintHash: args.p_fingerprint, nowMs })
        return Promise.resolve({ data: { ok: true }, error: null })
      }
      return Promise.resolve({ data: null, error: { message: `unknown rpc ${name}` } })
    },
  }
}

test('shanghaiDayKey uses Asia/Shanghai calendar date around midnight', () => {
  const beforeMidnight = Date.UTC(2026, 7, 14, 15, 59, 0)
  const atMidnight = Date.UTC(2026, 7, 14, 16, 0, 0)
  assert.equal(shanghaiDayKey(beforeMidnight), '2026-08-14')
  assert.equal(shanghaiDayKey(atMidnight), '2026-08-15')
})

test('secondsUntilNextShanghaiMidnight is about 60s just before CST midnight', () => {
  const retry = secondsUntilNextShanghaiMidnight(Date.UTC(2026, 7, 14, 15, 59, 0))
  assert.equal(retry >= 50 && retry <= 70, true)
})

test('daily quota resets after Shanghai midnight', () => {
  const store = createMemoryQuotaStore()
  const limits = quotaLimits({ dailyLimit: 1, burstLimit: 10 })
  const fingerprintHash = 'midnight-user'
  const before = Date.UTC(2026, 7, 14, 15, 59, 0)
  const after = Date.UTC(2026, 7, 14, 16, 1, 0)

  assert.equal(store.reserve({ fingerprintHash, limits, nowMs: before }).ok, true)
  assert.equal(store.reserve({ fingerprintHash, limits, nowMs: before }).code, 'ai-chat-daily-limited')
  assert.equal(store.reserve({ fingerprintHash, limits, nowMs: after }).ok, true)
  assert.equal(store.inspect({ fingerprintHash, nowMs: after }).daily.count, 1)
  assert.equal(store.inspect({ fingerprintHash, nowMs: before }).daily.count, 1)
})

test('daily quota is isolated per fingerprint but global is shared', () => {
  const store = createMemoryQuotaStore()
  const limits = quotaLimits({ dailyLimit: 1, burstLimit: 10, globalDailyLimit: 3 })

  assert.equal(store.reserve({ fingerprintHash: 'alice', limits, nowMs: 1_000 }).ok, true)
  assert.equal(store.reserve({ fingerprintHash: 'bob', limits, nowMs: 1_000 }).ok, true)
  assert.equal(store.reserve({ fingerprintHash: 'alice', limits, nowMs: 2_000 }).code, 'ai-chat-daily-limited')
  assert.equal(store.inspect({ fingerprintHash: 'bob', nowMs: 2_000 }).daily.count, 1)
  assert.equal(store.inspect({ fingerprintHash: 'alice', nowMs: 2_000 }).global, 2)
})

test('release never goes below zero', () => {
  const store = createMemoryQuotaStore()
  store.release({ fingerprintHash: 'ghost', nowMs: 1_000 })
  assert.equal(store.inspect({ fingerprintHash: 'ghost', nowMs: 1_000 }).daily.count, 0)
  assert.equal(store.inspect({ fingerprintHash: 'ghost', nowMs: 1_000 }).global, 0)
})

test('parseAiChatQuotaConfig reads all four env overrides', () => {
  const parsed = parseAiChatQuotaConfig({
    AI_CHAT_BURST_LIMIT: '12',
    AI_CHAT_BURST_WINDOW_SEC: '600',
    AI_CHAT_DAILY_LIMIT: '30',
    AI_CHAT_GLOBAL_DAILY_LIMIT: '1000',
  })
  assert.deepEqual(parsed, {
    burstLimit: 12,
    burstWindowSec: 600,
    dailyLimit: 30,
    globalDailyLimit: 1000,
  })
  assert.equal(parseAiChatQuotaConfig({ AI_CHAT_BURST_WINDOW_SEC: '0' }).burstWindowSec, 900)
  assert.equal(parseAiChatQuotaConfig({ AI_CHAT_GLOBAL_DAILY_LIMIT: 'nope' }).globalDailyLimit, 3000)
})

test('reserveAiChatQuota talks to supabase RPC with SQL argument names', async () => {
  const store = createMemoryQuotaStore()
  const nowMs = 1_000
  const supabase = createFakeSupabase(store, nowMs)
  const limits = quotaLimits({ burstLimit: 9, burstWindowSec: 120, dailyLimit: 7, globalDailyLimit: 11 })

  await reserveAiChatQuota({
    fingerprintHash: 'rpc-user',
    supabase,
    quotaConfig: limits,
    localState: new Map(),
    nowMs,
  })

  assert.equal(supabase.calls.length, 1)
  assert.deepEqual(supabase.calls[0], {
    name: 'reserve_ai_chat_quota',
    args: {
      p_fingerprint: 'rpc-user',
      p_burst_limit: 9,
      p_burst_window_sec: 120,
      p_daily_limit: 7,
      p_global_daily_limit: 11,
    },
  })
  assert.equal(store.inspect({ fingerprintHash: 'rpc-user', nowMs }).daily.count, 1)
})

test('supabase RPC denial becomes 429 and restores local burst slot', async () => {
  const store = createMemoryQuotaStore()
  const nowMs = 1_000
  const supabase = createFakeSupabase(store, nowMs)
  const localState = new Map()
  const limits = quotaLimits({ dailyLimit: 1, burstLimit: 5 })

  await reserveAiChatQuota({
    fingerprintHash: 'rpc-daily',
    supabase,
    quotaConfig: limits,
    localState,
    nowMs,
  })
  assert.equal(localState.get('rpc-daily').count, 1)

  await assert.rejects(
    () => reserveAiChatQuota({
      fingerprintHash: 'rpc-daily',
      supabase,
      quotaConfig: limits,
      localState,
      nowMs: 2_000,
    }),
    (error) => error.status === 429 && error.code === 'ai-chat-daily-limited' && error.retryAfterSec > 0,
  )

  assert.equal(localState.get('rpc-daily').count, 1)
  assert.equal(store.inspect({ fingerprintHash: 'rpc-daily', nowMs }).daily.count, 1)
})

test('supabase RPC failure fail-closes and does not keep a local burst charge', async () => {
  const localState = new Map()
  const supabase = {
    rpc: async () => ({ data: null, error: { message: 'connection reset' } }),
  }

  await assert.rejects(
    () => reserveAiChatQuota({
      fingerprintHash: 'rpc-down',
      supabase,
      quotaConfig: quotaLimits(),
      localState,
      nowMs: 1_000,
    }),
    (error) => error.code === 'ai-chat-quota-unavailable' && error.status === 503,
  )
  assert.equal(localState.get('rpc-down')?.count || 0, 0)
})

test('invalid payload is rejected before quota reservation or DeepSeek', async () => {
  let reserved = 0
  let fetched = 0
  const quotaStore = {
    reserve() {
      reserved += 1
      return { ok: true }
    },
    release() {},
  }

  await assert.rejects(
    () => streamAiChatCompletionEvents({
      apiKey: 'sk-test',
      quotaStore,
      fingerprintHash: 'bad-payload',
      localState: new Map(),
      body: {
        context: { code: 'SSSS', mode: 'single' },
        messages: [{ role: 'user', content: 'hi' }],
      },
      fetchImpl: async () => {
        fetched += 1
        return new Response('nope')
      },
    }),
    /Invalid CPTI context code/,
  )

  assert.equal(reserved, 0)
  assert.equal(fetched, 0)
})

test('missing DeepSeek key is rejected before quota reservation', async () => {
  let reserved = 0
  await assert.rejects(
    () => streamAiChatCompletionEvents({
      quotaStore: {
        reserve() {
          reserved += 1
          return { ok: true }
        },
      },
      fingerprintHash: 'no-key',
      body: validBody(),
    }),
    (error) => error.code === 'deepseek-key-missing',
  )
  assert.equal(reserved, 0)
})

test('requestAiChatCompletion rolls back quota when upstream fails before a 200', async () => {
  const quotaStore = createMemoryQuotaStore()
  const localState = new Map()
  const limits = quotaLimits({ dailyLimit: 1 })
  const fingerprintHash = 'json-rollback'

  await assert.rejects(
    () => requestAiChatCompletion({
      apiKey: 'sk-test',
      quotaStore,
      quotaConfig: limits,
      localState,
      fingerprintHash,
      nowMs: 1_000,
      body: validBody(),
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'nope' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    }),
    (error) => error.code === 'deepseek-request-failed',
  )

  assert.equal(quotaStore.inspect({ fingerprintHash, nowMs: 1_000 }).daily.count, 0)
})

test('requestAiChatCompletion keeps quota after a successful JSON reply', async () => {
  const quotaStore = createMemoryQuotaStore()
  const fingerprintHash = 'json-keep'
  const result = await requestAiChatCompletion({
    apiKey: 'sk-test',
    quotaStore,
    quotaConfig: quotaLimits({ dailyLimit: 1 }),
    localState: new Map(),
    fingerprintHash,
    nowMs: 1_000,
    body: validBody(),
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: '先把情绪放慢。\n\n1. 小标题：说明\n\n今晚试一次。' } }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  })

  assert.match(result.message, /先把情绪放慢/)
  assert.equal(quotaStore.inspect({ fingerprintHash, nowMs: 1_000 }).daily.count, 1)
})

test('HTTP 200 empty stream does not roll back because tokens may already be billed', async () => {
  const quotaStore = createMemoryQuotaStore()
  const fingerprintHash = 'empty-200'

  await assert.rejects(
    () => streamAiChatCompletionEvents({
      apiKey: 'sk-test',
      quotaStore,
      quotaConfig: quotaLimits({ dailyLimit: 1 }),
      localState: new Map(),
      fingerprintHash,
      nowMs: 1_000,
      body: validBody(),
      fetchImpl: async () => new Response('data: [DONE]\n\n', {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    }),
    (error) => error.code === 'ai-empty-response',
  )

  assert.equal(quotaStore.inspect({ fingerprintHash, nowMs: 1_000 }).daily.count, 1)
})

test('client SSE parser preserves quota error code for the UI', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(
    encodeSseEvent({ type: 'open', t: 1 })
      + encodeSseEvent({
        error: 'Too many AI chat requests in a short time',
        code: 'ai-chat-rate-limited',
        status: 429,
        retry_after_sec: 87,
      }),
    {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    },
  )

  try {
    await assert.rejects(
      () => sendAiChatMessage({
        context: { code: 'SROD', mode: 'single' },
        messages: [{ role: 'user', content: 'hello' }],
      }),
      (error) => error.code === 'ai-chat-rate-limited' && error.status === 429,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('frontend i18n has distinct copy for the three quota codes', () => {
  for (const locale of ['zh', 'en']) {
    const chat = TRANSLATIONS[locale].chat
    assert.equal(typeof chat.err_rate_limited, 'string')
    assert.equal(typeof chat.err_daily_limited, 'string')
    assert.equal(typeof chat.err_global_limited, 'string')
    assert.notEqual(chat.err_rate_limited, chat.err_daily_limited)
    assert.notEqual(chat.err_daily_limited, chat.err_global_limited)
    assert.notEqual(chat.err_rate_limited, chat.err_default)
  }
  assert.match(TRANSLATIONS.zh.chat.err_rate_limited, /休息几分钟/)
  assert.match(TRANSLATIONS.zh.chat.err_daily_limited, /今天先聊到这儿/)
  assert.match(TRANSLATIONS.zh.chat.err_global_limited, /忙不过来/)
})

test('chat UI maps quota codes before the generic fallback', () => {
  const source = readFileSync(join(root, 'src/components/chat/AiRelationshipChat.jsx'), 'utf8')
  const rateIdx = source.indexOf("error?.code === 'ai-chat-rate-limited'")
  const dailyIdx = source.indexOf("error?.code === 'ai-chat-daily-limited'")
  const globalIdx = source.indexOf("error?.code === 'ai-chat-global-limited'")
  const fallbackIdx = source.indexOf("t('chat.err_default')")
  assert.equal(rateIdx > 0 && dailyIdx > rateIdx && globalIdx > dailyIdx && fallbackIdx > globalIdx, true)
})

test('Vercel and Cloudflare handlers pass Supabase env and quota config', () => {
  const vercel = readFileSync(join(root, 'api/ai-chat.js'), 'utf8')
  const cloudflare = readFileSync(join(root, 'functions/api/ai-chat.js'), 'utf8')

  for (const source of [vercel, cloudflare]) {
    assert.match(source, /parseAiChatQuotaConfig/)
    assert.match(source, /supabaseUrl/)
    assert.match(source, /serviceRoleKey/)
    assert.match(source, /retry_after_sec/)
    assert.match(source, /quotaConfig/)
  }
})

test('SQL schema has tables, RLS, atomic RPCs and service_role-only execute', () => {
  const sql = readFileSync(join(root, 'supabase/ai_chat_quota.sql'), 'utf8')
  assert.match(sql, /create table if not exists public\.ai_chat_quota_daily/)
  assert.match(sql, /create table if not exists public\.ai_chat_quota_global/)
  assert.match(sql, /enable row level security/)
  assert.match(sql, /for update/)
  assert.match(sql, /create or replace function public\.reserve_ai_chat_quota/)
  assert.match(sql, /create or replace function public\.release_ai_chat_quota/)
  assert.match(sql, /Asia\/Shanghai/)
  assert.match(sql, /ai-chat-rate-limited/)
  assert.match(sql, /ai-chat-daily-limited/)
  assert.match(sql, /ai-chat-global-limited/)
  assert.match(sql, /revoke all on function public\.reserve_ai_chat_quota/)
  assert.match(sql, /grant execute on function public\.reserve_ai_chat_quota.*to service_role/)
  assert.equal(sql.includes('content'), false)
})

test('env example documents the four quota knobs', () => {
  const envExample = readFileSync(join(root, '.env.example'), 'utf8')
  assert.match(envExample, /AI_CHAT_BURST_LIMIT=20/)
  assert.match(envExample, /AI_CHAT_BURST_WINDOW_SEC=900/)
  assert.match(envExample, /AI_CHAT_DAILY_LIMIT=50/)
  assert.match(envExample, /AI_CHAT_GLOBAL_DAILY_LIMIT=3000/)
})

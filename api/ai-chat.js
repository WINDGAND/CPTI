import {
  encodeSseEvent,
  parseAiChatQuotaConfig,
  streamAiChatCompletionEvents,
} from '../server/ai-chat-service.js'
import {
  normalizeClientIp,
  sha256Hex,
} from '../server/stats-service.js'

/**
 * AI 关系助手 — Vercel Edge Runtime
 *
 * 为什么是 edge？
 *   - Vercel Node 默认 runtime 会 buffer 整段响应（res.write 直到 res.end 才下发），
 *     导致 SSE 在客户端看起来「点了好久才一次性出来」或者「直接没反应」。
 *   - Edge 原生 Web Streams，配合 X-Accel-Buffering: no，能让首字节立刻到达浏览器。
 *
 * 额外：在打开 DeepSeek 之前先发一个 keep-alive 心跳事件（type: 'open'），
 * 让客户端尽早收到首字节，避免误判超时。
 */
export const config = {
  runtime: 'edge',
}

function buildClientIp(request) {
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()
  return normalizeClientIp(request.headers.get('x-forwarded-for') || '')
}

async function buildFingerprint(request) {
  const ip = buildClientIp(request)
  const ua = request.headers.get('user-agent') || ''
  return sha256Hex(`${ip}|${ua}`)
}

async function readJsonBody(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: {
        Allow: 'POST',
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
  }

  const body = await readJsonBody(request)
  const fingerprintHash = await buildFingerprint(request)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // 立即发送一个开端心跳（不含 delta），客户端识别但忽略内容；
      // 作用：让浏览器尽早收到首字节，阻止前端 first-byte timeout 误判。
      controller.enqueue(encoder.encode(encodeSseEvent({ type: 'open', t: Date.now() })))

      // DeepSeek 偶尔首 token 较慢，每 10s 再补一次心跳；
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
        } catch {
          /* stream closed */
        }
      }, 10_000)

      try {
        await streamAiChatCompletionEvents({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseUrl: process.env.DEEPSEEK_BASE_URL,
          model: process.env.DEEPSEEK_MODEL,
          supabaseUrl: process.env.SUPABASE_URL,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          quotaConfig: parseAiChatQuotaConfig(process.env),
          fetchImpl: fetch,
          body,
          fingerprintHash,
          onEvent: (event) => {
            controller.enqueue(encoder.encode(encodeSseEvent(event)))
          },
        })
      } catch (error) {
        const status = Number(error?.status) || 500
        controller.enqueue(encoder.encode(encodeSseEvent({
          error: error instanceof Error ? error.message : 'Unexpected error',
          code: error?.code || 'ai-chat-error',
          status,
          retry_after_sec: Number(error?.retryAfterSec) || 0,
        })))
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // 关键：禁用任何代理/CDN 缓冲（Vercel 边缘 / nginx），保证 SSE 真的"流"出去
      'X-Accel-Buffering': 'no',
    },
  })
}

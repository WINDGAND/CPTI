import {
  encodeSseEvent,
  parseAiChatQuotaConfig,
  streamAiChatCompletionEvents,
} from '../../server/ai-chat-service.js'
import {
  normalizeClientIp,
  sha256Hex,
} from '../../server/stats-service.js'

async function readBody(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

function getRequestIp(request) {
  const cfIp = request.headers.get('CF-Connecting-IP')
  if (cfIp) return cfIp.trim()
  return normalizeClientIp(request.headers.get('x-forwarded-for'))
}

async function buildFingerprintHash(request) {
  const ip = getRequestIp(request)
  const userAgent = request.headers.get('user-agent') || ''
  return sha256Hex(`${ip}|${userAgent}`)
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: {
        Allow: 'POST',
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
  }

  const body = await readBody(context.request)
  const fingerprintHash = await buildFingerprintHash(context.request)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // 首字节心跳：让客户端立刻知道连接已建立，避免误判 first-byte timeout
      controller.enqueue(encoder.encode(encodeSseEvent({ type: 'open', t: Date.now() })))

      // 上游慢时每 10s 补一次 SSE comment 心跳
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
        } catch {
          /* stream closed */
        }
      }, 10_000)

      try {
        await streamAiChatCompletionEvents({
          apiKey: context.env.DEEPSEEK_API_KEY,
          baseUrl: context.env.DEEPSEEK_BASE_URL,
          model: context.env.DEEPSEEK_MODEL,
          supabaseUrl: context.env.SUPABASE_URL,
          serviceRoleKey: context.env.SUPABASE_SERVICE_ROLE_KEY,
          quotaConfig: parseAiChatQuotaConfig(context.env),
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
      'X-Accel-Buffering': 'no',
    },
  })
}

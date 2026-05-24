import {
  encodeSseEvent,
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
      try {
        await streamAiChatCompletionEvents({
          apiKey: context.env.DEEPSEEK_API_KEY,
          baseUrl: context.env.DEEPSEEK_BASE_URL,
          model: context.env.DEEPSEEK_MODEL,
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
        })))
      } finally {
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
    },
  })
}

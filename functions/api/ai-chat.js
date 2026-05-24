import { requestAiChatCompletion } from '../../server/ai-chat-service.js'
import {
  normalizeClientIp,
  sha256Hex,
} from '../../server/stats-service.js'

function jsonResponse(payload, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  })
}

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
    return jsonResponse(
      { ok: false, error: 'Method not allowed' },
      { status: 405, headers: { Allow: 'POST' } }
    )
  }

  try {
    const data = await requestAiChatCompletion({
      apiKey: context.env.DEEPSEEK_API_KEY,
      baseUrl: context.env.DEEPSEEK_BASE_URL,
      model: context.env.DEEPSEEK_MODEL,
      fetchImpl: fetch,
      body: await readBody(context.request),
      fingerprintHash: await buildFingerprintHash(context.request),
    })

    return jsonResponse({ ok: true, data }, { status: 200 })
  } catch (error) {
    const status = Number(error?.status) || 500
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
        code: error?.code || 'ai-chat-error',
      },
      { status }
    )
  }
}

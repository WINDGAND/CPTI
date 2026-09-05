/**
 * 测评结果提交 API（Vercel Serverless Function）
 *
 * 职责：
 *   - 接收 POST 请求中的 CPTI 结果码与测评模式
 *   - 从请求头提取 IP + UA 生成指纹，用于滑动窗口速率限制
 *   - 调用 stats-service 校验结果码、模式后写入 quiz_submissions
 *
 * 响应：
 *   - 200 { ok: true }                提交成功
 *   - 405 { ok: false, error }        非 POST 请求
 *   - 400/429/500 { ok: false, error } 校验失败、限流或数据库错误
 */

import {
  normalizeClientIp,
  normalizeSubmissionPayload,
  sha256Hex,
  submitStatsData,
} from '../server/stats-service.js'

/**
 * 统一读取请求体：兼容已解析对象与 JSON 字符串
 *
 * @param {import('http').IncomingMessage} req
 * @returns {object}
 */
function readBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body
}

/**
 * 基于请求头构建客户端指纹（IP + UA 的 SHA-256）
 *
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>} 64 位十六进制指纹
 */
async function buildFingerprint(req) {
  const ipHeader = req.headers['x-forwarded-for']
  const ip = normalizeClientIp(Array.isArray(ipHeader) ? ipHeader[0] : ipHeader)
  const ua = req.headers['user-agent'] || ''
  return sha256Hex(`${ip}|${ua}`)
}

/**
 * Vercel API 路由主处理器
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = readBody(req)
    const { resultCode, mode } = normalizeSubmissionPayload(body)
    const fingerprintHash = await buildFingerprint(req)
    await submitStatsData({
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      fetchImpl: fetch,
      resultCode,
      mode,
      fingerprintHash,
    })

    return res.status(200).json({ ok: true })
  } catch (error) {
    const status = Number(error?.status) || 500
    return res.status(status).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
    })
  }
}

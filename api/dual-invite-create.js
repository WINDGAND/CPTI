/**
 * @file 双人邀请创建 API 路由（Vercel Serverless Function）。
 *
 * 前端「发起邀请」流程的入口：接收 A 方答案与配置，写入 Supabase
 * 并返回邀请信息；具体业务规则（参数校验、令牌生成、过期时间等）
 * 统一收敛在 server/invite-service.js 中，本文件只做薄封装。
 */

import {
  createDualInvite,
  normalizeCreateInvitePayload,
} from '../server/invite-service.js'

/**
 * 读取并解析请求体。
 * 兼容两种情况：Vercel 已自动解析好的对象直接返回；
 * 若是原始 JSON 字符串则尝试解析，解析失败时降级为空对象（不抛错，
 * 交由后续的参数校验步骤统一返回 400）。
 *
 * @param {import('http').IncomingMessage & { body?: object|string }} req 请求对象
 * @returns {object} 解析后的请求体对象；缺失或非法时返回 {}
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
 * Vercel API 路由：创建「双人邀请」。
 *
 * 职责：接收发起方（A 方）提交的答案与配置，校验并归一化参数后，
 * 调用 server/invite-service.js 的 createDualInvite 在 Supabase 中
 * 生成一条邀请记录，返回邀请 ID / 令牌供前端拼装分享链接。
 *
 * 请求：POST，JSON 请求体（经 normalizeCreateInvitePayload 校验）：
 *   - answersA:       发起方的答案数组
 *   - questionCount:  题目总数（1~200）
 *   - schemaVersion:  数据结构版本，默认 'v1'
 *   - ttlHours:       邀请有效期（小时），默认取服务端配置值
 *
 * 响应：
 *   - 200: { ok: true, data: <创建的邀请记录> }
 *   - 405: 非 POST 请求（method-not-allowed）
 *   - 400: 参数非法（invalid-question-count 等，透传服务端 code）
 *   - 5xx: Supabase 调用失败或其他异常，状态码透传 error.status
 *
 * @param {import('http').IncomingMessage} req 请求对象
 * @param {import('http').ServerResponse} res 响应对象
 */
export default async function handler(req, res) {
  // 仅允许 POST；其余方法返回 405 并通过 Allow 头声明可用方法
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed', code: 'method-not-allowed' })
  }

  try {
    // 1) 解析请求体；2) 校验/归一化参数（非法时抛 400）；
    // 3) 使用服务端环境变量中的 Supabase 凭据与全局 fetch 创建邀请记录
    const body = readBody(req)
    const payload = normalizeCreateInvitePayload(body)
    const created = await createDualInvite({
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      fetchImpl: fetch,
      ...payload,
    })

    return res.status(200).json({ ok: true, data: created })
  } catch (error) {
    // 服务层抛出的错误带有 status / code 时优先透传，
    // 便于前端按业务错误码区分处理；否则按 500 兜底
    const status = Number(error?.status) || 500
    return res.status(status).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
      code: error?.code || 'invite-create-error',
    })
  }
}

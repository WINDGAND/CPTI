import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircleHeart, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react'
import { sendAiChatMessage } from '../../utils/aiChatApi'
import { buildAiChatStorageKey, buildAiRelationshipContext } from '../../utils/aiChatContext'

const MAX_LOCAL_MESSAGES = 16

function createMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

function readStoredMessages(storageKey) {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((message) => ['user', 'assistant'].includes(message?.role) && message?.content)
      .slice(-MAX_LOCAL_MESSAGES)
  } catch {
    return []
  }
}

function formatError(error) {
  if (error?.code === 'message-too-long' || error?.status === 400) {
    return '这次输入有点长，可以拆成一个更具体的问题再问我。'
  }
  if (error?.code === 'deepseek-key-missing') {
    return 'AI 服务还没有配置好 DeepSeek Key，部署环境需要补充环境变量。'
  }
  if (error?.status === 504) {
    return 'AI 这次思考超时了，稍后再试一次。'
  }
  return error?.message || 'AI 关系助手暂时没有回应，请稍后重试。'
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm',
          isUser
            ? 'rounded-br-sm text-white'
            : 'rounded-bl-sm border border-white/70 bg-white/90 text-base-text',
        ].join(' ')}
        style={isUser ? { backgroundColor: 'var(--poster-accent)' } : undefined}
      >
        {message.content.split('\n').map((line, index) => (
          <p key={index} className={index > 0 ? 'mt-2' : ''}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

export default function AiRelationshipChat({ resultData }) {
  const context = useMemo(() => buildAiRelationshipContext(resultData), [resultData])
  const storageKey = useMemo(() => buildAiChatStorageKey(context), [context])
  const [messages, setMessages] = useState(() => readStoredMessages(storageKey))
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef(null)

  const suggestions = useMemo(() => {
    const code = context.code || '这类关系'
    return [
      `${code} 型最容易因为什么小事吵起来？`,
      '当我们一个想靠近、一个想冷静时，可以怎么说？',
      '给我们一个今晚就能试的沟通练习。',
    ]
  }, [context.code])

  useEffect(() => {
    setMessages(readStoredMessages(storageKey))
    setError('')
  }, [storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_LOCAL_MESSAGES)))
  }, [messages, storageKey])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  async function sendMessage(nextContent) {
    const content = String(nextContent ?? input).trim()
    if (!content || isSending) return

    const userMessage = createMessage('user', content)
    const nextMessages = [...messages, userMessage].slice(-MAX_LOCAL_MESSAGES)

    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsSending(true)

    try {
      const assistantText = await sendAiChatMessage({
        context,
        messages: nextMessages.map(({ role, content }) => ({ role, content })).slice(-6),
      })
      setMessages((current) => [
        ...current,
        createMessage('assistant', assistantText),
      ].slice(-MAX_LOCAL_MESSAGES))
    } catch (err) {
      setError(formatError(err))
    } finally {
      setIsSending(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    sendMessage()
  }

  function clearHistory() {
    setMessages([])
    setError('')
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }
  }

  return (
    <section
      id="ai-relationship-chat"
      className="mt-10 overflow-hidden rounded-[24px] border border-white/70 bg-white/80 shadow-card backdrop-blur"
      style={{
        background: 'linear-gradient(145deg, color-mix(in srgb, var(--poster-accent) 14%, white), rgba(255,255,255,0.92) 52%, white)',
      }}
    >
      <div className="border-b border-white/80 px-4 py-5 sm:px-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ backgroundColor: 'var(--poster-accent)' }}
          >
            <MessageCircleHeart size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-base-text">AI 关系助手</h3>
              <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-base-mute">
                基于 {context.code} 结果
              </span>
            </div>
            <p className="mt-1 text-xs leading-6 text-base-mute">
              带着这份 CPTI 报告继续聊：它会结合你们的类型、冲突模式和相处建议，帮你把一个具体问题拆小一点。
            </p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              className="rounded-full p-2 text-base-mute transition-colors hover:bg-white hover:text-base-text"
              onClick={clearHistory}
              aria-label="清空 AI 聊天记录"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[520px] min-h-[260px] space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/80 bg-white/70 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={15} style={{ color: 'var(--poster-accent)' }} />
                <p className="text-sm font-semibold text-base-text">可以从这些问题开始</p>
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-left text-xs leading-5 text-base-text transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50"
                    onClick={() => sendMessage(suggestion)}
                    disabled={isSending}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
            <p className="px-1 text-[11px] leading-5 text-base-mute">
              提醒：AI 只能提供沟通参考，不能替代心理咨询、医疗建议或现实中的安全求助。
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        {isSending && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-white/70 bg-white/90 px-4 py-3 text-xs text-base-mute shadow-sm">
              <RefreshCw size={14} className="animate-spin" />
              正在结合你们的光谱结果思考...
            </div>
          </motion.div>
        )}
        <div ref={scrollRef} />
      </div>

      {error && (
        <div className="mx-4 mb-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-600 sm:mx-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-white/80 p-3 sm:p-4">
        <div className="flex items-end gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm focus-within:border-brand-cyan">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="比如：我们总因为计划变化吵架，我该怎么开口？"
            rows={2}
            maxLength={800}
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-base-text outline-none placeholder:text-gray-300"
            disabled={isSending}
          />
          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: 'var(--poster-accent)' }}
            disabled={!input.trim() || isSending}
            aria-label="发送给 AI 关系助手"
          >
            <Send size={17} />
          </button>
        </div>
        <div className="mt-2 flex justify-between px-1 text-[10px] text-base-mute">
          <span>聊天记录仅保存在当前浏览器，不会写入数据库。</span>
          <span>{input.length}/800</span>
        </div>
      </form>
    </section>
  )
}

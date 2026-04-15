import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LikertScale from './LikertScale'
import { QUESTION_MODE_COPY, QUESTIONS, getQuestionPrompt } from '../data/questions'
import {
  createDualInviteLink,
  readDualInviteFromSearch,
  stripDualInviteFromUrl,
} from '../utils/inviteCodec'
import { consumeDualInvite, createDualInvite, probeDualInvite } from '../utils/statsApi'

const INITIAL_COUNT = 6
const LOAD_STEP     = 6          // 每次多加载 6 题，减少触发次数
const ANSWER_COOLDOWN_MS = 1200  // 两次作答之间最短间隔（ms）

const INVITE_ERROR_COPY = {
  'legacy-link-unsupported': '这份邀请链接来自旧版本，暂时无法继续，请让对方重新发起双人拼图。',
  'invalid-token': '这份邀请链接无法识别，请让对方重新复制完整链接。',
  'invite-invalid': '这份邀请链接无效或不存在，请让对方重新发起双人拼图。',
  'invite-used': '这份邀请链接已被使用，不能重复参与，请让对方重新发起双人拼图。',
  'invite-expired': '这份邀请链接已过期（有效期24小时），请让对方重新发起双人拼图。',
  'question-count-mismatch': '这份邀请链接和当前题库不匹配，请让对方重新发起一次双人拼图。',
}

/**
 * Questionnaire — 完整答题流程（PRD 3.2.1 / 3.1）
 *
 * 第 0 题（模式选择）与正式题目视觉完全一致，共同列在同一列表中。
 * 进度条始终 sticky 可见，从 0% 推进到 100%。
 *
 * Props:
 *   onComplete(answers: { [qId]: selectedIndex }) — 答完后回调给 App
 */
export default function Questionnaire({ onComplete }) {
  const initialInviteStatus = typeof window !== 'undefined'
    ? readDualInviteFromSearch(window.location.search).status
    : 'idle'

  const [selectedMode, setSelectedMode] = useState(null)
  const [answers, setAnswers] = useState({})
  const [dualAnswerSets, setDualAnswerSets] = useState([{}, {}])
  const [activePlayerIdx, setActivePlayerIdx] = useState(0)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [enteredFromInvite, setEnteredFromInvite] = useState(false)
  const [completionError, setCompletionError] = useState('')
  const [focusedIdx, setFocusedIdx] = useState(0)
  const [revealCount, setRevealCount] = useState(INITIAL_COUNT)
  const [cooldownMsg, setCooldownMsg] = useState(false)  // 作答过快提示

  const itemRefs         = useRef([])
  const sentinelRef      = useRef(null)
  const q0Ref            = useRef(null)
  // 用 ref 镜像 revealCount / modeChosen，避免 scroll 闭包拿到旧值
  const revealCountRef   = useRef(INITIAL_COUNT)
  const modeChosenRef    = useRef(false)
  const lastAnswerTimeRef = useRef(0)
  const cooldownTimerRef  = useRef(null)
  // 作答后锁定焦点索引，防止滚动动画期间 scroll 监听器错误覆盖
  const scrollLockRef     = useRef(null)

  const total         = QUESTIONS.length
  const answeredCount = Object.keys(answers).length
  const modeChosen = selectedMode !== null
  const currentModeCopy = selectedMode ? QUESTION_MODE_COPY[selectedMode] : null
  const progress = modeChosen ? (answeredCount / total) * 100 : 0

  // 同步 ref
  useEffect(() => { revealCountRef.current = revealCount }, [revealCount])
  useEffect(() => { modeChosenRef.current  = modeChosen  }, [modeChosen])

  // ── 滚动：聚焦题 + 接近底部时兜底加载 ────────────────────
  useEffect(() => {
    function onScroll() {
      const distFromBottom =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight

      // 兜底懒加载（不受焦点锁影响，始终执行）
      if (modeChosenRef.current && revealCountRef.current < total) {
        if (distFromBottom < 500) {
          setRevealCount(c => Math.min(c + LOAD_STEP, total))
        }
      }

      // 作答后滚动动画期间：锁定焦点到目标题，防止中途跳题
      if (scrollLockRef.current !== null) {
        setFocusedIdx(scrollLockRef.current)
        return
      }

      // 接近页面底部时（300px 内），焦点中心动态向下偏移：
      // 距底 300px → ratio=0.45；到达底部 → ratio=0.80
      // 确保最后几道题也能被正确聚焦
      const focusRatio = distFromBottom < 300
        ? 0.45 + (1 - distFromBottom / 300) * 0.35
        : 0.45
      const viewCenter = window.scrollY + window.innerHeight * focusRatio

      // 聚焦追踪
      let closest = -1
      let minDist = Infinity
      if (q0Ref.current) {
        const rect  = q0Ref.current.getBoundingClientRect()
        const elMid = window.scrollY + rect.top + rect.height / 2
        minDist = Math.abs(elMid - viewCenter)
      }
      itemRefs.current.forEach((el, idx) => {
        if (!el) return
        const rect  = el.getBoundingClientRect()
        const elMid = window.scrollY + rect.top + rect.height / 2
        const dist  = Math.abs(elMid - viewCenter)
        if (dist < minDist) { minDist = dist; closest = idx }
      })
      setFocusedIdx(closest)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [total])

  // ── IntersectionObserver 哨兵（提前 300px 触发） ──────────
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || revealCount >= total) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setRevealCount(c => Math.min(c + LOAD_STEP, total))
    }, { threshold: 0, rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [revealCount, total])

  // 卸载时清理定时器
  useEffect(() => () => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
  }, [])

  useEffect(() => {
    if (!completionError) return undefined
    const timer = setTimeout(() => setCompletionError(''), 2500)
    return () => clearTimeout(timer)
  }, [completionError])

  useEffect(() => {
    if (!inviteCopied) return undefined
    const timer = setTimeout(() => setInviteCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [inviteCopied])

  useEffect(() => {
    const parsed = readDualInviteFromSearch()

    if (parsed.status === 'ready') {
      const emptyAnswers = {}
      setSelectedMode('dual')
      setAnswers(emptyAnswers)
      setDualAnswerSets([emptyAnswers, emptyAnswers])
      setActivePlayerIdx(1)
      setInviteLink('')
      setInviteCopied(false)
      setInviteToken(parsed.token)
      setInviteError('')
      setEnteredFromInvite(true)
      setRevealCount(INITIAL_COUNT)
      setFocusedIdx(0)
      lastAnswerTimeRef.current = 0
      scrollLockRef.current = null
      probeDualInvite(parsed.token)
        .then((data) => {
          if (data.status !== 'ready') {
            const statusToReason = {
              used: 'invite-used',
              expired: 'invite-expired',
              invalid: 'invite-invalid',
            }
            const message = INVITE_ERROR_COPY[statusToReason[data.status]] || '这份邀请链接暂时不可用，请让对方重新发起。'
            setInviteError(message)
            setSelectedMode(null)
            setEnteredFromInvite(false)
            setInviteToken('')
          }
        })
        .catch((error) => {
          const reason = error?.code || 'invite-invalid'
          setInviteError(INVITE_ERROR_COPY[reason] || '这份邀请链接暂时不可用，请让对方重新发起。')
          setSelectedMode(null)
          setEnteredFromInvite(false)
          setInviteToken('')
        })
      window.history.replaceState({}, '', stripDualInviteFromUrl())
      setTimeout(() => {
        itemRefs.current[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
      return
    }

    if (parsed.status === 'invalid') {
      const fallbackMessage = '这份邀请链接无法识别，请让对方重新生成一份新的双人拼图链接。'
      setInviteError(INVITE_ERROR_COPY[parsed.reason] ?? fallbackMessage)
      window.history.replaceState({}, '', stripDualInviteFromUrl())
    }
  }, [])

  // ── 选择模式（第0题） ──────────────────────────────────────
  function resetForModeStart(mode) {
    const emptyAnswers = {}
    setSelectedMode(mode)
    setAnswers(emptyAnswers)
    setActivePlayerIdx(0)
    setDualAnswerSets([emptyAnswers, emptyAnswers])
    setRevealCount(INITIAL_COUNT)
    setFocusedIdx(0)
    lastAnswerTimeRef.current = 0
    scrollLockRef.current = null
    setInviteLink('')
    setInviteCopied(false)
    setInviteToken('')
    setEnteredFromInvite(false)
    setInviteError('')
    setCompletionError('')
  }

  function chooseSolo() {
    resetForModeStart('single')
    setAnswers({})
    setFocusedIdx(0)
    setTimeout(() => {
      itemRefs.current[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
  }

  function chooseDual() {
    resetForModeStart('dual')
    setTimeout(() => {
      itemRefs.current[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
  }

  async function handleCopyInviteLink() {
    if (!inviteLink) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink)
      } else {
        window.prompt('复制下面的双人拼图链接', inviteLink)
      }
      setInviteCopied(true)
    } catch {
      window.prompt('复制下面的双人拼图链接', inviteLink)
      setInviteCopied(true)
    }
  }

  function moveToFirstMissingAnswer(nextAnswers) {
    const missingIdx = QUESTIONS.findIndex((question) => !(question.id in nextAnswers))
    if (missingIdx === -1) return false

    setCompletionError('还有题目没作答，先回到第一道漏答题完成后再继续。')
    setFocusedIdx(missingIdx)
    scrollLockRef.current = missingIdx
    setTimeout(() => {
      itemRefs.current[missingIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => { scrollLockRef.current = null }, 800)
    }, 100)
    return true
  }

  function finishFlowIfComplete(nextAnswers) {
    if (Object.keys(nextAnswers).length < total) {
      return false
    }

    if (selectedMode === 'dual') {
      const nextSets = dualAnswerSets.map((set, idx) => (
        idx === activePlayerIdx ? nextAnswers : set
      ))
      setDualAnswerSets(nextSets)

      if (activePlayerIdx === 0) {
        setCompletionError('')
        createDualInvite({
          answersA: nextAnswers,
          questionCount: QUESTIONS.length,
          schemaVersion: 'v1',
          ttlHours: 24,
        })
          .then((created) => {
            setInviteToken(created.token)
            setInviteLink(createDualInviteLink(created.token))
            setRevealCount(INITIAL_COUNT)
            setFocusedIdx(0)
            lastAnswerTimeRef.current = 0
            window.scrollTo({ top: 0, behavior: 'instant' })
          })
          .catch((error) => {
            setCompletionError(error?.message || '邀请链接生成失败，请稍后重试。')
          })
        return true
      }

      if (!inviteToken) {
        setCompletionError('邀请链接状态异常，请让第一位重新发起双人拼图。')
        return true
      }

      consumeDualInvite(inviteToken)
        .then((consumed) => {
          if (consumed.questionCount !== QUESTIONS.length) {
            setCompletionError(INVITE_ERROR_COPY['question-count-mismatch'])
            return
          }
          const mergedSets = [consumed.answersA || {}, nextAnswers]
          setDualAnswerSets(mergedSets)
          setTimeout(() => onComplete({ mode: 'dual', answers: mergedSets }), 300)
        })
        .catch((error) => {
          const reason = error?.code || 'invite-invalid'
          const message = INVITE_ERROR_COPY[reason] || '邀请链接已不可用，请让对方重新发起双人拼图。'
          setCompletionError(message)
          setInviteError(message)
          setSelectedMode(null)
          setEnteredFromInvite(false)
          setInviteToken('')
        })
      return true
    }

    setTimeout(() => onComplete({ mode: 'single', answers: nextAnswers }), 300)
    return true
  }

  // ── 正式答题（含作答频率限制） ────────────────────────────
  function handleAnswer(qIdx, selectedIdx) {
    const now     = Date.now()
    const elapsed = now - lastAnswerTimeRef.current

    // 上一次有效作答存在且间隔不足
    if (lastAnswerTimeRef.current > 0 && elapsed < ANSWER_COOLDOWN_MS) {
      setCooldownMsg(true)
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
      cooldownTimerRef.current = setTimeout(() => setCooldownMsg(false), 2000)
      return
    }

    lastAnswerTimeRef.current = now

    const q = QUESTIONS[qIdx]
    const newAnswers = { ...answers, [q.id]: selectedIdx }
    setAnswers(newAnswers)

    if (finishFlowIfComplete(newAnswers)) {
      return
    }

    const nextIdx = qIdx + 1
    if (nextIdx >= total) {
      if (moveToFirstMissingAnswer(newAnswers)) {
        return
      }
      return
    }
    if (nextIdx >= revealCount) setRevealCount(c => Math.min(c + LOAD_STEP, total))

    // 立即将焦点锁定到目标题，滚动动画期间（≈800ms）阻止 scroll 监听器覆盖
    setFocusedIdx(nextIdx)
    scrollLockRef.current = nextIdx
    setTimeout(() => {
      itemRefs.current[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => { scrollLockRef.current = null }, 800)
    }, 260)
  }

  // ── 第0题是否聚焦 ─────────────────────────────────────────
  const isQ0Active = focusedIdx === -1

  return (
    <div>
      {/* ── 始终可见的 sticky 进度条 ── */}
      <div className="sticky top-16 sm:top-[4.5rem] lg:top-20 z-40 bg-base-bg pt-3 pb-1 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-cyan rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center mt-1">
          {/* 作答过快提示（左侧，淡入淡出） */}
          <AnimatePresence>
            {cooldownMsg && (
              <motion.span
                key="cooldown"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] font-semibold text-amber-600 leading-none bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"
              >
                慢一点～每题都值得认真感受 🌿
              </motion.span>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {completionError && (
              <motion.span
                key="completion-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="ml-2 text-[11px] font-semibold text-rose-600 leading-none bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5"
              >
                {completionError}
              </motion.span>
            )}
          </AnimatePresence>
          <p className="text-[10px] text-base-mute ml-auto">
            {modeChosen
              ? `${currentModeCopy?.progressLabel ?? '当前进度'} · ${selectedMode === 'dual'
                ? inviteLink
                  ? '邀请阶段'
                  : `第 ${activePlayerIdx + 1} 位`
                : '单人'} · ${answeredCount} / ${total}`
              : '选择方式后开始'}
          </p>
        </div>
      </div>

      <div className="mt-2">
        {!enteredFromInvite && initialInviteStatus !== 'ready' && (
          <motion.div
            ref={q0Ref}
            animate={{ opacity: isQ0Active || !modeChosen ? 1 : 0.35 }}
            transition={{ duration: 0.25 }}
            className="border-b border-gray-100 py-8"
          >
            <p className={[
              'leading-relaxed mb-7 max-w-xl mx-auto text-center transition-all duration-200',
              isQ0Active || !modeChosen
                ? 'text-base sm:text-lg font-semibold text-base-text'
                : 'text-sm sm:text-base font-normal text-base-mute',
            ].join(' ')}>
              你们想以什么方式开始这次测试？
            </p>

            {inviteError && (
              <div className="max-w-xl mx-auto mb-5 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                <p className="text-sm font-semibold text-amber-700">邀请链接已失效</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700/90">{inviteError}</p>
              </div>
            )}

            <div className="max-w-xl mx-auto flex flex-col gap-3">
              <button
                className={[
                  'w-full py-3.5 rounded-btn border-2 font-semibold text-sm transition-all duration-150 active:scale-[0.98]',
                  selectedMode === 'single'
                    ? 'border-brand-cyan bg-brand-cyan text-white'
                    : 'border-brand-cyan text-brand-cyan hover:bg-brand-cyan hover:text-white',
                ].join(' ')}
                onClick={chooseSolo}
              >
                单人速通：先看我眼中的我们
              </button>
              <button
                className={[
                  'w-full py-3.5 rounded-btn border-2 font-semibold text-sm transition-all duration-150 active:scale-[0.98]',
                  selectedMode === 'dual'
                    ? 'border-brand-purple bg-brand-purple text-white'
                    : 'border-gray-200 text-base-mute hover:border-brand-purple hover:text-brand-purple',
                ].join(' ')}
                onClick={chooseDual}
              >
                双人拼图：解锁真正的情侣合成结果
              </button>
            </div>

            {!modeChosen && (
              <div className="max-w-xl mx-auto mt-5 grid gap-3 text-left sm:grid-cols-2">
                <div className="rounded-card border border-brand-cyan/20 bg-brand-cyan/5 p-4">
                  <p className="text-[11px] font-semibold tracking-wide text-brand-cyan mb-1">
                    {QUESTION_MODE_COPY.single.badge}
                  </p>
                  <p className="text-sm font-semibold text-base-text mb-1">{QUESTION_MODE_COPY.single.title}</p>
                  <p className="text-xs leading-relaxed text-base-mute">{QUESTION_MODE_COPY.single.description}</p>
                </div>
                <div className="rounded-card border border-brand-purple/20 bg-brand-purple/5 p-4">
                  <p className="text-[11px] font-semibold tracking-wide text-brand-purple mb-1">
                    {QUESTION_MODE_COPY.dual.badge}
                  </p>
                  <p className="text-sm font-semibold text-base-text mb-1">{QUESTION_MODE_COPY.dual.title}</p>
                  <p className="text-xs leading-relaxed text-base-mute">{QUESTION_MODE_COPY.dual.description}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {modeChosen && currentModeCopy && (
          <div className="max-w-xl mx-auto py-5 border-b border-gray-100">
            <div className="rounded-card border border-gray-100 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-brand-cyan">{currentModeCopy.badge}</p>
                  <p className="text-sm font-semibold text-base-text">{currentModeCopy.title}</p>
                </div>
                {selectedMode === 'dual' && (
                  <span className="text-[11px] rounded-full bg-brand-purple/10 px-2.5 py-1 font-semibold text-brand-purple">
                    当前为第 {activePlayerIdx + 1} 位
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-base-mute">{currentModeCopy.description}</p>
              <p className="text-xs leading-relaxed text-base-mute">{currentModeCopy.hint}</p>
              {enteredFromInvite && (
                <div className="rounded-xl border border-brand-purple/15 bg-brand-purple/5 px-3 py-2 text-xs leading-relaxed text-base-mute">
                  你是通过邀请链接进入的第二位作答者。请按你的真实感受完成答题，系统会在你提交后合成最终 Couple Type。
                </div>
              )}
            </div>
          </div>
        )}

        {selectedMode === 'dual' && inviteLink && (
          <div className="max-w-xl mx-auto py-8 border-b border-gray-100">
            <div className="rounded-card border border-brand-purple/15 bg-brand-purple/5 p-5 space-y-4">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-brand-purple">邀请链接已生成</p>
                <p className="text-lg font-semibold text-base-text mt-1">把这条链接发给 TA，完成真正的双人拼图</p>
                <p className="text-sm leading-relaxed text-base-mute mt-2">
                  第一位的答案已经被写进邀请链接里。第二位打开链接后会直接进入自己的答题流程，答完后即可生成最终 Couple Type。
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 break-all text-xs leading-relaxed text-base-mute">
                {inviteLink}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className={[
                    'flex-1 py-3 rounded-btn text-sm font-semibold transition-all duration-150',
                    inviteCopied
                      ? 'bg-brand-green text-white border border-brand-green shadow-sm'
                      : 'btn-primary',
                  ].join(' ')}
                  onClick={handleCopyInviteLink}
                >
                  {inviteCopied ? '链接已复制' : '复制邀请链接'}
                </button>
                <a
                  className="btn-ghost flex-1 py-3 text-center"
                  href={inviteLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  打开邀请链接
                </a>
              </div>

              <p className="text-xs text-green-600 min-h-[1.25rem]">
                {inviteCopied ? '已复制，可直接发给 TA' : ' '}
              </p>

              <button
                type="button"
                className="text-sm text-base-mute underline underline-offset-4"
                onClick={chooseDual}
              >
                重新开始这次双人拼图
              </button>
            </div>
          </div>
        )}

        {/* ── 正式题目（选完模式后渲染） ── */}
        {modeChosen && !inviteLink && QUESTIONS.slice(0, revealCount).map((q, idx) => {
          const isActive   = focusedIdx === idx
          const isAnswered = q.id in answers

          return (
            <motion.div
              key={q.id}
              ref={el => { itemRefs.current[idx] = el }}
              animate={{ opacity: isActive ? 1 : 0.35 }}
              transition={{ duration: 0.25 }}
              className="border-b border-gray-100 last:border-0 py-8"
            >
              <p className={[
                'leading-relaxed mb-7 max-w-xl mx-auto text-center transition-all duration-200',
                isActive
                  ? 'text-base sm:text-lg font-semibold text-base-text'
                  : 'text-sm sm:text-base font-normal text-base-mute',
              ].join(' ')}>
                {getQuestionPrompt(q, selectedMode, idx)}
              </p>
              <div className="max-w-xl mx-auto">
                <LikertScale
                  value={isAnswered ? answers[q.id] : null}
                  onChange={selIdx => handleAnswer(idx, selIdx)}
                />
              </div>
            </motion.div>
          )
        })}

        {/* 懒加载哨兵 */}
        {modeChosen && !inviteLink && revealCount < total && (
          <div ref={sentinelRef} className="h-10" />
        )}
      </div>
    </div>
  )
}

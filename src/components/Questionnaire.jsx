import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LikertScale from './LikertScale'
import { QUESTIONS, QUESTIONS_PER_DIMENSION, getQuestionPrompt } from '../data/questions'
import {
  createDualInviteLink,
  createSingleShareLink,
  readDualInviteFromSearch,
  stripDualInviteFromUrl,
} from '../utils/inviteCodec'
import { consumeDualInvite, createDualInvite, probeDualInvite } from '../utils/statsApi'
import { clearQuizDraft, readQuizDraft, saveQuizDraft } from '../utils/quizDraft'
import { computeSingleModeResult, DIMENSION_DETAILS } from '../utils/scoring'
import { useLanguage } from '../i18n/LanguageContext'
import { useLocalizedQuestions } from '../i18n/useLocalizedData'

const INITIAL_COUNT = 6
const LOAD_STEP     = 6          // 每次多加载 6 题，减少触发次数
const ANSWER_COOLDOWN_MS = 1200  // 两次作答之间最短间隔（ms）
const DRAFT_SAVE_DEBOUNCE_MS = 250
const RESTART_CONFIRM_THRESHOLD = 5

const INVITE_ERROR_KEYS = {
  'legacy-link-unsupported': 'quiz.invite_legacy',
  'invalid-token': 'quiz.invite_invalid_token',
  'invite-invalid': 'quiz.invite_invalid',
  'invite-used': 'quiz.invite_used',
  'invite-expired': 'quiz.invite_expired',
  'question-count-mismatch': 'quiz.invite_question_mismatch',
}

function getAnsweredCount(answers) {
  return Object.keys(answers || {}).length
}

function getFirstMissingIndex(answers) {
  return QUESTIONS.findIndex((question) => !(question.id in (answers || {})))
}

function getRevealCountByAnswers(answers, total) {
  const answeredQuestionIds = new Set(Object.keys(answers || {}))
  let maxAnsweredIdx = -1
  QUESTIONS.forEach((question, idx) => {
    if (answeredQuestionIds.has(question.id)) {
      maxAnsweredIdx = idx
    }
  })

  return Math.min(total, Math.max(INITIAL_COUNT, maxAnsweredIdx + 1))
}

const DIMENSION_ROWS = Object.values(DIMENSION_DETAILS)

function getLocalizedDimRow(t, row) {
  const key = `${row.posKey}${row.negKey}` // SI / RP / OF / DA
  return {
    posKey: row.posKey,
    negKey: row.negKey,
    title: t(`dim.${key}.title`, { fallback: row.title }),
    posLabel: t(`dim.${key}.posLabel`, { fallback: row.posLabel }),
    negLabel: t(`dim.${key}.negLabel`, { fallback: row.negLabel }),
  }
}

function renderPreviewSpectrum(percentages, t) {
  return (
    <div className="space-y-3">
      {DIMENSION_ROWS.map((row) => {
        const { posKey, negKey, posLabel, negLabel, title } = getLocalizedDimRow(t, row)
        const posVal = percentages?.[posKey] ?? 50
        const negVal = percentages?.[negKey] ?? 50
        return (
          <div key={posKey} className="space-y-1">
            <div className="text-[11px] text-base-mute font-medium">{title}</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold w-9 text-right shrink-0 text-brand-purple">
                {posLabel}
              </span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden min-w-0">
                <motion.div
                  className="h-full rounded-full bg-brand-purple"
                  initial={{ width: 0 }}
                  animate={{ width: `${posVal}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[11px] font-medium w-9 shrink-0 text-base-mute">
                {negLabel}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-base-mute/70 px-[40px]">
              <span>{posVal}%</span>
              <span>{negVal}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
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
  const { t } = useLanguage()
  const localizedQuestions = useLocalizedQuestions()
  const QUESTION_MODE_COPY_LOCALIZED = {
    single: {
      badge: t('quiz.single_badge'),
      title: t('quiz.single_title'),
      description: t('quiz.single_desc'),
      hint: t('quiz.single_hint'),
      cta: t('quiz.single_cta'),
      progressLabel: t('quiz.single_progress_label'),
    },
    dual: {
      badge: t('quiz.dual_badge'),
      title: t('quiz.dual_title'),
      description: t('quiz.dual_desc'),
      hint: t('quiz.dual_hint'),
      cta: t('quiz.dual_cta'),
      progressLabel: t('quiz.dual_progress_label'),
    },
  }
  function inviteErrorMsg(reason) {
    const key = INVITE_ERROR_KEYS[reason]
    return key ? t(key) : t('quiz.invite_unavailable')
  }
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
  const [resumeDraft, setResumeDraft] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, source: '', count: 0 })
  const [player1Preview, setPlayer1Preview] = useState(null)
  const [inviteCreateStatus, setInviteCreateStatus] = useState({ loading: false, error: '' })
  const [inviteGate, setInviteGate] = useState({ checking: false })
  const [inviteErrorModalOpen, setInviteErrorModalOpen] = useState(false)
  const [hydrationDone, setHydrationDone] = useState(false)
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
  const currentModeCopy = selectedMode ? QUESTION_MODE_COPY_LOCALIZED[selectedMode] : null
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

  function resetToEntry() {
    const emptyAnswers = {}
    setSelectedMode(null)
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
    setPlayer1Preview(null)
    setInviteCreateStatus({ loading: false, error: '' })
  }

  function restoreFromDraft(draft) {
    setSelectedMode(draft.selectedMode)
    setAnswers(draft.answers)
    setDualAnswerSets(draft.dualAnswerSets)
    setActivePlayerIdx(draft.activePlayerIdx)
    setInviteLink(draft.inviteLink)
    setInviteCopied(false)
    setInviteToken(draft.inviteToken)
    setInviteError('')
    setEnteredFromInvite(draft.enteredFromInvite)

    const reveal = getRevealCountByAnswers(draft.answers, total)
    setRevealCount(reveal)
    const missingIdx = getFirstMissingIndex(draft.answers)
    const nextFocus = missingIdx === -1 ? Math.max(0, reveal - 1) : missingIdx
    setFocusedIdx(nextFocus)
    lastAnswerTimeRef.current = 0
    scrollLockRef.current = null
    setTimeout(() => {
      itemRefs.current[nextFocus]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
  }

  function openRestartConfirm(source, count) {
    setConfirmDialog({ open: true, source, count })
  }

  function closeRestartConfirm() {
    setConfirmDialog({ open: false, source: '', count: 0 })
  }

  function closeInviteErrorModal() {
    setInviteErrorModalOpen(false)
  }

  function enterSecondPlayerByInvite(token) {
    const emptyAnswers = {}
    setSelectedMode('dual')
    setAnswers(emptyAnswers)
    setDualAnswerSets([emptyAnswers, emptyAnswers])
    setActivePlayerIdx(1)
    setInviteLink('')
    setInviteCopied(false)
    setInviteToken(token)
    setInviteError('')
    setEnteredFromInvite(true)
    setRevealCount(INITIAL_COUNT)
    setFocusedIdx(0)
    lastAnswerTimeRef.current = 0
    scrollLockRef.current = null
    setTimeout(() => {
      itemRefs.current[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
  }

  useEffect(() => {
    const parsed = readDualInviteFromSearch()

    if (parsed.status === 'ready') {
      setInviteGate({ checking: true })
      setInviteToken(parsed.token)
      probeDualInvite(parsed.token)
        .then((data) => {
          setInviteGate({ checking: false })
          if (data.status === 'ready') {
            enterSecondPlayerByInvite(parsed.token)
            return
          }

          const statusToReason = {
            used: 'invite-used',
            expired: 'invite-expired',
            invalid: 'invite-invalid',
          }
          const message = inviteErrorMsg(statusToReason[data.status])
          resetToEntry()
          setInviteError(message)
          setInviteErrorModalOpen(true)
          setInviteToken('')
        })
        .catch((error) => {
          setInviteGate({ checking: false })
          const reason = error?.code || 'invite-invalid'
          const message = inviteErrorMsg(reason)
          resetToEntry()
          setInviteError(message)
          setInviteErrorModalOpen(true)
          setInviteToken('')
        })
      window.history.replaceState({}, '', stripDualInviteFromUrl())
      setHydrationDone(true)
      return
    }

    if (parsed.status === 'invalid') {
      const message = INVITE_ERROR_KEYS[parsed.reason] ? t(INVITE_ERROR_KEYS[parsed.reason]) : t('quiz.invite_unrecognized')
      setInviteError(message)
      setInviteErrorModalOpen(true)
      window.history.replaceState({}, '', stripDualInviteFromUrl())
    }

    const draftResult = readQuizDraft(QUESTIONS)
    if (draftResult.status === 'ready') {
      const answeredCountFromDraft = getAnsweredCount(draftResult.draft.answers)
      if (answeredCountFromDraft > 0) {
        setResumeDraft({
          ...draftResult.draft,
          answeredCount: answeredCountFromDraft,
        })
      } else {
        clearQuizDraft()
      }
    }

    if (draftResult.status === 'ready' && draftResult.draft?.dualPlayer1Preview) {
      setPlayer1Preview(draftResult.draft.dualPlayer1Preview)
    }

    setHydrationDone(true)
  }, [])

  useEffect(() => {
    if (!hydrationDone) return undefined

    const hasDraftContent =
      modeChosen ||
      answeredCount > 0 ||
      enteredFromInvite ||
      Boolean(inviteToken) ||
      Boolean(inviteLink)

    if (!hasDraftContent) {
      clearQuizDraft()
      return undefined
    }

    const timer = setTimeout(() => {
      saveQuizDraft(QUESTIONS, {
        selectedMode,
        activePlayerIdx,
        answers,
        dualAnswerSets,
        inviteToken,
        inviteLink,
        enteredFromInvite,
        dualPlayer1Preview: player1Preview,
      })
    }, DRAFT_SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [
    hydrationDone,
    modeChosen,
    answeredCount,
    selectedMode,
    activePlayerIdx,
    answers,
    dualAnswerSets,
    inviteToken,
    inviteLink,
    enteredFromInvite,
    player1Preview,
  ])

  function buildDualPlayer1Preview(nextAnswers) {
    const computed = computeSingleModeResult(QUESTIONS, nextAnswers, QUESTIONS_PER_DIMENSION)
    const perception = computed?.perception
    const code = perception?.code || ''
    const title = perception?.result?.title || ''
    const percentages = perception?.percentages || {}
    const summary = Array.isArray(perception?.result?.description) ? (perception.result.description[0] || '') : ''
    const singleShareLink = (() => {
      try {
        const link = createSingleShareLink(QUESTIONS, nextAnswers)
        const url = new URL(link)
        url.searchParams.set('fromDualPreview', '1')
        return url.toString()
      } catch {
        return ''
      }
    })()

    return {
      code,
      title,
      percentages,
      summary,
      singleShareLink,
    }
  }

  async function handleShareInviteLink() {
    if (!inviteLink) return
    if (!navigator.share) return
    try {
      await navigator.share({
        title: t('quiz.invite_share_title'),
        text: t('quiz.invite_share_text'),
        url: inviteLink,
      })
    } catch {
      // ignore user cancel
    }
  }

  // ── 选择模式（第0题） ──────────────────────────────────────
  function resetForModeStart(mode) {
    clearQuizDraft()
    resetToEntry()
    setSelectedMode(mode)
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

  function requestModeChange(nextMode) {
    if (answeredCount >= RESTART_CONFIRM_THRESHOLD) {
      openRestartConfirm(nextMode === 'single' ? 'switch-single' : 'switch-dual', answeredCount)
      return
    }

    if (nextMode === 'single') {
      chooseSolo()
      return
    }
    chooseDual()
  }

  function requestRestartDualFlow() {
    if (answeredCount >= RESTART_CONFIRM_THRESHOLD) {
      openRestartConfirm('restart-dual-flow', answeredCount)
      return
    }
    chooseDual()
  }

  function handleResumeContinue() {
    if (!resumeDraft) return
    restoreFromDraft(resumeDraft)
    setResumeDraft(null)
    setHydrationDone(true)
  }

  function handleResumeRestart() {
    if (!resumeDraft) return
    if ((resumeDraft.answeredCount ?? 0) >= RESTART_CONFIRM_THRESHOLD) {
      openRestartConfirm('resume-restart', resumeDraft.answeredCount)
      return
    }
    clearQuizDraft()
    setResumeDraft(null)
    resetToEntry()
    setHydrationDone(true)
  }

  function handleConfirmRestart() {
    const { source } = confirmDialog
    closeRestartConfirm()
    clearQuizDraft()

    if (source === 'resume-restart') {
      setResumeDraft(null)
      resetToEntry()
      setHydrationDone(true)
      return
    }

    if (source === 'switch-single') {
      chooseSolo()
      return
    }

    if (source === 'switch-dual' || source === 'restart-dual-flow') {
      chooseDual()
    }
  }

  async function handleCopyInviteLink() {
    if (!inviteLink) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink)
      } else {
        window.prompt(t('quiz.invite_clipboard_prompt'), inviteLink)
      }
      setInviteCopied(true)
    } catch {
      window.prompt(t('quiz.invite_clipboard_prompt'), inviteLink)
      setInviteCopied(true)
    }
  }

  function moveToFirstMissingAnswer(nextAnswers) {
    const missingIdx = QUESTIONS.findIndex((question) => !(question.id in nextAnswers))
    if (missingIdx === -1) return false

    setCompletionError(t('quiz.completion_error_unfinished'))
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
        const preview = buildDualPlayer1Preview(nextAnswers)
        setPlayer1Preview(preview)
        setInviteCreateStatus({ loading: true, error: '' })
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
            setInviteCreateStatus({ loading: false, error: '' })
            window.scrollTo({ top: 0, behavior: 'instant' })
          })
          .catch((error) => {
            const message = error?.message || t('quiz.invite_failed')
            setCompletionError(message)
            setInviteCreateStatus({ loading: false, error: message })
          })
        return true
      }

      if (!inviteToken) {
        setCompletionError(t('quiz.invite_state_anomaly'))
        return true
      }

      consumeDualInvite(inviteToken)
        .then((consumed) => {
          if (consumed.questionCount !== QUESTIONS.length) {
            setCompletionError(t('quiz.invite_question_mismatch'))
            return
          }
          const mergedSets = [consumed.answersA || {}, nextAnswers]
          setDualAnswerSets(mergedSets)
          setTimeout(() => onComplete({ mode: 'dual', answers: mergedSets }), 300)
        })
        .catch((error) => {
          const reason = error?.code || 'invite-invalid'
          const message = INVITE_ERROR_KEYS[reason] ? t(INVITE_ERROR_KEYS[reason]) : t('quiz.invite_revoked')
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
      {resumeDraft && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 backdrop-blur-[1px] px-4">
          <div className="w-full max-w-md rounded-card border border-gray-100 bg-white p-5 shadow-xl">
            <p className="text-base font-semibold text-base-text">{t('quiz.resume_title')}</p>
            <p className="mt-2 text-sm leading-relaxed text-base-mute">
              {t('quiz.resume_desc', { answered: resumeDraft.answeredCount, total })}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-primary flex-1 py-2.5 text-sm"
                onClick={handleResumeContinue}
              >
                {t('quiz.resume_continue')}
              </button>
              <button
                type="button"
                className="btn-ghost flex-1 py-2.5 text-sm"
                onClick={handleResumeRestart}
              >
                {t('quiz.resume_restart')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-card border border-rose-100 bg-white p-5 shadow-xl">
            <p className="text-base font-semibold text-base-text">{t('quiz.confirm_restart_title')}</p>
            <p className="mt-2 text-sm leading-relaxed text-base-mute">
              {t('quiz.confirm_restart_desc', { count: confirmDialog.count })}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn-ghost flex-1 py-2.5 text-sm"
                onClick={closeRestartConfirm}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="flex-1 rounded-btn bg-rose-500 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
                onClick={handleConfirmRestart}
              >
                {t('quiz.confirm_restart_ok')}
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteGate.checking && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-sm rounded-card border border-gray-100 bg-white p-5 shadow-xl">
            <p className="text-base font-semibold text-base-text">{t('quiz.invite_checking_title')}</p>
            <p className="mt-2 text-sm leading-relaxed text-base-mute">
              {t('quiz.invite_checking_desc')}
            </p>
          </div>
        </div>
      )}

      {inviteErrorModalOpen && inviteError && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-card border border-amber-200 bg-white p-5 shadow-xl">
            <p className="text-base font-semibold text-base-text">{t('quiz.invite_error_modal_title')}</p>
            <p className="mt-2 text-sm leading-relaxed text-base-mute">{inviteError}</p>
            <div className="mt-5">
              <button
                type="button"
                className="btn-primary w-full py-2.5 text-sm"
                onClick={closeInviteErrorModal}
              >
                {t('quiz.invite_error_modal_ok')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 始终可见的 sticky 进度条（四色光谱 + 末端柔光高光） ── */}
      <div className="sticky top-16 sm:top-[4.5rem] lg:top-20 z-40 bg-base-bg/95 backdrop-blur-[2px] pt-2 pb-1 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="spectrum-track">
          <motion.div
            className="spectrum-fill"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.55, ease: [0.16, 0.84, 0.34, 1] }}
          >
            <span className="spectrum-fill-gradient" aria-hidden />
          </motion.div>
          {progress > 1.5 && (
            <motion.span
              key="cap"
              className="spectrum-cap"
              aria-hidden
              animate={{ left: `${progress}%` }}
              transition={{ duration: 0.55, ease: [0.16, 0.84, 0.34, 1] }}
            />
          )}
        </div>
        <div className="flex items-center mt-1.5">
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
                {t('quiz.cooldown_msg')}
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
              ? `${currentModeCopy?.progressLabel ?? t('quiz.progress_default_label')} · ${selectedMode === 'dual'
                ? inviteLink
                  ? t('quiz.progress_invite_phase')
                  : t('quiz.progress_player_n', { n: activePlayerIdx + 1 })
                : t('quiz.progress_single_mode')} · ${answeredCount} / ${total}`
              : t('quiz.progress_choose_mode')}
          </p>
        </div>
      </div>

      <div className="mt-2">
        {!enteredFromInvite && !modeChosen && answeredCount === 0 && initialInviteStatus !== 'ready' && (
          <motion.div
            ref={q0Ref}
            animate={{ opacity: isQ0Active || !modeChosen ? 1 : 0.35 }}
            transition={{ duration: 0.25 }}
            className="border-b border-gray-100 py-2 md:py-3"
          >
            <p className={[
              'leading-snug mb-3 md:mb-4 max-w-xl mx-auto text-center transition-all duration-200',
              isQ0Active || !modeChosen
                ? 'text-base sm:text-lg font-semibold text-base-text'
                : 'text-sm sm:text-base font-normal text-base-mute',
            ].join(' ')}>
              {t('quiz.mode_question')}
            </p>

            {inviteError && (
              <div className="max-w-xl mx-auto mb-4 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                <p className="text-sm font-semibold text-amber-700">{t('quiz.invite_expired_banner_title')}</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700/90">{inviteError}</p>
              </div>
            )}

            <div className="max-w-xl mx-auto flex flex-col gap-2.5">
              <button
                className={[
                  'w-full py-3 rounded-btn border-2 font-semibold text-sm transition-all duration-150 active:scale-[0.98]',
                  selectedMode === 'single'
                    ? 'border-brand-cyan bg-brand-cyan text-white'
                    : 'border-brand-cyan text-brand-cyan hover:bg-brand-cyan hover:text-white',
                ].join(' ')}
                onClick={() => requestModeChange('single')}
              >
                {t('quiz.mode_single_btn')}
              </button>
              <button
                className={[
                  'w-full py-3 rounded-btn border-2 font-semibold text-sm transition-all duration-150 active:scale-[0.98]',
                  selectedMode === 'dual'
                    ? 'border-brand-purple bg-brand-purple text-white'
                    : 'border-gray-200 text-base-mute hover:border-brand-purple hover:text-brand-purple',
                ].join(' ')}
                onClick={() => requestModeChange('dual')}
              >
                {t('quiz.mode_dual_btn')}
              </button>
            </div>

            {!modeChosen && (
              // 移动端隐藏：移动端屏幕小，hero + 三步 + 两个 CTA 已经讲清楚单/双差异；
              // 桌面端 sm 及以上才显示这组双列说明，作为更详尽的补充。
              <div className="hidden sm:grid max-w-xl mx-auto mt-2.5 md:mt-3 gap-x-6 gap-y-2 text-left sm:grid-cols-2">
                <div className="relative pl-3 sm:pl-4">
                  <span className="absolute left-0 top-1 h-[calc(100%-0.25rem)] w-[2px] rounded-full bg-brand-cyan/70" aria-hidden />
                  <p className="text-eyebrow mb-1">{QUESTION_MODE_COPY_LOCALIZED.single.badge}</p>
                  <p className="text-sm font-semibold text-base-text mb-0.5">{QUESTION_MODE_COPY_LOCALIZED.single.title}</p>
                  <p className="text-xs leading-snug text-base-mute line-clamp-2">{QUESTION_MODE_COPY_LOCALIZED.single.description}</p>
                </div>
                <div className="relative pl-3 sm:pl-4">
                  <span className="absolute left-0 top-1 h-[calc(100%-0.25rem)] w-[2px] rounded-full bg-brand-purple/70" aria-hidden />
                  <p className="text-eyebrow mb-1" style={{ color: '#88619a' }}>{QUESTION_MODE_COPY_LOCALIZED.dual.badge}</p>
                  <p className="text-sm font-semibold text-base-text mb-0.5">{QUESTION_MODE_COPY_LOCALIZED.dual.title}</p>
                  <p className="text-xs leading-snug text-base-mute line-clamp-2">{QUESTION_MODE_COPY_LOCALIZED.dual.description}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {modeChosen && currentModeCopy && (
          <div className="max-w-xl mx-auto py-5 border-b border-gray-100">
            <div
              className={[
                'relative pl-4 space-y-1.5',
                selectedMode === 'dual' ? 'border-l-2 border-brand-purple/60' : 'border-l-2 border-brand-cyan/60',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p
                    className="text-eyebrow"
                    style={{ color: selectedMode === 'dual' ? '#88619a' : '#4298b4' }}
                  >
                    {currentModeCopy.badge}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-base-text">{currentModeCopy.title}</p>
                </div>
                {selectedMode === 'dual' && (
                  <span className="text-[11px] rounded-full bg-brand-purple/10 px-2.5 py-1 font-semibold text-brand-purple">
                    {t('quiz.preview_current_player_chip', { n: activePlayerIdx + 1 })}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-base-mute">{currentModeCopy.description}</p>
              <p className="text-xs leading-relaxed text-base-mute">{currentModeCopy.hint}</p>
              {enteredFromInvite && (
                <p className="mt-2 text-xs leading-relaxed text-base-mute">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-purple mr-1.5 align-middle" />
                  {t('quiz.invited_player_note')}
                </p>
              )}
            </div>
          </div>
        )}

        {selectedMode === 'dual' && activePlayerIdx === 0 && answeredCount === total && player1Preview && (
          <div className="max-w-xl mx-auto pt-6 pb-2 border-b border-gray-100">
            <div className="rounded-card border border-brand-purple/20 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-brand-purple">{t('quiz.preview_eyebrow')}</p>
                  <p className="mt-1 text-base font-semibold text-base-text">
                    {t('quiz.preview_title')}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-purple/10 px-2.5 py-1 text-[11px] font-semibold text-brand-purple">
                  {t('quiz.preview_pending_chip')}
                </span>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-base-mute">
                {t('quiz.preview_desc')}
              </p>

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-black tracking-wide text-base-text">{player1Preview.code || '--'}</p>
                    <p className="text-sm font-semibold text-base-text truncate">{player1Preview.title || t('quiz.preview_type_fallback')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-base-mute">{t('quiz.preview_summary_label')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-base-mute max-w-[14rem]">
                      {(player1Preview.summary || '').slice(0, 40) || t('quiz.preview_summary_placeholder')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {renderPreviewSpectrum(player1Preview.percentages, t)}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="btn-primary flex-1 py-3 text-sm"
                  onClick={handleCopyInviteLink}
                  disabled={!inviteLink || inviteCreateStatus.loading}
                >
                  {inviteCreateStatus.loading
                    ? t('quiz.preview_copy_loading')
                    : inviteCopied
                      ? t('quiz.preview_copy_done')
                      : t('quiz.preview_copy_btn')}
                </button>

                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    className="btn-ghost flex-1 py-3 text-sm"
                    onClick={handleShareInviteLink}
                  >
                    {t('quiz.preview_share_btn')}
                  </button>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-base-mute">
                  {t('quiz.preview_link_note')}
                </p>
                {player1Preview.singleShareLink && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand-purple underline underline-offset-4"
                    onClick={() => window.open(player1Preview.singleShareLink, '_blank', 'noreferrer')}
                  >
                    {t('quiz.preview_open_single')}
                  </button>
                )}
              </div>

              {!inviteLink && inviteCreateStatus.error && (
                <p className="mt-3 text-xs text-rose-600">
                  {inviteCreateStatus.error}
                </p>
              )}
            </div>
          </div>
        )}

        {selectedMode === 'dual' && inviteLink && (
          <div className="max-w-xl mx-auto py-8 border-b border-gray-100">
            <div className="rounded-card border border-brand-purple/15 bg-brand-purple/5 p-5 space-y-4">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-brand-purple">{t('quiz.invite_block_eyebrow')}</p>
                <p className="text-lg font-semibold text-base-text mt-1">{t('quiz.invite_block_title')}</p>
                <p className="text-sm leading-relaxed text-base-mute mt-2">
                  {t('quiz.invite_block_desc')}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 break-all text-xs leading-relaxed text-base-mute">
                {inviteLink}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  className="btn-ghost w-full py-3 text-center"
                  href={inviteLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('quiz.invite_block_open')}
                </a>
              </div>

              <button
                type="button"
                className="text-sm text-base-mute underline underline-offset-4"
                onClick={requestRestartDualFlow}
              >
                {t('quiz.invite_block_restart')}
              </button>
            </div>
          </div>
        )}

        {/* ── 正式题目（选完模式后渲染） ── */}
        {modeChosen && !inviteLink && localizedQuestions.slice(0, revealCount).map((q, idx) => {
          const isActive   = focusedIdx === idx
          const isAnswered = q.id in answers

          return (
            <motion.div
              key={q.id}
              ref={el => { itemRefs.current[idx] = el }}
              animate={{
                opacity: isActive ? 1 : 0.32,
                y: isActive ? -2 : 0,
                filter: isActive ? 'blur(0px)' : 'blur(0.3px)',
              }}
              transition={{ duration: 0.3, ease: [0.16, 0.84, 0.34, 1] }}
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
                  leftLabel={t('quiz.likert_left')}
                  rightLabel={t('quiz.likert_right')}
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

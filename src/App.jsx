import { Suspense, lazy, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AppShell from './components/layout/AppShell'
import HomeStepCards from './components/home/HomeStepCards'
import Questionnaire from './components/Questionnaire'
import Loading from './components/Loading'
import AiRelationshipPage from './components/chat/AiRelationshipPage'
import AiUnlockPage from './components/chat/AiUnlockPage'
import HelpPage from './components/help/HelpPage'
import StatsPage from './components/stats/StatsPage'
import { QUESTIONS, QUESTIONS_PER_DIMENSION } from './data/questions'
import { computeDualModeResult, computeSingleModeResult } from './utils/scoring'
import { submitStats, submitTelemetry } from './utils/statsApi'
import { preloadTypeImage } from './data/typeImages'
import { clearQuizDraft } from './utils/quizDraft'
import { readSingleShareFromSearch, stripSingleShareFromUrl } from './utils/inviteCodec'
import { readStoredResult, saveStoredResult } from './utils/resultPersistence'
import { useLanguage } from './i18n/LanguageContext'

const ResultPoster = lazy(() => import('./components/ResultPoster'))
const CoupleTypesPage = lazy(() => import('./components/types/CoupleTypesPage'))

function getInitialStoredResult() {
  const stored = readStoredResult()
  return stored.status === 'ready' ? stored.resultData : null
}

function shouldOpenAiFromHash() {
  return typeof window !== 'undefined'
    && window.location.hash === '#ai'
    && readStoredResult().status === 'ready'
}

function getInitialMainTab() {
  if (typeof window !== 'undefined' && window.location.hash === '#ai' && readStoredResult().status !== 'ready') {
    return 'ai'
  }
  return 'quiz'
}

function replaceLocationHash(hash = '') {
  if (typeof window === 'undefined') return
  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`
  window.history.replaceState({}, '', nextUrl)
}

/**
 * App — 顶层视图路由
 *
 * view:
 *   'home'    — 首页（问卷 或 情侣类型页）
 *   'loading' — 光谱分析过渡页（2s）
 *   'result'  — 结果海报
 *   'ai'      — AI 关系助手独立页
 *
 * mainTab（仅 view==='home'）:
 *   'quiz'  — 标题 + 三步引导 + 答题
 *   'types' — 情侣类型总览
 *   'ai'    — AI 关系助手解锁说明
 *   'stats' — 统计总览
 *   'help'  — 常见问题 + 关于 CPTI
 */
export default function App() {
  const { t } = useLanguage()
  const [view, setView] = useState(() => shouldOpenAiFromHash() ? 'ai' : 'home')
  const [mainTab, setMainTab] = useState(getInitialMainTab)
  const [resultData, setResultData] = useState(getInitialStoredResult)
  const [loadingMeta, setLoadingMeta] = useState({
    preloadTask: Promise.resolve(),
    minDurationMs: 800,
  })

  function goQuizHome() {
    setResultData(null)
    setView('home')
    setMainTab('quiz')
    replaceLocationHash('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function goCoupleTypes() {
    setView('home')
    setMainTab('types')
    replaceLocationHash('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function goAiAssistant() {
    const stored = resultData ? { status: 'ready', resultData } : readStoredResult()
    if (stored.status === 'ready') {
      setResultData(stored.resultData)
      setView('ai')
      replaceLocationHash('#ai')
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }

    setView('home')
    setMainTab('ai')
    replaceLocationHash('#ai')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function goStats() {
    setView('home')
    setMainTab('stats')
    replaceLocationHash('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function goHelp() {
    setView('home')
    setMainTab('help')
    replaceLocationHash('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const headerNav = {
    activeTab: view === 'ai'
      ? 'ai'
      : view === 'home'
        ? (mainTab === 'quiz' ? 'home' : mainTab)
        : null,
    onNavigateHome: goQuizHome,
    onNavigateCoupleTypes: goCoupleTypes,
    onNavigateAI: goAiAssistant,
    onNavigateStats: goStats,
    onNavigateHelp: goHelp,
    onLogoHome: goQuizHome,
  }

  useEffect(() => {
    const parsed = readSingleShareFromSearch(QUESTIONS, window.location.search)
    if (parsed.status !== 'ready') return

    try {
      const computed = computeSingleModeResult(QUESTIONS, parsed.answers, QUESTIONS_PER_DIMENSION)
      setResultData(computed)
      saveStoredResult(computed)
      setLoadingMeta({
        preloadTask: computed?.perception?.code ? preloadTypeImage(computed.perception.code) : Promise.resolve(),
        minDurationMs: 500,
      })
      setView('loading')
      window.history.replaceState({}, '', stripSingleShareFromUrl())
      window.scrollTo({ top: 0, behavior: 'instant' })
    } catch {
      window.history.replaceState({}, '', stripSingleShareFromUrl())
    }
  }, [])

  // 答题完成 → 计算结果 → 进入 Loading
  function handleQuizComplete(payload) {
    clearQuizDraft()
    const computed = payload.mode === 'dual'
      ? computeDualModeResult(QUESTIONS, payload.answers, QUESTIONS_PER_DIMENSION)
      : computeSingleModeResult(QUESTIONS, payload.answers, QUESTIONS_PER_DIMENSION)

    const resultCode = payload.mode === 'dual'
      ? computed.relationship?.code
      : computed.perception?.code
    if (resultCode) {
      submitStats(resultCode, payload.mode).catch(() => {})
    }

    if (payload.mode === 'dual') {
      const [answersA = {}, answersB = {}] = Array.isArray(payload.answers) ? payload.answers : []
      const playerA = computed.players?.[0]
      const playerB = computed.players?.[1]
      if (playerA?.dimensionScores && answersA) {
        submitTelemetry({
          mode: 'dual',
          questionCount: QUESTIONS.length,
          answers: answersA,
          dimensionScores: playerA.dimensionScores,
        }).catch(() => {})
      }
      if (playerB?.dimensionScores && answersB) {
        submitTelemetry({
          mode: 'dual',
          questionCount: QUESTIONS.length,
          answers: answersB,
          dimensionScores: playerB.dimensionScores,
        }).catch(() => {})
      }
    } else if (computed?.perception?.dimensionScores && payload.answers) {
      submitTelemetry({
        mode: 'single',
        questionCount: QUESTIONS.length,
        answers: payload.answers,
        dimensionScores: computed.perception.dimensionScores,
      }).catch(() => {})
    }

    const preloadTask = resultCode
      ? preloadTypeImage(resultCode)
      : Promise.resolve()

    setResultData(computed)
    saveStoredResult(computed)
    setLoadingMeta({
      preloadTask,
      minDurationMs: 800,
    })
    setView('loading')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Loading 结束 → 结果页
  function handleLoadingDone() {
    setView('result')
    replaceLocationHash('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // 重新测试
  function handleRestart() {
    clearQuizDraft()
    goQuizHome()
  }

  function goResultFromAi() {
    const stored = resultData ? { status: 'ready', resultData } : readStoredResult()
    if (stored.status === 'ready') {
      setResultData(stored.resultData)
      setView('result')
      replaceLocationHash('')
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }

    setView('home')
    setMainTab('ai')
    replaceLocationHash('#ai')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // ── Loading ────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <Loading
        onDone={handleLoadingDone}
        minDurationMs={loadingMeta.minDurationMs}
        preloadTask={loadingMeta.preloadTask}
      />
    )
  }

  // ── 结果海报 ───────────────────────────────────────────────
  if (view === 'result' && resultData) {
    return (
      <AppShell headerNav={headerNav} contentWidth="wide" flushTop>
        <AnimatePresence mode="wait">
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <Suspense fallback={<div className="py-16 text-center text-base-mute">{t('result.suspense_loading')}</div>}>
              <ResultPoster
                resultData={resultData}
                onRestart={handleRestart}
                onOpenAi={goAiAssistant}
              />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </AppShell>
    )
  }

  // ── AI 关系助手独立页 ───────────────────────────────────────
  if (view === 'ai' && resultData) {
    return (
      <AppShell
        headerNav={headerNav}
        contentWidth="wide"
        compactMobileBottom
        flushTop
        flushBottom
        flushHorizontal
      >
        <AnimatePresence mode="wait">
          <motion.div
            key="ai"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            <AiRelationshipPage
              resultData={resultData}
              onBackToResult={goResultFromAi}
            />
          </motion.div>
        </AnimatePresence>
      </AppShell>
    )
  }

  // ── 首页：问卷 或 情侣类型 ───────────────────────────────────
  return (
    <AppShell
      headerNav={headerNav}
      contentSurface={mainTab === 'types' ? 'white' : 'muted'}
    >
      {mainTab === 'types' ? (
        <Suspense fallback={<div className="py-12 text-center text-base-mute">{t('result.suspense_loading')}</div>}>
          <CoupleTypesPage onStartTest={goQuizHome} />
        </Suspense>
      ) : mainTab === 'stats' ? (
        <StatsPage
          onStartTest={goQuizHome}
          onGoTypes={goCoupleTypes}
        />
      ) : mainTab === 'ai' ? (
        <AiUnlockPage onStartTest={goQuizHome} />
      ) : mainTab === 'help' ? (
        <HelpPage onStartTest={goQuizHome} />
      ) : (
        <>
          {/* 紧凑首屏：上下 padding 压缩，让 hero + 三步 + 主 CTA 在常见视口一屏可见。
              选了模式后用户已经进入滚动答题节奏，紧凑感不会有负面影响。 */}
          <div className="pt-4 pb-4 text-center md:pt-8 md:pb-6">
            <p className="text-eyebrow mb-2.5">{t('home.eyebrow')}</p>
            <h1 className="text-[26px] md:text-[36px] font-extrabold leading-tight mb-3 text-base-text">
              <span className="cpti-word font-display" aria-label="CPTI">
                <span className="cpti-gradient-bg" aria-hidden>
                  {['C', 'P', 'T', 'I'].map((char) => (
                    <span key={`g-${char}`}>{char}</span>
                  ))}
                </span>
                {['C', 'P', 'T', 'I'].map((char, i) => (
                  <span
                    key={char}
                    className="cpti-letter"
                    style={{ '--i': i }}
                  >
                    {char}
                  </span>
                ))}
              </span>
              <span>{t('home.title_suffix')}</span>
            </h1>
            <p className="text-mute mx-auto max-w-xl text-sm md:text-[15px]">
              {t('home.subtitle')}
            </p>
          </div>

          <HomeStepCards />

          <div className="my-4 border-t border-gray-100 md:my-5" />

          <Questionnaire onComplete={handleQuizComplete} />
        </>
      )}
    </AppShell>
  )
}

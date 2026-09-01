import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { TRANSLATIONS } from './translations'

/**
 * CPTI 轻量级 i18n —— 仅依赖 React Context，无第三方库。
 *
 * 支持语言：'zh'（默认） | 'en'
 * 持久化：localStorage('cpti_lang')；首次访问读取浏览器语言，默认中文。
 *
 * 用法：
 *   const { lang, setLang, t } = useLanguage()
 *   t('common.start_test')                  // 简单 key
 *   t('foo.bar', { count: 3 })              // 占位符替换 {count}
 *   t('dim.SI.posLabel', { fallback: '' })  // 兜底
 */

const STORAGE_KEY = 'cpti_lang'
const SUPPORTED = ['zh', 'en']
const DEFAULT_LANG = 'zh'

/** 首屏语言：无 window / 隐私模式读失败 / 非法值一律回退默认中文。 */
function readInitialLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved && SUPPORTED.includes(saved)) return saved
  } catch {
    // 隐私模式静默
  }
  return DEFAULT_LANG
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined
  const segments = path.split('.')
  let cur = obj
  for (const seg of segments) {
    if (cur && typeof cur === 'object' && seg in cur) {
      cur = cur[seg]
    } else {
      return undefined
    }
  }
  return cur
}

/** 替换 `{name}`；缺键或非自有属性则原样保留占位符，避免把原型链字段插进文案。 */
function interpolate(template, vars) {
  if (typeof template !== 'string' || !vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`
  )
}

const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
})

/**
 * 根级 i18n Provider。把当前语言写入 localStorage，并同步 `<html lang>`。
 *
 * @param {object} props
 * @param {*} props.children
 * @returns {JSX.Element}
 * 副作用：读写 localStorage('cpti_lang')；更新 document.documentElement.lang
 */
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
    }
  }, [lang])

  const setLang = useCallback((next) => {
    if (SUPPORTED.includes(next)) setLangState(next)
  }, [])

  const t = useCallback((key, options = {}) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG]
    let value = getByPath(dict, key)
    if (value === undefined) {
      // 当前语言缺键时回退中文，再回退到 options.fallback 或原 key
      const fallbackDict = TRANSLATIONS[DEFAULT_LANG]
      value = getByPath(fallbackDict, key)
    }
    if (value === undefined) {
      if ('fallback' in options) return options.fallback
      return key
    }
    if (typeof value === 'string' && options && Object.keys(options).length > 0) {
      return interpolate(value, options)
    }
    return value
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/**
 * 读取当前语言与翻译函数。Context 有默认值，Provider 外调用不会抛错，只会得到 no-op setLang。
 *
 * @returns {{ lang: 'zh' | 'en', setLang: function(string): void, t: function(string, object=): * }}
 * 副作用：无（写存储发生在 LanguageProvider 的 setLang 之后）
 */
export function useLanguage() {
  return useContext(LanguageContext)
}

/**
 * 语言后缀辅助：把 zh 数据转换成英文等价版本时，按 lang 选择字段。
 * 如：pickByLang(lang, { zh: '中文', en: 'English' })
 */
export function pickByLang(lang, dict) {
  if (!dict) return ''
  return dict[lang] ?? dict[DEFAULT_LANG] ?? ''
}

import { getResultByCode } from './scoring'

export function getResultThemeClass(resultData) {
  const code = resultData?.mode === 'dual'
    ? resultData?.relationship?.code
    : resultData?.perception?.code
  const result = getResultByCode(code)
  return result?.themeClass || 'theme-blue'
}

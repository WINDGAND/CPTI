import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clearStoredResult,
  readStoredResult,
  saveStoredResult,
} from '../src/utils/resultPersistence.js'

function installLocalStorage() {
  const store = new Map()
  global.window = {
    localStorage: {
      getItem: (key) => store.has(key) ? store.get(key) : null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
  }
  return store
}

const resultData = {
  mode: 'single',
  perception: {
    code: 'SPOA',
    result: { code: 'SPOA', title: '稳稳生活搭子' },
    percentages: { S: 80, I: 20 },
    sourceAnswers: { 'SI-1': 1 },
  },
}

test('saveStoredResult persists the latest result for page refresh recovery', () => {
  installLocalStorage()

  saveStoredResult(resultData, { now: () => 1000 })
  const restored = readStoredResult({ now: () => 2000 })

  assert.equal(restored.status, 'ready')
  assert.equal(restored.resultData.mode, 'single')
  assert.equal(restored.resultData.perception.code, 'SPOA')
  assert.equal(restored.resultData.perception.sourceAnswers['SI-1'], 1)
})

test('readStoredResult clears expired or invalid local result data', () => {
  const store = installLocalStorage()

  saveStoredResult(resultData, { now: () => 1000 })
  const expired = readStoredResult({ now: () => 1000 + 31 * 24 * 60 * 60 * 1000 })
  assert.equal(expired.status, 'expired')
  assert.equal(store.size, 0)

  store.set('cpti:latest-result:v1', '{broken')
  const invalid = readStoredResult()
  assert.equal(invalid.status, 'invalid-json')
  assert.equal(store.size, 0)
})

test('clearStoredResult removes the persisted result', () => {
  const store = installLocalStorage()

  saveStoredResult(resultData)
  clearStoredResult()

  assert.equal(store.size, 0)
  assert.equal(readStoredResult().status, 'empty')
})

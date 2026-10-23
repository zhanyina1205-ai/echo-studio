import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initialDemo, makeDraft, canConfirmDemo, demoNeedsReview, toneKeys, moments, sampleStats, samples, escapeHtml, stepKeys } from '../source/demo-model.mjs'

test('演示默认没有已确认、发布或已保存结果', () => {
  const state = initialDemo()
  assert.equal(state.step, 'inbox'); assert.equal(state.draftVersion, 0); assert.equal(state.confirmed, false)
  assert.equal(canConfirmDemo(state), false); assert.equal(demoNeedsReview(state), false)
  assert.equal('publishedAt' in state, false)
})
test('三种语气保留同一条虚构事实', () => {
  const drafts = toneKeys.map(tone => makeDraft(tone))
  assert.equal(new Set(drafts).size, 3)
  for (const draft of drafts) { assert.match(draft, /18:30/); assert.match(draft, /虚构/); assert.doesNotMatch(draft, /19:00/) }
})
test('不认识的语气或版本拒绝生成', () => {
  assert.throws(() => makeDraft('模仿本人')); assert.throws(() => makeDraft('温和回应', 3))
})
test('确认必须有草稿且主动勾选', () => {
  const state = { ...initialDemo(), draftVersion: 1 }
  assert.equal(canConfirmDemo(state), false)
  assert.equal(canConfirmDemo({ ...state, checked: true }), true)
  assert.equal(canConfirmDemo({ ...initialDemo(), checked: true }), false)
})
test('口径变更后旧稿保留原文并阻止确认', () => {
  const state = { ...initialDemo(), draftVersion: 1, draftTone: '温和回应', checked: true, sourceVersion: 2 }
  assert.equal(demoNeedsReview(state), true); assert.equal(canConfirmDemo(state), false)
  assert.match(makeDraft(state.draftTone, state.draftVersion), /18:30/)
  assert.match(makeDraft(state.draftTone, state.sourceVersion), /19:00/)
})
test('新稿引用新版本并重置确认后才可继续', () => {
  const state = { ...initialDemo(), draftVersion: 2, sourceVersion: 2 }
  assert.equal(demoNeedsReview(state), false); assert.equal(canConfirmDemo(state), false)
  assert.equal(canConfirmDemo({ ...state, checked: true }), true)
})
test('样本统计不把重复文本当独立人数', () => {
  const stats = sampleStats()
  assert.equal(stats.raw, 4); assert.equal(stats.unique, 3)
  assert.deepEqual(stats.topics.map(item => item.count), [1, 1, 2])
  assert.equal(stats.topics.reduce((total, item) => total + item.count, 0), stats.raw)
  assert.equal(samples.filter(item => item.sentiment === '混合').length, 1)
})
test('四个工作情境均有使用者动作、目标与边界说明', () => {
  assert.equal(Object.keys(moments).length, 4)
  for (const moment of Object.values(moments)) for (const key of ['title', 'before', 'action', 'result', 'note']) assert.ok(moment[key].length > 10)
})
test('文本转义不会把尖括号、引号当HTML', () => {
  assert.equal(escapeHtml('<script>"x" & \'y\'</script>'), '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;')
})
test('章节链接和ID完整，按钮与演示控制一致', async () => {
  const html = await readFile(new URL('../source/index.html', import.meta.url), 'utf8')
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])
  assert.equal(new Set(ids).size, ids.length)
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1])
  for (const step of stepKeys) assert.ok(html.includes(`data-step="${step}"`))
  for (const key of Object.keys(moments)) assert.ok(html.includes(`data-moment="${key}"`))
})
test('提案不接入存储、平台调用或统计脚本', async () => {
  const script = await readFile(new URL('../source/app.js', import.meta.url), 'utf8')
  assert.doesNotMatch(script, /\b(fetch|XMLHttpRequest|localStorage|indexedDB|sendBeacon)\b/)
  const html = await readFile(new URL('../source/index.html', import.meta.url), 'utf8')
  assert.doesNotMatch(html, /<script[^>]+src=/)
  assert.match(html, /没有跨设备同步、云备份或加密存储/)
  assert.match(html, /规则与人工校正/)
})

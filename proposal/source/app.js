const byId = id => document.getElementById(id)
let demo = initialDemo()
const stepLabels = { inbox: '待处理', reply: '回复台', event: '事件簿', brief: '反馈简报' }
const live = text => { byId('demo-live').textContent = text }

function renderMoment(key) {
  const moment = moments[key]
  if (!moment) return
  document.querySelectorAll('[data-moment]').forEach(button => {
    const active = button.dataset.moment === key
    button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1
  })
  byId('moment-panel').setAttribute('aria-labelledby', `moment-tab-${key}`)
  byId('moment-panel').innerHTML = `<div class="moment-quote"><span class="moment-time">${moment.time}<small>情境时间示意</small></span><blockquote>${escapeHtml(moment.quote)}</blockquote><span class="handwriting">a moment, not another task.</span></div><div class="moment-content"><span class="eyebrow">${moment.label}</span><h3>${moment.title}</h3><p>${moment.before}</p><dl><div><dt>谁来用 / 怎么用</dt><dd>${moment.action}</dd></div><div><dt>希望带来的帮助</dt><dd>${moment.result}</dd></div></dl><p class="footnote">${moment.note}</p></div>`
}

function renderDemo() {
  document.querySelectorAll('[data-step]').forEach(button => {
    const active = button.dataset.step === demo.step
    button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1
  })
  byId('demo-panel').setAttribute('aria-labelledby', `step-tab-${demo.step}`)
  byId('demo-step-count').textContent = `0${stepKeys.indexOf(demo.step) + 1} / 04`
  const heading = (label, title) => `<div class="screen-heading"><span class="eyebrow">${label}</span><h3>${title}</h3><span class="pill pink">虚构交互示意</span></div>`
  if (demo.step === 'inbox') {
    byId('demo-panel').innerHTML = `${heading('01 / THE INBOX', '先看原话，不急着下结论。')}<article class="screen-original"><span>示例活动评论 / 人工粘贴</span><blockquote>“${samples[0].content}”</blockquote><span class="screen-source">虚构来源说明 · 非平台采集</span></article><div class="screen-tags"><span class="pill">讨论对象 / 工作室运营</span><span class="pill">诉求 / 信息争议</span><span class="pill amber">状态 / 待核实</span></div><div class="screen-explanation"><strong>${demo.manual ? '已人工校正（本页示意）' : '规则建议 · 仍需人工判断'}</strong><p>出现时间差异与求证表达。核实信号不等于事实结论，也不等于必须公开回应。</p></div><div class="screen-buttons"><button class="demo-button light" data-action="manual">${demo.manual ? '撤销本页校正标记' : '记录“已人工校正”示意'}</button><button class="demo-button dark" data-next="reply">去回复台，先找依据 ↗</button></div>`
  } else if (demo.step === 'reply') {
    const needsReview = demoNeedsReview(demo)
    byId('demo-panel').innerHTML = `${heading('02 / REPLY WITH CONTEXT', '语气之前，先有依据。')}<div class="screen-policy"><div><span class="pill sage">演示口径已确认</span><span class="screen-version">v${demo.sourceVersion}</span></div><h4>示例见面活动 / 签到说明</h4><p>${demo.sourceVersion === 1 ? factV1 : factV2}</p><small>依据：本页虚构活动说明 v${demo.sourceVersion}。不对应任何实际安排。</small></div><div class="tone-buttons" role="group" aria-label="选择示意草稿语气">${toneKeys.map(tone => `<button data-tone="${tone}" aria-pressed="${demo.tone === tone}">${tone}</button>`).join('')}</div><button class="demo-button light full" data-action="generate">${demo.draftVersion ? '按当前选择重新生成示意草稿' : '用此口径生成示意草稿'}</button>${demo.draftVersion ? `<div class="screen-draft"><div><strong>本页示意草稿</strong><span class="pill ${needsReview ? 'amber' : demo.confirmed ? 'sage' : ''}">${needsReview ? '依据变更 · 需复查' : demo.confirmed ? '已确认示意' : '尚未确认'}</span></div><p>${makeDraft(demo.draftTone, demo.draftVersion)}</p><small>引用快照 v${demo.draftVersion} · ${demo.draftTone}。改变语气不会自动改写旧稿。</small></div>${needsReview ? '<p class="screen-warning">口径已改为 v2，旧稿仍保留 v1。请核对后重新生成；当前不能确认。这只是版本变更机制示意。</p>' : ''}<label class="demo-confirm"><input type="checkbox" id="demo-check" ${demo.checked ? 'checked' : ''} ${needsReview ? 'disabled' : ''}>我已核对这段虚构示意的依据与表达。</label><button class="demo-button dark full" data-action="confirm" ${canConfirmDemo(demo) ? '' : 'disabled'}>${demo.confirmed && !needsReview ? '本页已记录确认 · 未发布' : '确认本段示意，不执行发布'}</button><button class="text-link version-test" data-action="change-version" ${demo.sourceVersion === 2 ? 'disabled' : ''}>${demo.sourceVersion === 2 ? '演示口径已更新至 v2' : '试试：口径变更后，旧草稿会怎样？ ↗'}</button>` : '<p class="screen-hint">模板不是事实核查。没有可用口径时，真实工具只提供保守占位稿。</p>'}<div class="screen-buttons"><span class="screen-hint">本页不复制、不发布、不持久保存。</span><button class="text-link" data-next="event">看看后续如何记录 →</button></div>`
  } else if (demo.step === 'event') {
    byId('demo-panel').innerHTML = `${heading('03 / FOLLOW THROUGH', '回复之后，事情还在。')}<div class="event-heading"><span class="pill amber">待核实 / 本页示意</span><h4>示例活动签到信息差异</h4><p>同一事项关联多条原话，不把重复询问当成多人独立结论。</p></div><dl class="event-facts"><div><dt><span class="signal-dot"></span>已确认</dt><dd>本页演示口径当前为 v${demo.sourceVersion}：${demo.sourceVersion === 1 ? factV1 : factV2}</dd></div><div><dt>？ 尚待核实</dt><dd>另一个版本从哪里来？是否还有公开说明需要核对？</dd></div><div><dt>↳ 下一步</dt><dd>工作人员核查来源后，手工补充日志。跟进人只是本地文字备注，不会推送任务。</dd></div></dl><button class="demo-button light full" data-action="sources" aria-expanded="${demo.showSources}">${demo.showSources ? '收起' : '查看'}两条关联原话（虚构）</button>${demo.showSources ? `<div class="event-sources"><blockquote>“${samples[0].content}”</blockquote><blockquote>“我也看到不同签到时间，请以哪一份为准？”</blockquote><small>这是两条不同的虚构问法，不是实时数据。</small></div>` : ''}<div class="screen-log"><span>示意跟进日志</span><p>已记录信息差异；待人工查证另一来源。未自动回应或标记解决。</p></div><button class="demo-button dark full" data-next="brief">去简报，看看整体样本 ↗</button>`
  } else {
    const stats = sampleStats()
    byId('demo-panel').innerHTML = `${heading('04 / REFLECT, WITH SOURCES', '不是“全网都在说”。')}<p class="screen-hint">仅本页所选 4 条虚构留言 · 与前面事件的关联条数不同。不是工作台当前数据。</p><div class="sample-counts"><div><strong>${stats.raw}</strong><span>原始留言</span></div><div><strong>${stats.unique}</strong><span>去重文本种类</span></div><div><strong>1</strong><span>混合反馈</span></div></div><div class="sample-topics">${stats.topics.map(item => `<div><span>${item.topic}</span><div class="topic-track"><i style="width:${item.count * 36}%"></i></div><b>${item.count}</b></div>`).join('')}</div><div class="brief-observation"><span class="eyebrow">人工补充示例 / 非自动洞察</span><p>本组样本涉及活动信息、字幕可读性与幕后内容期待。两条内容需求原文相同；不能据此判断有多少独立用户，更不能代表全网意见。</p></div><details class="sample-originals"><summary>查看这 4 条原始留言</summary>${samples.map((sample, index) => `<article><span>0${index + 1} / ${sample.topic} · ${sample.sentiment}</span><p>${sample.content}</p></article>`).join('')}</details><p class="screen-hint">真实工具可选日期和资料范围、保存样本范围与备注、导出 Markdown。简报不是不可变审计快照。</p><a class="demo-button dark full demo-open" href="${appUrl}" target="_blank" rel="noopener noreferrer">在真正的工作台，试自己的流程 ↗</a>`
  }
}

function selectStep(key, announce = true) {
  if (!stepKeys.includes(key)) return
  demo.step = key; renderDemo()
  if (announce) live(`当前展示：${stepLabels[key]}。本页状态为虚构示意，不写入真实工具。`)
}

function wireTabKeys(selector, choose) {
  const buttons = Array.from(document.querySelectorAll(selector))
  buttons.forEach((button, index) => button.addEventListener('keydown', event => {
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = buttons.length - 1
    else return
    event.preventDefault(); choose(buttons[next]); buttons[next].focus()
  }))
}

document.querySelectorAll('[data-moment]').forEach(button => button.addEventListener('click', () => renderMoment(button.dataset.moment)))
wireTabKeys('[data-moment]', button => renderMoment(button.dataset.moment))
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => selectStep(button.dataset.step)))
wireTabKeys('[data-step]', button => selectStep(button.dataset.step))
byId('demo-panel').addEventListener('click', event => {
  const button = event.target.closest('button')
  if (!button || button.disabled) return
  if (button.dataset.next) { selectStep(button.dataset.next); byId('demo-panel').focus({ preventScroll: true }); return }
  if (button.dataset.tone) { demo.tone = button.dataset.tone; renderDemo(); byId('demo-panel').querySelector(`[data-tone="${demo.tone}"]`).focus({ preventScroll: true }); live('已更改语气选择；已有示意草稿保持不变，须重新生成。'); return }
  switch (button.dataset.action) {
    case 'manual': demo.manual = !demo.manual; renderDemo(); live(demo.manual ? '已标记人工校正示意。只保留在本页，未保存。' : '已撤销本页校正标记。'); break
    case 'generate': demo.draftTone = demo.tone; demo.draftVersion = demo.sourceVersion; demo.checked = false; demo.confirmed = false; renderDemo(); live(`已生成虚构示意草稿，引用 v${demo.draftVersion}，尚未确认或发布。`); break
    case 'confirm': if (canConfirmDemo(demo)) { demo.confirmed = true; renderDemo(); live('本页已记录确认示意。没有复制、发布或写入真实工作台。') } break
    case 'change-version': demo.sourceVersion = 2; demo.checked = false; demo.confirmed = false; renderDemo(); live('口径已更新为 v2，旧示意草稿仍保留 v1。确认已禁用，请重新核对并生成。'); break
    case 'sources': demo.showSources = !demo.showSources; renderDemo(); break
  }
})
byId('demo-panel').addEventListener('change', event => {
  if (event.target.id !== 'demo-check') return
  demo.checked = event.target.checked
  const button = byId('demo-panel').querySelector('[data-action="confirm"]')
  if (button) button.disabled = !canConfirmDemo(demo)
})
byId('reset-demo').addEventListener('click', () => { demo = initialDemo(); renderDemo(); live('虚构演示已重置。刷新本页也会清除这段临时状态。') })

const menuButton = byId('menu-toggle')
function closeMenu(restoreFocus = false) {
  byId('mobile-menu').hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', '展开章节目录')
  if (restoreFocus) menuButton.focus()
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true'
  byId('mobile-menu').hidden = !open; menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? '收起章节目录' : '展开章节目录')
})
byId('mobile-menu').addEventListener('click', event => { if (event.target.closest('a')) closeMenu() })
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !byId('mobile-menu').hidden) closeMenu(true) })
window.addEventListener('resize', () => { if (window.innerWidth > 1000) closeMenu() }, { passive: true })

byId('print-proposal').addEventListener('click', () => window.print())
const screenshotDialog = byId('screenshot-dialog')
byId('open-screenshot').addEventListener('click', () => { screenshotDialog.showModal(); byId('close-screenshot').focus() })
byId('close-screenshot').addEventListener('click', () => { screenshotDialog.close(); byId('open-screenshot').focus() })
screenshotDialog.addEventListener('click', event => { if (event.target === screenshotDialog) { const bounds = screenshotDialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) screenshotDialog.close() } })
screenshotDialog.addEventListener('close', () => byId('open-screenshot').focus())

function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  byId('reading-progress').style.width = `${max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0}%`
}
window.addEventListener('scroll', updateProgress, { passive: true })
window.addEventListener('resize', updateProgress, { passive: true })
window.addEventListener('load', updateProgress, { once: true })
renderMoment('release'); renderDemo(); updateProgress()

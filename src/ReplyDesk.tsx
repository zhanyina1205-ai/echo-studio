import { useEffect, useState } from 'react'
import { ArrowUpRight, BookOpen, Check, CheckCheck, Copy, FilePenLine, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { displayTime, draftProblems, generateDraft, matchingPolicies, nowIso, policyProblem, safeUrl, tones, uid, type Draft, type Message, type Policy } from './domain'
import { useWorkspace } from './store'
import { Badge, Empty, localDateTime, SourceLink, useDirty } from './ui'
import { PolicyEditor } from './PolicyEditor'

export function ReplyDesk({ messageId, selectMessage, dirty, onDirty }: { messageId: string; selectMessage: (id: string) => void; dirty: boolean; onDirty: (value: boolean) => void }) {
  const { data, busy, mutate, notify } = useWorkspace()
  const [view, setView] = useState<'drafts' | 'policies'>('drafts')
  const [editor, setEditor] = useState<Policy | 'new' | null>(null)
  const [draftId, setDraftId] = useState('')
  const message = data.messages.find(item => item.id === messageId) || data.messages[0]
  const drafts = data.drafts.filter(draft => draft.messageId === message?.id).sort((first, second) => second.createdAt.localeCompare(first.createdAt))
  const draft = drafts.find(item => item.id === draftId) || drafts[0]
  useEffect(() => { setDraftId('') }, [message?.id])
  const changeView = (next: 'drafts' | 'policies') => { if (!dirty || window.confirm('有未保存的草稿更改，确定放弃？')) setView(next) }
  return <><div className="section-toolbar"><div className="segmented compact"><button aria-pressed={view === 'drafts'} onClick={() => changeView('drafts')}><FilePenLine size={15} />回复草稿</button><button aria-pressed={view === 'policies'} onClick={() => changeView('policies')}><BookOpen size={15} />口径库 <span>{data.policies.length}</span></button></div><button className="button outline-button" onClick={() => setEditor('new')}><Plus size={15} />添加口径</button></div>
    {view === 'policies' ? <><div className="section-intro"><h2>语气之前，先有依据。</h2><p>确认状态是本机人工记录，不是平台验证或真实多人审批。</p></div>{data.policies.length ? <div className="policy-grid">{data.policies.map(policy => {
      const problem = policyProblem(policy)
      const affected = data.drafts.filter(item => item.refs.some(reference => reference.id === policy.id)).length
      return <article className="policy-card" key={policy.id}><div className="row-between"><Badge kind={problem ? 'amber' : 'sage'}>{problem || '已确认 · 可引用'}</Badge><span className="small muted">v{policy.version}</span></div><h3>{policy.title}</h3><p className="hint">适用事项：{policy.context}</p><p className="policy-body">{policy.text}</p><div className="tag-row"><Badge>{policy.scope}</Badge>{policy.demo && <Badge kind="pink">虚构演示</Badge>}</div><p className="hint">来源：{policy.source || policy.confirmation || '尚未提供'}<br />有效至：{policy.validUntil || '未设置，仍需人工核对'}<br />关联 {affected} 条草稿 · {displayTime(policy.updatedAt)}</p>{safeUrl(policy.source) && <SourceLink value={policy.source} label="查看依据" />}<div className="card-footer"><button className="text-button" onClick={() => setEditor(policy)}>编辑并更新版本<ArrowUpRight size={14} /></button><button className="icon-button muted" aria-label={`删除口径${policy.title}`} disabled={busy} onClick={async () => { if (!window.confirm(`删除「${policy.title}」？关联草稿将需要复查，旧引用快照仍保留。此删除无法撤销。`)) return; if (await mutate(workspace => ({ ...workspace, policies: workspace.policies.filter(item => item.id !== policy.id) }))) notify('口径已删除，引用它的草稿需要重新检查。') }}><Trash2 size={15} /></button></div></article>
    })}</div> : <Empty title="先建立一条可以确认的口径。" text="没有依据时，工具只会准备保守的占位草稿，不会补出活动时间或私人承诺。" action={<button className="button dark-button" onClick={() => setEditor('new')}>添加第一条口径</button>} />}</> : !message ? <Empty title="从一条原话开始。" text="先到待处理页面录入或导入留言，再准备有依据的回复。" /> : <>
      <label className="message-select">当前回复对象<select value={message.id} onChange={event => selectMessage(event.target.value)}>{data.messages.map(item => <option key={item.id} value={item.id}>{item.demo ? '演示 / ' : ''}{item.content.slice(0, 65)}</option>)}</select></label>
      <div className="reply-layout"><DraftEditor key={`${message.id}:${draft?.id || 'new'}`} message={message} initial={draft} onDirty={onDirty} saved={setDraftId} /><aside className="reply-sidebar"><div className="side-note"><span className="eyebrow">WHAT WE DO NOT DO</span><span className="side-note-star" aria-hidden="true">✳</span><h3>草稿不是发布。<br />亲切不等于代言。</h3><p>不编造演员本人经历、感受和承诺。所有对外内容，都由实际工作人员核实。</p></div><div className="panel draft-history"><div className="row-between"><h3>这一条的草稿</h3><Badge>{drafts.length}</Badge></div><p className="hint">每次生成新版本；已记录发布的原稿不被新改写覆盖。</p>{drafts.length ? drafts.map((item, index) => <button key={item.id} className={`draft-history-item ${draft?.id === item.id ? 'active' : ''}`} onClick={() => { if (!dirty || window.confirm('有未保存的更改，确定切换草稿？')) setDraftId(item.id) }}><span>草稿 {drafts.length - index}<Badge kind={draftProblems(item, data.policies).length ? 'amber' : item.state === '本人确认' ? 'sage' : ''}>{draftProblems(item, data.policies).length ? '需复查' : item.state}</Badge></span><small>{displayTime(item.createdAt)}{item.publishedAt ? ' · 已人工记录发布' : item.copiedAt ? ' · 已复制，未记录发布' : ''}</small></button>) : <p className="small muted">还没有保存的草稿。</p>}</div></aside></div>
    </>}{editor && <PolicyEditor initial={editor === 'new' ? undefined : editor} scope={message?.topic} close={() => setEditor(null)} />}</>
}

function DraftEditor({ message, initial, onDirty, saved }: { message: Message; initial?: Draft; onDirty: (value: boolean) => void; saved: (id: string) => void }) {
  const { data, mutate, notify, busy } = useWorkspace()
  const matches = matchingPolicies(message, data.policies)
  const [policyId, setPolicyId] = useState(initial?.refs[0]?.id || '')
  const [tone, setTone] = useState<Draft['tone']>(initial?.tone || '温和回应')
  const [text, setText] = useState(initial?.text || '')
  const [baseline, setBaseline] = useState(initial?.text || '')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [publishedTime, setPublishedTime] = useState(localDateTime(nowIso()))
  const [publishedCheck, setPublishedCheck] = useState(false)
  const dirty = text !== baseline
  useDirty(dirty, onDirty)
  const problems = initial ? draftProblems(initial, data.policies) : []
  const save = async (state: Draft['state']) => {
    setError('')
    if (!initial || !text.trim()) { setError('请先生成一条模板草稿，再编辑保存。'); return }
    if (state === '本人确认' && (!checked || draftProblems(initial, data.policies).length)) { setError('请核对当前口径，并勾选人工确认声明。过期或变更的口径须重新生成。'); return }
    const fork = Boolean(initial.publishedAt && text !== initial.text)
    const time = nowIso()
    const next: Draft = { ...initial, id: fork ? uid() : initial.id, text: text.trim(), state, updatedAt: time, createdAt: fork ? time : initial.createdAt, confirmedAt: state === '本人确认' ? time : '', copiedAt: dirty || fork ? '' : initial.copiedAt, publishedAt: fork ? '' : initial.publishedAt, publishedUrl: fork ? '' : initial.publishedUrl }
    if (await mutate(workspace => ({ ...workspace, drafts: fork ? [next, ...workspace.drafts] : workspace.drafts.map(item => item.id === next.id ? next : item), messages: workspace.messages.map(item => item.id === message.id && item.status === '未处理' ? { ...item, status: '准备回复' } : item) }))) { setText(next.text); setBaseline(next.text); saved(next.id); notify(state === '本人确认' ? '已记录本人确认。尚未发布到任何平台。' : fork ? '已另存新草稿，原发布记录仍保留。' : '草稿已保存，不代表已发布。') }
  }
  return <section className="panel draft-editor"><div className="row-between"><span className="eyebrow">REPLY WITH CONTEXT</span><Badge kind="pink">模板草稿 · 非 AI</Badge></div><blockquote className="original-quote">“{message.content}”</blockquote><div className="row-between wrap"><div className="tag-row"><Badge>{message.platform}</Badge>{message.demo && <Badge kind="pink">虚构演示</Badge>}<Badge>{message.topic}</Badge></div><SourceLink value={message.link} /></div>{message.priority && <p className="notice amber-note">这条留言有待核实信号。分类不是事实结论，也不代表必须公开回应。</p>}
    <div className="form-grid"><label>表达方式<select value={tone} onChange={event => setTone(event.target.value as Draft['tone'])}>{tones.map(value => <option key={value}>{value}</option>)}</select></label><label>依据口径<select value={policyId} onChange={event => setPolicyId(event.target.value)}><option value="">无口径，仅生成保守占位草稿</option>{data.policies.filter(policy => policy.demo === message.demo).map(policy => <option key={policy.id} value={policy.id} disabled={Boolean(policyProblem(policy))}>{policy.context} / {policy.title} / v{policy.version}{policyProblem(policy) ? ` / ${policyProblem(policy)}` : ''}</option>)}</select></label></div>
    <p className="hint">候选匹配：{matches.length ? matches.map(policy => policy.title).join('、') : '暂无同类口径'}。候选不等于适用，请人工选择并核实事项。</p><p className="hint">一次引用一条口径。真实留言不能使用演示口径；未确认或过期的口径不可引用。更换选择后须重新生成，不会悄悄改写旧稿。</p><button className="button outline-button full" disabled={busy} onClick={async () => {
      if (dirty && !window.confirm('当前改写尚未保存，生成新草稿将放弃这些未保存改写，是否继续？')) return
      setError('')
      try {
        const policy = policyId ? data.policies.find(item => item.id === policyId) : undefined
        if (policyId && !policy) throw new Error('所选口径已不存在，请重新选择。')
        const next = generateDraft(message, tone, policy, data.policies)
        if (await mutate(workspace => ({ ...workspace, drafts: [next, ...workspace.drafts] }))) { setBaseline(text); saved(next.id); notify('新模板草稿已保存，请人工核对、改写和确认。') }
      } catch (failure) { setError(failure instanceof Error ? failure.message : '生成失败，请先核实口径。') }
    }}><RefreshCw size={15} />{initial ? '依据当前选择，另存一份模板草稿' : '生成并保存模板草稿'}</button>
    {initial && <><div className="divider-heading"><h3>留给对方的话。</h3><Badge kind={problems.length ? 'amber' : initial.state === '本人确认' && !dirty ? 'sage' : ''}>{dirty ? '有未保存改写' : problems.length ? '口径需复查' : initial.state}</Badge></div>{problems.length > 0 && <div className="notice amber-note" role="alert">{problems.map(problem => <p key={problem}>{problem}</p>)}<p>旧稿不被自动改写；请核实并另存新稿。目前不能确认、复制或记录发布。</p></div>}<label className="visually-hidden" htmlFor="draft-text">回复草稿正文</label><textarea id="draft-text" rows={7} maxLength={20000} value={text} onChange={event => { setText(event.target.value); setChecked(false) }} /><p className="hint">人工改写仍需自行核实。工具未进行事实核查，也未调用大模型或平台发布接口。</p><details className="source-detail"><summary>查看本稿引用依据与版本（{initial.refs.length}）</summary>{initial.refs.length ? initial.refs.map(reference => <div key={reference.id}><h4>{reference.context} / {reference.title} · v{reference.version}</h4><p>{reference.text}</p><p className="hint">来源：{reference.source || reference.confirmation}<br />有效至：{reference.validUntil || '未设置'}</p>{safeUrl(reference.source) && <SourceLink value={reference.source} label="查看依据原文" />}</div>) : <p className="hint">本稿没有引用具体事实口径，只是保守占位模板。请勿添加未经确认的信息。</p>}</details><div className="button-row"><button className="button outline-button" disabled={busy} onClick={() => void save('草稿')}>保存改写</button><button className="button quiet-button" disabled={busy} onClick={() => void save('待确认')}>留待确认</button><button className="button quiet-button" disabled={busy} onClick={() => void save('需修改')}>标记需修改</button></div><div className="confirmation-box"><label className="check-label"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />我已核对事实与账号身份，没有添加未确认承诺。这是本机本人确认，不是团队审批。</label><button className="button dark-button" disabled={busy || !checked || Boolean(problems.length)} onClick={() => void save('本人确认')}><Check size={16} />保存并记录本人确认</button></div><div className="copy-row"><button className="button pink-button" disabled={busy || dirty || initial.state !== '本人确认' || Boolean(problems.length)} onClick={async () => {
      setError('')
      if (draftProblems(initial, data.policies).length) return setError('口径已变化，请先重新核实。')
      try {
        if (!navigator.clipboard?.writeText) throw new Error('剪贴板不可用')
        await navigator.clipboard.writeText(initial.text)
      } catch { setError('浏览器未允许复制。请在上方正文中手动选择并复制；工具没有记录复制成功。'); return }
      if (await mutate(workspace => ({ ...workspace, drafts: workspace.drafts.map(item => item.id === initial.id ? { ...item, copiedAt: nowIso() } : item) }))) notify('已复制。没有发送到平台，也没有标记发布。')
      else setError('正文已复制，但复制记录保存失败，请保留此页重试。')
    }}><Copy size={16} />复制已确认回复</button><span className="hint">{initial.copiedAt ? `本机复制记录 ${displayTime(initial.copiedAt)} · 不等于发布` : '本人确认后可复制，复制不发布。'}</span></div>
      {initial.publishedAt ? <div className="published-record"><CheckCheck size={18} /><div><strong>本人记录：已在平台手动发布</strong><p>{displayTime(initial.publishedAt)}</p><SourceLink value={initial.publishedUrl} label="查看本人填写的发布链接" /><p className="hint">不是接口核验结果。改写此稿会另存新稿，不覆盖这条发布记录。</p></div></div> : <details className="manual-publish"><summary>记录我已在平台手动发布</summary><p className="hint">这里不会发送任何消息，只保存你填写的结果。</p><label>实际发布链接<input type="url" value={publishedUrl} onChange={event => setPublishedUrl(event.target.value)} placeholder="https://…" /></label><label>实际发布时间<input type="datetime-local" value={publishedTime} onChange={event => setPublishedTime(event.target.value)} /></label><label className="check-label"><input type="checkbox" checked={publishedCheck} onChange={event => setPublishedCheck(event.target.checked)} />我确实已在平台手动发布，此处只做结果记录。</label><button className="button outline-button" disabled={busy || dirty || initial.state !== '本人确认' || !publishedCheck || Boolean(problems.length)} onClick={async () => {
        if (!safeUrl(publishedUrl) || !publishedTime || Number.isNaN(Date.parse(publishedTime)) || Date.parse(publishedTime) > Date.now()) return setError('请填写有效发布链接和不晚于当前时刻的实际发布时间。')
        if (draftProblems(initial, data.policies).length) return setError('口径需复查，请先核实。')
        if (await mutate(workspace => ({ ...workspace, drafts: workspace.drafts.map(item => item.id === initial.id ? { ...item, publishedAt: new Date(publishedTime).toISOString(), publishedUrl: safeUrl(publishedUrl) } : item), messages: workspace.messages.map(item => item.id === message.id ? { ...item, status: '已处理' } : item) }))) notify('已记录本人填写的发布结果，未执行平台发送。')
      }}>保存手动发布记录<ArrowUpRight size={15} /></button></details>}
    </>}{error && <p className="error-text" role="alert">{error}</p>}
  </section>
}

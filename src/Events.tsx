import { useState } from 'react'
import { ArrowUpRight, Check, Clock3, Link2, Plus, Trash2 } from 'lucide-react'
import { displayTime, eventStates, nowIso, uid, type StudioEvent } from './domain'
import { useWorkspace } from './store'
import { Badge, Empty, localDateTime, Modal, SourceLink, useDirty } from './ui'

export function EventEditor({ initial, messageIds = [], close }: { initial?: StudioEvent; messageIds?: string[]; close: () => void }) {
  const { data, mutate, busy, notify } = useWorkspace()
  const [form, setForm] = useState<StudioEvent>(() => initial ? structuredClone(initial) : { id: uid(), title: '', summary: '', known: '', pending: '', owner: '', nextCheck: '', status: '待核实', messageIds, logs: [], createdAt: nowIso(), updatedAt: nowIso(), demo: false })
  const [checkTime, setCheckTime] = useState(localDateTime(initial?.nextCheck || ''))
  const [touched, setTouched] = useState(false)
  useDirty(touched)
  const change = (next: Partial<StudioEvent>) => { setForm(value => ({ ...value, ...next })); setTouched(true) }
  const cancel = () => { if (!busy && (!touched || window.confirm('事件尚未保存，确定放弃更改？'))) close() }
  return <Modal title={initial ? '更新事件与下一步' : '让相关问题，留在一起。'} label="FOLLOW THROUGH" close={cancel} wide><form onSubmit={async event => {
    event.preventDefault()
    const time = nowIso()
    const related = data.messages.filter(message => form.messageIds.includes(message.id))
    const saved: StudioEvent = { ...form, title: form.title.trim(), nextCheck: checkTime ? new Date(checkTime).toISOString() : '', updatedAt: time, demo: related.length ? related.every(message => message.demo) : form.demo, logs: [...form.logs, { id: uid(), at: time, text: initial ? `本人更新事件信息${initial.status !== form.status ? `，状态：${initial.status} → ${form.status}` : ''}。` : '本人建立事件，未对外发送任何内容。' }] }
    if (await mutate(workspace => ({ ...workspace, events: initial ? workspace.events.map(item => item.id === saved.id ? saved : item) : [saved, ...workspace.events] }))) { notify('事件已保存。跟进人为本机备注，没有向任何人发送通知。'); close() }
  }}><fieldset disabled={busy}><label>事件标题<input required maxLength={120} value={form.title} onChange={event => change({ title: event.target.value })} placeholder="例：活动签到信息需要统一说明" /></label><label>情况摘要<textarea rows={3} maxLength={10000} value={form.summary} onChange={event => change({ summary: event.target.value })} placeholder="写观察，不把未经核实的说法写成结论。" /></label><div className="form-grid"><label>已经确认的信息<textarea rows={3} maxLength={5000} value={form.known} onChange={event => change({ known: event.target.value })} /></label><label>仍待核实的问题<textarea rows={3} maxLength={5000} value={form.pending} onChange={event => change({ pending: event.target.value })} /></label></div><div className="form-grid"><label>跟进人（文字备注）<input maxLength={100} value={form.owner} onChange={event => change({ owner: event.target.value })} placeholder="姓名 / 岗位，不会发送通知" /></label><label>处理状态<select value={form.status} onChange={event => change({ status: event.target.value as StudioEvent['status'] })}>{eventStates.map(value => <option key={value}>{value}</option>)}</select></label></div><label>下次检查时间（可空）<input type="datetime-local" value={checkTime} onChange={event => { setCheckTime(event.target.value); setTouched(true) }} /></label><p className="hint">只在打开工作台时提示到期，不是后台通知、定时任务或真实人员指派。</p><details className="related-picker" open><summary>关联留言 · 已选 {form.messageIds.length} 条</summary>{data.messages.map(message => <label className="check-label" key={message.id}><input type="checkbox" checked={form.messageIds.includes(message.id)} onChange={event => change({ messageIds: event.target.checked ? [...form.messageIds, message.id] : form.messageIds.filter(id => id !== message.id) })} /><span>{message.demo && <Badge kind="pink">演示</Badge>}{message.content}</span></label>)}</details><button className="button dark-button full" type="submit">保存事件<ArrowUpRight size={16} /></button></fieldset></form></Modal>
}

export function Events({ onMessage, dirty, onDirty }: { onMessage: (id: string) => void; dirty: boolean; onDirty: (value: boolean) => void }) {
  const { data, mutate, busy, notify } = useWorkspace()
  const [selected, setSelected] = useState(data.events[0]?.id || '')
  const [filter, setFilter] = useState('全部')
  const [editor, setEditor] = useState<StudioEvent | 'new' | null>(null)
  const filtered = data.events.filter(event => filter === '全部' || event.status === filter)
  const event = filtered.find(item => item.id === selected) || filtered[0]
  const safeChange = (action: () => void) => { if (!dirty || window.confirm('跟进记录尚未保存，确定放弃？')) action() }
  return <><div className="section-toolbar"><label className="inline-select">事件状态<select value={filter} onChange={change => safeChange(() => setFilter(change.target.value))}>{['全部', ...eventStates].map(value => <option key={value}>{value}</option>)}</select></label><button className="button dark-button" onClick={() => setEditor('new')}><Plus size={16} />建立事件</button></div>{!filtered.length ? <Empty title="还没有需要跟进的事件。" text="在待处理页面选中相关留言，或直接建立一个事件。先核实，再决定是否回应。" /> : <div className="events-layout"><div className="event-list">{filtered.map(item => <button className={`event-list-card ${item.id === event?.id ? 'active' : ''}`} key={item.id} onClick={() => safeChange(() => setSelected(item.id))}><div className="row-between"><Badge kind={item.status === '已结束' ? 'sage' : item.status === '待核实' ? 'amber' : ''}>{item.status}</Badge><span>{item.messageIds.length} 条原文</span></div><h3>{item.title}</h3><p>{item.summary || '尚未填写摘要'}</p><small>{item.owner || '未填写跟进人'} · {displayTime(item.updatedAt)}</small>{item.nextCheck && item.status !== '已结束' && Date.parse(item.nextCheck) <= Date.now() && <span className="due-label"><Clock3 size={12} />已到复查时间</span>}</button>)}</div>{event && <EventDetail key={event.id} event={event} onDirty={onDirty} onMessage={onMessage} edit={() => setEditor(event)} remove={async () => {
    if (!window.confirm(`删除事件「${event.title}」及其跟进记录？关联留言和草稿仍保留，此操作无法撤销。`)) return
    if (await mutate(workspace => ({ ...workspace, events: workspace.events.filter(item => item.id !== event.id) }))) notify('事件已删除，原留言仍保留。')
  }} busy={busy} />}</div>}{editor && <EventEditor initial={editor === 'new' ? undefined : editor} close={() => setEditor(null)} />}</>
}

function EventDetail({ event, onMessage, onDirty, edit, remove, busy }: { event: StudioEvent; onMessage: (id: string) => void; onDirty: (value: boolean) => void; edit: () => void; remove: () => void; busy: boolean }) {
  const { data, mutate, notify } = useWorkspace()
  const [note, setNote] = useState('')
  useDirty(Boolean(note.trim()), onDirty)
  const sources = data.messages.filter(message => event.messageIds.includes(message.id))
  const hasDemo = sources.some(message => message.demo)
  return <section className="panel event-detail"><div className="row-between"><span className="eyebrow">ONE EVENT / CLEAR NEXT STEP</span><Badge kind={event.status === '已结束' ? 'sage' : 'amber'}>{event.status}</Badge></div><h2>{event.title}</h2><div className="tag-row">{(event.demo || hasDemo) && <Badge kind="pink">{event.demo ? '虚构演示事件' : '关联资料包含虚构演示'}</Badge>}<Badge><Link2 size={11} />{sources.length} 条关联留言</Badge></div><p className="event-summary">{event.summary || '尚未填写摘要。'}</p><div className="evidence-grid"><div><span className="eyebrow">CONFIRMED BY HAND</span><h3>已确认的信息</h3><p>{event.known || '尚未填写，不自动补全。'}</p></div><div><span className="eyebrow">STILL TO CHECK</span><h3>仍待核实</h3><p>{event.pending || '尚未填写，由实际工作人员判断。'}</p></div></div><div className="event-meta"><p>跟进人：{event.owner || '未填写'}<small>仅本机文字备注，非实际指派</small></p><p>下次检查：{event.nextCheck ? displayTime(event.nextCheck) : '未设置'}<small>页面内提示，不会在后台推送</small></p></div><div className="button-row"><button className="button outline-button" onClick={edit}>更新事件与状态<ArrowUpRight size={16} /></button><button className="icon-button muted" aria-label="删除当前事件" disabled={busy} onClick={remove}><Trash2 size={16} /></button></div><details className="source-detail"><summary>回到关联原文（{sources.length}）</summary>{sources.map(message => <div className="linked-source" key={message.id}><button className="quote-link" onClick={() => onMessage(message.id)}>{message.content}<ArrowUpRight size={14} /></button><SourceLink value={message.link} /></div>)}</details><div className="divider-heading"><h3>处理留痕</h3><span className="small muted">不是对外消息</span></div><div className="timeline">{[...event.logs].reverse().map(log => <div key={log.id} className="timeline-item"><span /><div><time>{displayTime(log.at)}</time><p>{log.text}</p></div></div>)}</div><label>补充一条跟进记录<textarea rows={3} maxLength={5000} value={note} onChange={change => setNote(change.target.value)} placeholder="核实了什么，采取了什么动作，下一步是什么？" /></label><button className="button dark-button" disabled={busy || !note.trim()} onClick={async () => {
    const log = { id: uid(), at: nowIso(), text: note.trim() }
    if (await mutate(workspace => ({ ...workspace, events: workspace.events.map(item => item.id === event.id ? { ...item, updatedAt: log.at, logs: [...item.logs, log] } : item) }))) { setNote(''); notify('跟进记录已保存，没有发送到外部平台。') }
  }}><Check size={16} />保存跟进记录</button></section>
}

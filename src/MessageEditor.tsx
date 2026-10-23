import { useState } from 'react'
import { ArrowUpRight, RotateCcw } from 'lucide-react'
import { classify, intents, makeMessage, safeUrl, sentiments, statuses, targets, topics, type Message } from './domain'
import { useWorkspace } from './store'
import { Badge, localDateTime, Modal, useDirty } from './ui'

export function MessageEditor({ initial, close }: { initial?: Message; close: () => void }) {
  const { mutate, notify, busy } = useWorkspace()
  const [form, setForm] = useState<Message>(() => initial ? structuredClone(initial) : makeMessage(''))
  const [published, setPublished] = useState(localDateTime(initial?.publishedAt || ''))
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  useDirty(touched)
  const change = (next: Partial<Message>) => { setForm(value => ({ ...value, ...next })); setTouched(true) }
  const cancel = () => { if (!busy && (!touched || window.confirm('有尚未保存的留言更改，确定放弃？'))) close() }
  return <Modal title={initial ? '编辑留言与分类' : '记下一条留言'} label="ORIGINAL WORDS FIRST" close={cancel}><form onSubmit={async event => {
    event.preventDefault(); setError('')
    if (!form.content.trim()) return setError('请填写留言原文。')
    if (form.link && !safeUrl(form.link)) return setError('原文链接须为有效的 HTTP / HTTPS 地址。')
    const saved = { ...form, content: form.content.trim(), platform: form.platform.trim() || '手动录入', publishedAt: published ? new Date(published).toISOString() : '', manual: true }
    if (await mutate(workspace => ({ ...workspace, messages: initial ? workspace.messages.map(message => message.id === saved.id ? saved : message) : [saved, ...workspace.messages] }))) { notify('留言与分类已保存在此设备。'); close() }
  }}><fieldset disabled={busy}>{form.demo && <p className="notice"><Badge kind="pink">虚构演示</Badge> 编辑不会把演示内容变成真实资料。</p>}<label>留言原文<textarea required rows={4} maxLength={20000} value={form.content} onChange={event => change({ content: event.target.value })} placeholder="保留对方的原话，不先替对方下结论。" /></label><div className="form-grid"><label>来源平台<input maxLength={100} value={form.platform} onChange={event => change({ platform: event.target.value })} placeholder="微博 / 抖音 / 其他" /></label><label>发布时间（可空）<input type="datetime-local" value={published} onChange={event => { setPublished(event.target.value); setTouched(true) }} /></label></div><label>原文链接（可空）<input type="url" maxLength={2000} value={form.link} onChange={event => change({ link: event.target.value })} placeholder="https://…" /></label><div className="divider-heading"><h3>分类可以改，原话不被改写。</h3><button type="button" className="text-button" onClick={() => change({ ...classify(form.content), manual: false })}><RotateCcw size={14} />重新规则分类</button></div><p className="hint">规则只按关键词辅助，不代表 AI 理解；无法判断就留待确认。</p><div className="form-grid"><label>讨论对象<select value={form.target} onChange={event => change({ target: event.target.value as Message['target'] })}>{targets.map(value => <option key={value}>{value}</option>)}</select></label><label>表达诉求<select value={form.intent} onChange={event => change({ intent: event.target.value as Message['intent'] })}>{intents.map(value => <option key={value}>{value}</option>)}</select></label><label>情绪倾向<select value={form.sentiment} onChange={event => change({ sentiment: event.target.value as Message['sentiment'] })}>{sentiments.map(value => <option key={value}>{value}</option>)}</select></label><label>反馈主题<select value={form.topic} onChange={event => change({ topic: event.target.value as Message['topic'] })}>{topics.map(value => <option key={value}>{value}</option>)}</select></label></div><label>处理状态<select value={form.status} onChange={event => change({ status: event.target.value as Message['status'] })}>{statuses.map(value => <option key={value}>{value}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={form.priority} onChange={event => change({ priority: event.target.checked })} />需要优先人工核实，不代表事实已成立</label><p className="rule-reason">规则依据：{form.ruleReason}</p>{error && <p className="error-text" role="alert">{error}</p>}<button className="button dark-button full" type="submit">{busy ? '正在保存…' : '保存留言与分类'}<ArrowUpRight size={17} /></button></fieldset></form></Modal>
}

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { nowIso, policyStates, topics, uid, type Policy, type Topic } from './domain'
import { useWorkspace } from './store'
import { Badge, Modal, useDirty } from './ui'

export function PolicyEditor({ initial, scope = '其他', close }: { initial?: Policy; scope?: Topic; close: () => void }) {
  const { mutate, notify, busy } = useWorkspace()
  const [form, setForm] = useState<Policy>(() => initial ? structuredClone(initial) : { id: uid(), title: '', text: '', context: '', scope, keywords: '', source: '', confirmation: '', status: '待确认', validUntil: '', version: 1, updatedAt: nowIso(), demo: false })
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  useDirty(touched)
  const change = (next: Partial<Policy>) => { setForm(value => ({ ...value, ...next })); setTouched(true) }
  const cancel = () => { if (!busy && (!touched || window.confirm('口径尚未保存，确定放弃这些更改？'))) close() }
  return <Modal title={initial ? '编辑口径，保留版本边界。' : '写下可以确认的信息。'} label="SOURCE OF TRUTH" close={cancel}><form onSubmit={async event => {
    event.preventDefault(); setError('')
    if (form.status === '已确认' && !form.source.trim() && !form.confirmation.trim()) return setError('标记已确认前，请填写来源或本人确认说明，不能仅勾选状态。')
    const saved = { ...form, title: form.title.trim(), text: form.text.trim(), version: initial ? initial.version + 1 : 1, updatedAt: nowIso() }
    if (await mutate(workspace => ({ ...workspace, policies: initial ? workspace.policies.map(policy => policy.id === saved.id ? saved : policy) : [saved, ...workspace.policies] }))) { notify(initial ? '已保存新口径版本，旧草稿的引用不会被改写。' : '口径已保存在此设备。'); close() }
  }}><fieldset disabled={busy}>{form.demo && <p className="notice"><Badge kind="pink">虚构演示口径</Badge> 只能匹配演示留言，不可用于真实回复。</p>}<label>口径标题<input required maxLength={100} value={form.title} onChange={event => change({ title: event.target.value })} placeholder="例：某项活动已公开的签到信息" /></label><label>适用事项<input required maxLength={100} value={form.context} onChange={event => change({ context: event.target.value })} placeholder="例：某作品首映 / 某次公开活动" /></label><label>可使用的事实 / 回答<textarea required rows={4} maxLength={10000} value={form.text} onChange={event => change({ text: event.target.value })} placeholder="只写已经可以确认的内容；没有确认的不要编造。" /></label><div className="form-grid"><label>适用主题<select value={form.scope} onChange={event => change({ scope: event.target.value as Topic })}>{topics.map(value => <option key={value}>{value}</option>)}</select></label><label>口径状态<select value={form.status} onChange={event => change({ status: event.target.value as Policy['status'] })}>{policyStates.map(value => <option key={value}>{value}</option>)}</select></label></div><label>匹配关键词（空格分隔）<input maxLength={500} value={form.keywords} onChange={event => change({ keywords: event.target.value })} placeholder="活动 签到 地点" /></label><label>来源链接或资料说明<textarea rows={2} maxLength={2000} value={form.source} onChange={event => change({ source: event.target.value })} placeholder="公开公告链接、文件版本或可核对的资料说明" /></label><label>本人确认说明<textarea rows={2} maxLength={2000} value={form.confirmation} onChange={event => change({ confirmation: event.target.value })} placeholder="谁、依据什么确认；本地备注不构成多人审批。" /></label><label>有效至（可空）<input type="date" value={form.validUntil} onChange={event => change({ validUntil: event.target.value })} /></label><p className="hint">留空表示未设置到期日，不代表事实永久有效。同一事项、同一主题有不同有效口径时，工具会要求先核实。</p>{initial && <p className="notice">本次保存为 v{initial.version + 1}，已引用 v{initial.version} 的草稿会提醒复查，旧引用快照仍保留。</p>}{error && <p className="error-text" role="alert">{error}</p>}<button type="submit" className="button dark-button full">{busy ? '正在保存…' : '保存口径'}<ArrowUpRight size={17} /></button></fieldset></form></Modal>
}

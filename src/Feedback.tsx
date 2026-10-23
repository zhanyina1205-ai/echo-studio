import { useState } from 'react'
import { ArrowDownToLine, ArrowUpRight, Check, FileText } from 'lucide-react'
import { dateKey, displayTime, normalize, nowIso, reportGroups, scopedMessages, sentiments, uid } from './domain'
import { useWorkspace } from './store'
import { Badge, downloadFile, Empty, useDirty } from './ui'

export function Feedback({ onMessage, dirty, onDirty }: { onMessage: (id: string) => void; dirty: boolean; onDirty: (value: boolean) => void }) {
  const { data, busy, mutate, notify } = useWorkspace()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [scope, setScope] = useState('全部')
  const [activeId, setActiveId] = useState('')
  const [note, setNote] = useState('')
  const [baseline, setBaseline] = useState('')
  const [error, setError] = useState('')
  useDirty(note !== baseline, onDirty)
  const active = data.briefs.find(brief => brief.id === activeId)
  const invalidDates = Boolean(from && to && from > to)
  const messages = active ? data.messages.filter(message => active.messageIds.includes(message.id)) : invalidDates ? [] : scopedMessages(data.messages, from, to, scope)
  const groups = reportGroups(messages)
  const unique = new Set(messages.map(message => normalize(message.content))).size
  const safeChange = (action: () => void) => { if (!dirty || window.confirm('简报补充尚未保存，确定放弃？')) { action(); setActiveId(''); setNote(''); setBaseline('') } }
  return <><div className="report-controls panel"><label>导入时间 · 从<input type="date" value={from} onChange={event => safeChange(() => setFrom(event.target.value))} /></label><label>导入时间 · 至<input type="date" value={to} onChange={event => safeChange(() => setTo(event.target.value))} /></label><label>样本范围<select value={scope} onChange={event => safeChange(() => setScope(event.target.value))}>{['全部', '仅我的留言', '仅虚构演示'].map(value => <option key={value}>{value}</option>)}</select></label><button className="button dark-button" disabled={busy || invalidDates || !messages.length} onClick={async () => {
    setError('')
    const brief = { id: uid(), from, to, scope, messageIds: messages.map(message => message.id), note: note || '规则汇总仅反映本次选定的导入样本。请回到原文，人工确认观察与下一步动作。', createdAt: nowIso() }
    if (await mutate(workspace => ({ ...workspace, briefs: [brief, ...workspace.briefs] }))) { setActiveId(brief.id); setNote(brief.note); setBaseline(brief.note); notify('已保存本次简报的样本范围与人工备注。') }
  }}><FileText size={15} />生成并保存简报</button></div>{invalidDates && <p className="error-text">开始日期不能晚于结束日期。</p>}<p className="hint">按导入时间筛选，不推测原始发布时间。规则汇总，不是 AI 分析，也不代表全网民意。已保存简报锁定留言范围，原文与分类仍以当前记录为准。</p>{data.briefs.length > 0 && <label className="saved-brief-select">查看已保存简报<select value={activeId} onChange={event => {
    if (dirty && !window.confirm('有未保存的补充，确定切换简报？')) return
    const brief = data.briefs.find(item => item.id === event.target.value)
    setActiveId(brief?.id || ''); setFrom(brief?.from || ''); setTo(brief?.to || ''); setScope(brief?.scope || '全部'); setNote(brief?.note || ''); setBaseline(brief?.note || '')
  }}><option value="">当前范围预览</option>{data.briefs.map((brief, index) => <option key={brief.id} value={brief.id}>简报 {data.briefs.length - index} / {displayTime(brief.createdAt)} / {brief.scope}</option>)}</select></label>}
    {!messages.length ? <Empty title="这一段时间，还没有声音。" text="换一个导入时间范围，或先录入留言；这里不会填入假数据凑出图表。" /> : <><section className="brief-hero"><div><span className="eyebrow">A SAMPLE, NOT THE WHOLE INTERNET</span><h2>大家说了什么，<br />值得继续做什么。</h2><p>{messages.length} 条原始留言 · {unique} 种去重文本 · {messages.filter(message => message.demo).length} 条虚构演示</p></div><span className="brief-star" aria-hidden="true">✳</span></section><div className="sentiment-strip" aria-label="当前样本情绪分类">{sentiments.map(sentiment => <div key={sentiment}><span>{sentiment}</span><strong>{messages.filter(message => message.sentiment === sentiment).length}</strong></div>)}</div><p className="hint">分类可人工校正；“混合”和“待确认”单独保留，不强行换算为正负面比例。去重文本数不等于独立人数。</p><div className="report-grid">{groups.map((group, index) => <article className="report-card" key={group.topic}><div className="row-between"><span className="eyebrow">0{index + 1} / FEEDBACK</span><Badge>{group.messages.length} 条</Badge></div><h3>{group.topic}</h3><p>{group.topic === '内容需求' ? '这些留言提到了想看到的内容。是否安排选题，由运营结合原文判断。' : group.topic === '运营改进' ? '这些留言涉及素材或运营体验。先核实具体问题，再安排改进。' : group.topic === '活动信息' ? '这些留言涉及活动信息。优先核对公告，不将提问本身当成事实。' : group.topic === '作品反馈' ? '这些留言涉及作品、角色或表演。区分讨论对象，保留不同意见。' : '当前规则无法明确归类的声音，保留原文，等待人工理解。'}</p><details><summary>查看关联原文（{group.messages.length}）</summary>{group.messages.map(message => <button className="report-source" key={message.id} onClick={() => onMessage(message.id)}><span>{message.demo && <Badge kind="pink">演示</Badge>}{message.content}</span><ArrowUpRight size={14} /></button>)}</details></article>)}</div><section className="panel brief-notes"><div className="row-between"><h3>把观察，变成下一步。</h3><Badge kind="pink">人工补充</Badge></div><label>观察、待核实与行动建议<textarea rows={4} maxLength={10000} value={note} onChange={event => setNote(event.target.value)} placeholder="哪些反馈值得继续了解？谁可以跟进？不要仅凭关键词做效果结论。" /></label><div className="button-row"><button className="button dark-button" disabled={busy || !active} onClick={async () => {
    if (!active) return
    if (await mutate(workspace => ({ ...workspace, briefs: workspace.briefs.map(brief => brief.id === active.id ? { ...brief, note } : brief) }))) { setBaseline(note); notify('人工补充已保存。') }
  }}><Check size={16} />保存本份简报补充</button><button className="button outline-button" onClick={() => {
    if (!window.confirm(`将导出当前${messages.length}条样本的原文及简报备注，可能包含私人资料。确认已核对分享范围？`)) return
    const markdown = `# 回声 · 样本反馈简报\n\n导出日期：${dateKey()}\n范围：${scope}；导入日期 ${from || '不限'} 至 ${to || '不限'}\n${messages.length}条留言，${unique}种去重文本，非全网民意。规则分类，不是AI分析。\n\n## 人工备注\n${note || '未填写'}\n\n${groups.map(group => `## ${group.topic}（${group.messages.length}条）\n${group.messages.map(message => `- ${message.demo ? '【虚构演示】' : ''}${message.content}\n  来源：${message.link || '未提供链接'}；平台：${message.platform}`).join('\n')}`).join('\n\n')}`
    downloadFile(`回声_样本简报_${dateKey()}.md`, markdown, 'text/markdown;charset=utf-8'); notify('已发起简报下载，请检查浏览器下载列表。')
  }}><ArrowDownToLine size={16} />导出当前简报</button></div>{!active && <p className="hint">先点击“生成并保存简报”，再保存人工补充；也可直接导出当前范围预览。</p>}</section></>}{error && <p className="error-text">{error}</p>}
  </>
}

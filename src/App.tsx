import { useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpRight, BookOpenCheck, CircleHelp, Inbox as InboxIcon, Layers3, MessageSquareText, Settings2, ShieldCheck, Sparkles, Upload, X } from 'lucide-react'
import { displayTime, type Message } from './domain'
import { useWorkspace } from './store'
import { Inbox } from './Inbox'
import { ReplyDesk } from './ReplyDesk'
import { Events, EventEditor } from './Events'
import { Feedback } from './Feedback'
import { ImportDialog } from './ImportDialog'
import { MessageEditor } from './MessageEditor'
import { Settings } from './Settings'

type Page = 'inbox' | 'reply' | 'events' | 'feedback'
const pages = [
  { id: 'inbox', title: '待处理', english: 'THE INBOX', Icon: InboxIcon, heading: '听见每一句，', accent: '不急着回答。', subtitle: '把分散的原话，变成可以认真处理的沟通。' },
  { id: 'reply', title: '回复台', english: 'THE REPLY DESK', Icon: MessageSquareText, heading: '说得合适，', accent: '也说得有据。', subtitle: '事实先确认，语气再调整。草稿不代替你的判断。' },
  { id: 'events', title: '事件簿', english: 'FOLLOW THROUGH', Icon: Layers3, heading: '不只看见问题，', accent: '也留住后续。', subtitle: '把来源、核实与处理放在同一条线上。' },
  { id: 'feedback', title: '反馈简报', english: 'THE REFLECTION', Icon: BookOpenCheck, heading: '把声音留下，', accent: '把行动带走。', subtitle: '从样本里的原话出发，不替所有人下结论。' },
] as const

export function App() {
  const { data, busy, error, clearError } = useWorkspace()
  const [page, setPage] = useState<Page>('inbox')
  const [messageId, setMessageId] = useState(data.messages[0]?.id || '')
  const [dirty, setDirty] = useState(false)
  const [importing, setImporting] = useState(false)
  const [settings, setSettings] = useState(false)
  const [editor, setEditor] = useState<Message | 'new' | null>(null)
  const [eventIds, setEventIds] = useState<string[] | null>(null)
  const [, setMinute] = useState(0)
  useEffect(() => { const timer = setInterval(() => setMinute(value => value + 1), 60000); return () => clearInterval(timer) }, [])
  const current = pages.find(item => item.id === page)!
  const pending = data.messages.filter(message => message.status !== '已处理').length
  const lastImport = [...data.messages].sort((first, second) => second.importedAt.localeCompare(first.importedAt))[0]?.importedAt
  const mayLeave = () => !dirty || window.confirm('当前有未保存的文字更改，确定放弃并离开？')
  const go = (next: Page, nextMessage?: string) => {
    if (next === page && (!nextMessage || nextMessage === messageId)) return
    if (!mayLeave()) return
    setDirty(false); if (nextMessage) setMessageId(nextMessage); setPage(next); window.scrollTo({ top: 0, behavior: 'instant' }); if (next === 'inbox' && nextMessage) requestAnimationFrame(() => document.querySelector('.message-detail')?.scrollIntoView({ block: 'start', behavior: 'instant' }))
  }
  const selectMessage = (id: string) => { if (id !== messageId && mayLeave()) { setMessageId(id); setDirty(false) } }
  return <div className="app-shell"><a href="#main-content" className="skip-link">跳到主要内容</a><aside className="sidebar"><a className="brand" href="#" onClick={event => { event.preventDefault(); go('inbox') }}><span className="echo-mark" /><div><strong>回声<span>✳</span></strong><small>STUDIO COMMUNICATION DESK</small></div></a><div className="workspace-label"><span className="workspace-avatar">回</span><div><strong>{data.name}</strong><span>单人工作台 · 此设备</span></div></div><span className="sidebar-kicker">YOUR LITTLE WORKSPACE</span><nav aria-label="主要页面">{pages.map(({ id, title, english, Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}><Icon size={19} strokeWidth={1.5} /><span>{title}<small>{english}</small></span>{id === 'inbox' ? <b>{pending}</b> : <ArrowUpRight size={14} />}</button>)}</nav><div className="sidebar-note"><Sparkles size={24} /><p>不用回复所有声音。<br /><strong>认真对待重要的那一句。</strong></p><span>listen first, always.</span></div><div className="sidebar-bottom"><button onClick={() => setSettings(true)}><ArrowDownToLine size={16} />数据与备份<ArrowUpRight size={14} /></button><p><ShieldCheck size={12} />本地保存 · 不默认上传</p><small>本地不等于备份，也不等于加密。</small></div></aside>
    <div className="workspace-main"><header className="topbar"><div className="mobile-brand"><span className="echo-mark" /><strong>回声</strong></div><div className="breadcrumb">工作室沟通台 <span>/</span> {current.title}</div><div className="topbar-actions"><span className="storage-status"><i className={busy ? 'saving' : ''} />{busy ? '正在保存到此设备' : '此设备 · 规则辅助'}</span><button className="icon-button" aria-label="数据备份与隐私说明" onClick={() => setSettings(true)}><Settings2 size={19} /></button><button className="button dark-button top-import" onClick={() => setImporting(true)}><Upload size={15} /><span>导入留言</span></button></div></header>
      <main id="main-content"><div className="page-title"><div><span className="eyebrow">{current.english} / A SMALL TOOL WITH CARE</span><h1>{current.heading}<em>{current.accent}</em></h1><p>{current.subtitle}</p></div><div className="page-date"><span>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span><small>{data.messages.length} 条已导入 · {data.messages.filter(message => message.demo).length} 条演示</small></div></div>
        <div className="mode-notice"><span className="mode-symbol">↳</span><p><strong>规则辅助 · 非 AI · 未接入平台</strong><span>{data.messages.some(message => message.demo) ? '首次提供虚构示例。你的资料与演示均有独立标签，不代表真实演员或工作室。' : '仅处理你主动录入的资料。无实时监测、自动发送或团队审批。'}</span></p><button className="icon-button" aria-label="了解本版能力与数据边界" onClick={() => setSettings(true)}><CircleHelp size={17} /></button></div>
        {error && <div className="global-error" role="alert"><div><strong>这次更改没有保存。</strong><p>{error}</p><span>请保留输入，重试原操作；备份导出只包含此前已成功保存的数据。</span></div><button className="icon-button" aria-label="收起保存错误提示" onClick={clearError}><X size={18} /></button></div>}
        {page === 'inbox' && <Inbox messageId={messageId} selectMessage={selectMessage} edit={setEditor} reply={id => go('reply', id)} createEvent={setEventIds} add={() => setEditor('new')} importMessages={() => setImporting(true)} />}
        {page === 'reply' && <ReplyDesk messageId={messageId} selectMessage={selectMessage} dirty={dirty} onDirty={setDirty} />}
        {page === 'events' && <Events onMessage={id => go('inbox', id)} dirty={dirty} onDirty={setDirty} />}
        {page === 'feedback' && <Feedback onMessage={id => go('inbox', id)} dirty={dirty} onDirty={setDirty} />}
        <footer className="workspace-footer"><span>SMALL SIGNALS. THOUGHTFUL RESPONSES.</span><a className="source-link" href="./proposal/" target="_blank" rel="noopener noreferrer">了解「回声」提案<ArrowUpRight size={12} /></a><p>最近导入 {lastImport ? displayTime(lastImport) : '尚无资料'} · 没有后台采集任务</p></footer>
      </main>
    </div><nav className="mobile-nav" aria-label="手机主导航">{pages.map(({ id, title, Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}><span><Icon size={20} strokeWidth={1.6} /></span><small>{title}</small></button>)}</nav>
    {importing && <ImportDialog close={() => setImporting(false)} />}{settings && <Settings close={() => setSettings(false)} />}{editor && <MessageEditor initial={editor === 'new' ? undefined : editor} close={() => setEditor(null)} />}{eventIds && <EventEditor messageIds={eventIds} close={() => setEventIds(null)} />}
  </div>
}

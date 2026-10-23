import { useRef, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Check, Database, ShieldCheck } from 'lucide-react'
import { exportCSV } from './csv'
import { exportScope, mergeBackup, readBackup } from './backup'
import { dateKey, nowIso, type Workspace } from './domain'
import { useWorkspace } from './store'
import { Badge, downloadFile, Modal, useDirty } from './ui'

export function Settings({ close }: { close: () => void }) {
  const { data, mutate, busy, notify } = useWorkspace()
  const [name, setName] = useState(data.name)
  const [includeDemo, setIncludeDemo] = useState(true)
  const [restored, setRestored] = useState<Workspace | null>(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const dirty = name !== data.name
  useDirty(dirty)
  const selected = exportScope(data, includeDemo)
  const cancel = () => { if (!busy && !reading && (!dirty || window.confirm('工作台名称尚未保存，确定放弃？'))) close() }
  return <Modal title="私人的，留在此设备。" label="LOCAL DATA / CLEAR LIMITS" close={cancel}><div className="privacy-card"><ShieldCheck size={25} /><div><strong>没有连接你的社交账号。</strong><p>没有实时监测、AI 服务、自动发送或统计追踪。留言只在当前浏览器本地处理；跟进人与确认状态只是本机记录。</p></div></div><label>工作台名称<input maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label><button className="button outline-button" disabled={busy || !name.trim() || !dirty} onClick={async () => { if (await mutate(workspace => ({ ...workspace, name: name.trim() }))) { setName(name.trim()); notify('工作台名称已保存。演示记录仍保留各自标签。') } }}><Check size={15} />保存名称</button><div className="divider-heading"><h3>备份，由你掌握。</h3><Database size={18} /></div><p className="hint">本地保存不是云备份，也不是加密。清理网站数据、更换网址、浏览器或设备，可能无法找回。不要多标签同时编辑。</p><label className="check-label"><input type="checkbox" checked={includeDemo} onChange={event => setIncludeDemo(event.target.checked)} />导出包含“虚构演示”记录</label><p className="export-summary">本次范围：{selected.messages.length} 条留言 · {selected.policies.length} 条口径 · {selected.drafts.length} 份草稿 · {selected.events.length} 个事件 · {selected.briefs.length} 份简报。</p><p className="hint">排除演示仅按记录标签筛选；人工复制进正文的内容请另行核对。备份文件不加密，请妥善保存。</p><div className="button-row"><button className="button dark-button" onClick={() => {
    downloadFile(`回声_工作台备份_${dateKey()}.json`, JSON.stringify({ format: 'echo-studio-backup', version: 1, exportedAt: nowIso(), workspace: selected }), 'application/json;charset=utf-8'); notify('已发起备份下载，请核对文件。未创建云端备份。')
  }}><ArrowDownToLine size={16} />导出 JSON 备份</button><button className="button outline-button" onClick={() => { downloadFile(`回声_留言_${dateKey()}.csv`, exportCSV(selected.messages), 'text/csv;charset=utf-8'); notify('已发起留言 CSV 下载，包含以上选定范围。') }}><ArrowDownToLine size={16} />导出留言 CSV</button></div><div className="divider-heading"><h3>导入备份，不覆盖已有记录。</h3></div><p className="hint">JSON 合并导入：同 ID 保留当前记录，只加入新 ID。名称不覆盖。恢复旧版本覆盖现有记录不在本版范围内。</p><input type="file" accept=".json,application/json" ref={input} className="visually-hidden" aria-label="选择回声JSON备份" onChange={async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    setReading(true); setError(''); setRestored(null)
    try { if (file.size > 5 * 1024 * 1024) throw new Error('备份超过5MB，本版不支持导入此大小。'); setRestored(readBackup(JSON.parse(await file.text()))) }
    catch (failure) { setError(failure instanceof Error ? failure.message : '备份无法读取，原数据未改变。') }
    finally { setReading(false) }
  }} /><button className="button outline-button" disabled={reading || busy} onClick={() => input.current?.click()}><ArrowUpFromLine size={16} />{reading ? '正在本地读取…' : '选择 JSON 备份，先预览'}</button>{restored && <div className="restore-preview"><Badge kind="sage">结构校验通过，尚未写入</Badge><h3>{restored.name}</h3><p>备份包含 {restored.messages.length} 条留言、{restored.policies.length} 条口径、{restored.drafts.length} 份草稿。</p><p className="hint">预计新增 {restored.messages.filter(message => !data.messages.some(item => item.id === message.id)).length} 条留言，同 ID 项保留此设备当前版本。关联关系会一并检查，失败不会部分导入。</p><button className="button dark-button" disabled={busy} onClick={async () => {
    if (await mutate(workspace => mergeBackup(workspace, restored))) { setRestored(null); notify('备份已合并导入，同 ID 的当前记录没有被覆盖。') }
  }}>确认合并导入</button></div>}{error && <p className="error-text" role="alert">{error}</p>}<p className="privacy-last">这不是团队权限系统。公开的是程序，不是你的本地记录；本地保存也不等于加密。所有演示资料均为虚构，不代表任何演员或工作室背书。</p></Modal>
}

import { useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowUpRight, FileSpreadsheet, Upload } from 'lucide-react'
import { guessMapping, parseCSV, previewImport, type Mapping } from './csv'
import { makeMessage, normalize } from './domain'
import { useWorkspace } from './store'
import { Badge, downloadFile, Modal, useDirty } from './ui'

export function ImportDialog({ close }: { close: () => void }) {
  const { data, mutate, busy, notify } = useWorkspace()
  const [mode, setMode] = useState<'paste' | 'csv'>('paste')
  const [text, setText] = useState('')
  const [platform, setPlatform] = useState('手动粘贴')
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping>({ content: -1, platform: -1, link: -1, publishedAt: -1 })
  const [duplicates, setDuplicates] = useState<'skip' | 'keep'>('skip')
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const pasteRows = useMemo(() => [['留言', '平台'], ...text.split(/\r?\n/).filter(line => line.trim()).map(line => [line.trim(), platform])], [text, platform])
  const preview = useMemo(() => previewImport(mode === 'paste' ? pasteRows : rows, mode === 'paste' ? { content: 0, platform: 1, link: -1, publishedAt: -1 } : mapping, data.messages), [mode, pasteRows, rows, mapping, data.messages])
  const accepted = preview.filter(row => row.message && (duplicates === 'keep' || !row.duplicate))
  const invalid = preview.filter(row => row.errors.length)
  const duplicateCount = preview.filter(row => row.duplicate && !row.errors.length).length
  const dirty = Boolean(text.trim() || rows.length)
  useDirty(dirty)
  const cancel = () => { if (!busy && !reading && (!dirty || window.confirm('尚未导入的内容会被放弃，确定关闭？'))) close() }
  return <Modal title="把分散的留言，带到这里。" label="IMPORT / NO UPLOAD" close={cancel} wide><div className="segmented"><button aria-pressed={mode === 'paste'} onClick={() => setMode('paste')}>批量粘贴</button><button aria-pressed={mode === 'csv'} onClick={() => setMode('csv')}>CSV 文件</button></div><p className="hint">文件只在此浏览器解析，不上传。这里导入的是你的资料，不会被标成虚构演示。</p>{mode === 'paste' ? <><label>来源平台<input value={platform} maxLength={100} onChange={event => setPlatform(event.target.value)} /></label><label>每行一条留言<textarea rows={6} maxLength={300000} value={text} onChange={event => { setText(event.target.value); setError('') }} placeholder={'例：活动的签到时间在哪里看？\n例：希望多分享角色准备的花絮。'} /></label><p className="hint">每行作为一条；需要保留多行原文，请使用 CSV 或逐条录入。单次最多5000条。</p></> : <><input ref={input} type="file" className="visually-hidden" accept=".csv,text/csv" aria-label="选择留言CSV文件" onChange={async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    setError(''); setReading(true)
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('CSV 文件超过5MB，请分批导入。')
      const parsed = parseCSV(await file.text())
      if (parsed.length < 2) throw new Error('文件需要表头和至少一条留言。')
      setRows(parsed); setMapping(guessMapping(parsed[0]))
    } catch (failure) { setRows([]); setError(failure instanceof Error ? failure.message : '无法读取文件。') }
    finally { setReading(false) }
  }} /><button className="file-drop" onClick={() => input.current?.click()} disabled={reading}><FileSpreadsheet size={29} /><strong>{reading ? '正在读取…' : rows.length ? `已读取 ${rows.length - 1} 行，点击更换` : '选择 UTF-8 CSV 文件'}</strong><span>支持引号、逗号及引号内换行 · 最大5MB</span></button><button className="text-button" onClick={() => downloadFile('回声_留言导入模板.csv', '\uFEFF留言,平台,原文链接,发布时间\r\n"这是一条虚构的格式示例，请替换。",手动导入,,\r\n', 'text/csv;charset=utf-8')}><ArrowDownToLine size={14} />下载 CSV 格式模板</button>{rows.length > 0 && <div className="form-grid">{([['content', '留言原文（必选）'], ['platform', '来源平台'], ['link', '原文链接'], ['publishedAt', '发布时间']] as const).map(([key, label]) => <label key={key}>{label}<select value={mapping[key]} onChange={event => setMapping(value => ({ ...value, [key]: Number(event.target.value) }))}><option value={-1}>不导入此字段</option>{rows[0].map((header, index) => <option key={index} value={index}>{index + 1} / {header || '未命名列'}</option>)}</select></label>)}</div>}</>}
    <label>完全相同的文本与平台<select value={duplicates} onChange={event => setDuplicates(event.target.value as 'skip' | 'keep')}><option value="skip">跳过重复，保留已有留言</option><option value="keep">仍作为新留言导入，不覆盖原文</option></select></label>
    {preview.length > 0 && <div className="import-preview"><div className="row-between"><h3>先看一眼，再确认。</h3><Badge>{accepted.length} 条可导入</Badge></div><p className="hint">{duplicateCount} 条重复 · {invalid.length} 行无效；无效行不会导入。重复只比较文本与平台，不推断用户身份。</p>{preview.slice(0, 8).map(row => <div key={row.row} className="preview-line"><span>{row.row - 1}</span><div><p>{row.message?.content || '此行无有效内容'}</p><small>{row.errors.join('；') || (row.duplicate ? duplicates === 'skip' ? '重复，将跳过' : '重复，将保留为新留言' : '可导入')}</small></div></div>)}{preview.length > 8 && <p className="hint">预览前8行，共{preview.length}行。</p>}{invalid.length > 0 && <details><summary>查看全部错误行（{invalid.length}）</summary>{invalid.map(row => <p className="small" key={row.row}>CSV第{row.row}行：{row.errors.join('；')}</p>)}</details>}</div>}
    {error && <p className="error-text" role="alert">{error}</p>}<button className="button dark-button full" disabled={busy || reading || !accepted.length || preview.length > 5000} onClick={async () => {
      setError('')
      try {
        const content = accepted.map(row => row.message!).map(message => mode === 'paste' ? makeMessage(message.content, { platform, origin: '批量粘贴' }) : message)
        if (content.length + data.messages.length > 5000) throw new Error('工作台最多保留5000条留言，请先备份并整理。')
        const keys = new Set(data.messages.map(message => `${message.platform}\0${normalize(message.content)}`))
        const fresh = duplicates === 'keep' ? content : content.filter(message => { const key = `${message.platform}\0${normalize(message.content)}`; if (keys.has(key)) return false; keys.add(key); return true })
        if (await mutate(workspace => ({ ...workspace, messages: [...fresh, ...workspace.messages] }))) { notify(`已导入${fresh.length}条，规则建议可逐条校正。`); close() }
      } catch (failure) { setError(failure instanceof Error ? failure.message : '导入失败，原数据未改变。') }
    }}><Upload size={16} />{busy ? '正在保存…' : `确认导入 ${accepted.length} 条`}<ArrowUpRight size={16} /></button>
  </Modal>
}

import { makeMessage, normalize, safeUrl, type Message } from './domain'

export function parseCSV(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let closed = false
  for (let index = 0; index < input.length; index++) {
    const character = input[index]
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { field += '"'; index++ }
      else if (character === '"') { quoted = false; closed = true }
      else field += character
    } else if (character === '"') {
      if (field || closed) throw new Error('CSV 引号位置不正确，请使用标准逗号分隔 CSV。')
      quoted = true
    } else if (character === ',') { row.push(field); field = ''; closed = false }
    else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index++
      row.push(field); if (row.some(value => value.trim())) rows.push(row)
      row = []; field = ''; closed = false
    } else {
      if (closed && character.trim()) throw new Error('CSV 引号后出现多余字符。')
      if (!closed) field += character
    }
  }
  if (quoted) throw new Error('CSV 存在未闭合引号。')
  row.push(field); if (row.some(value => value.trim())) rows.push(row)
  if (rows.length > 5001) throw new Error('单次最多导入5000行留言，请分批导入。')
  return rows
}
export type Mapping = { content: number; platform: number; link: number; publishedAt: number }
export function guessMapping(headers: string[]): Mapping {
  const find = (pattern: RegExp) => headers.findIndex(header => pattern.test(header.trim()))
  return { content: find(/^(留言|内容|留言原文|content|text)$/i), platform: find(/^(平台|来源平台|platform)$/i), link: find(/^(链接|原文链接|link|url)$/i), publishedAt: find(/^(时间|发布时间|publishedAt|date)$/i) }
}
export type ImportRow = { row: number; message?: Message; errors: string[]; duplicate: boolean }
export function previewImport(rows: string[][], mapping: Mapping, existing: Message[]): ImportRow[] {
  if (rows.length < 2) return []
  const seen = new Set(existing.map(message => `${message.platform}\0${normalize(message.content)}`))
  return rows.slice(1).map((cells, index) => {
    const read = (column: number) => column >= 0 ? (cells[column] || '').trim() : ''
    const content = read(mapping.content)
    const platform = read(mapping.platform) || 'CSV 导入'
    const link = read(mapping.link)
    const published = read(mapping.publishedAt)
    const errors: string[] = []
    if (cells.length !== rows[0].length) errors.push('列数与表头不一致')
    if (!content) errors.push('留言内容为空或尚未映射')
    if (content.length > 20000) errors.push('留言超过20000字')
    if (link && !safeUrl(link)) errors.push('链接必须是有效的 HTTP / HTTPS 地址')
    if (published && Number.isNaN(Date.parse(published))) errors.push('发布时间无效，建议使用 ISO 日期格式')
    if (platform.length > 100) errors.push('平台名称过长')
    const key = `${platform}\0${normalize(content)}`
    const duplicate = seen.has(key)
    if (!errors.length) seen.add(key)
    return { row: index + 2, errors, duplicate, message: errors.length ? undefined : makeMessage(content, { platform, link, publishedAt: published ? new Date(published).toISOString() : '', origin: 'CSV 导入' }) }
  })
}
export function csvCell(value: string) {
  const safe = /^[\s\uFEFF]*[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}
export function exportCSV(messages: Message[]) {
  return '\uFEFF' + [['留言', '平台', '原文链接', '发布时间', '导入时间', '对象', '诉求', '情绪', '主题', '状态', '数据类型'], ...messages.map(message => [message.content, message.platform, message.link, message.publishedAt, message.importedAt, message.target, message.intent, message.sentiment, message.topic, message.status, message.demo ? '虚构演示' : '本人导入'])].map(row => row.map(csvCell).join(',')).join('\r\n')
}

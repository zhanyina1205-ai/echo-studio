import { describe, expect, it } from 'vitest'
import { csvCell, exportCSV, guessMapping, parseCSV, previewImport } from '../src/csv'
import { makeMessage } from '../src/domain'

describe('CSV 本地导入导出', () => {
  it('解析 BOM、引号内逗号、双引号转义、多行原文和CRLF', () => {
    expect(parseCSV('\uFEFF留言,平台\r\n"第一行,\n第二行""引号""",微博\r\n')).toEqual([['留言', '平台'], ['第一行,\n第二行"引号"', '微博']])
  })
  it('不默默接受未闭合或非法引号', () => {
    expect(() => parseCSV('留言\n"未闭合')).toThrow(/未闭合/)
    expect(() => parseCSV('留言\n"内容"多余')).toThrow(/多余/)
  })
  it('中文与英文表头均可自动建议映射', () => {
    expect(guessMapping(['内容', '平台', '原文链接', '发布时间'])).toEqual({ content: 0, platform: 1, link: 2, publishedAt: 3 })
    expect(guessMapping(['text', 'platform', 'url', 'date'])).toEqual({ content: 0, platform: 1, link: 2, publishedAt: 3 })
  })
  it('不丢弃错误行，列数、日期、链接和空内容都有原因', () => {
    const rows = [['留言', '链接', '时间'], ['', '', ''], ['内容', 'javascript:alert(1)', '坏日期'], ['少一列', '']]
    const preview = previewImport(rows, { content: 0, link: 1, publishedAt: 2, platform: -1 }, [])
    expect(preview).toHaveLength(3)
    expect(preview.every(row => row.errors.length > 0)).toBe(true)
    expect(preview[1].errors.join()).toMatch(/链接/)
    expect(preview[1].message).toBeUndefined()
  })
  it('识别已有及批次内的重复，但原始内容不被改写', () => {
    const rows = [['留言', '平台'], [' 你好！', '微博'], ['你好', '微博'], ['你好', '其他平台'], ['你好！', '微博']]
    const mapping = { content: 0, platform: 1, link: -1, publishedAt: -1 }
    const preview = previewImport(rows, mapping, [makeMessage('你好', { platform: '微博' })])
    expect(preview.map(row => row.duplicate)).toEqual([false, true, false, true])
    expect(preview[0].message?.content).toBe('你好！')
  })
  it('导出危险公式前缀做文本转义，保留引号与换行', () => {
    for (const value of ['=1+1', '+CMD', '-1', '@SUM(A1)', '  =HYPERLINK("url")', '\t=1']) expect(csvCell(value)).toContain("'")
    expect(csvCell('普通"文字')).toBe('"普通""文字"')
    const message = makeMessage('第一行\n第二行', { platform: 'CSV', publishedAt: '' })
    const decoded = parseCSV(exportCSV([message]))
    expect(decoded[1][0]).toBe(message.content)
  })
  it('超过5000行明确拒绝，而非悄悄截断', () => {
    expect(() => parseCSV('留言\n' + '一条\n'.repeat(5001))).toThrow(/5000/)
  })
})

import { describe, expect, it } from 'vitest'
import { classify, draftProblems, generateDraft, isCalendarDate, makeMessage, matchingPolicies, normalize, policyConflict, policyProblem, removeMessage, safeUrl, scopedMessages, validateWorkspace } from '../src/domain'
import { demoWorkspace, emptyWorkspace } from '../src/seed'
import { exportScope, mergeBackup, readBackup } from '../src/backup'

const at = new Date('2026-10-23T12:00:00')
const fixture = () => {
  const workspace = demoWorkspace()
  return { workspace, message: workspace.messages[0], policy: workspace.policies[0] }
}

describe('规则分类保持边界', () => {
  it('对角色的负面情绪不等于对表演的负面评价', () => {
    expect(classify('这个反派让我恨得牙痒痒，演得真好！')).toMatchObject({ target: '演员', sentiment: '正向', topic: '作品反馈' })
  })
  it('支持与改进需求同时出现时保留混合', () => {
    expect(classify('这场戏很有感染力，但字幕实在太小，看不清')).toMatchObject({ sentiment: '混合', topic: '运营改进', intent: '建议' })
  })
  it('内容需求不被当作身份标签', () => {
    const result = classify('别再发旧图了，想看幕后花絮。')
    expect(result).toMatchObject({ topic: '内容需求', intent: '建议', sentiment: '负向', priority: false })
    expect(result.ruleReason).not.toMatch(/黑粉|水军/)
  })
  it('语境不明不猜反讽，信息分歧优先核实', () => {
    expect(classify('这次真行。').sentiment).toBe('待确认')
    expect(classify('有人说七点，有人说八点，到底几点？')).toMatchObject({ priority: true, intent: '信息争议' })
    expect(classify('有人传播未公开住址，能处理吗？').priority).toBe(true)
  })
})

describe('口径与草稿', () => {
  it('待确认、缺少依据、停用和过期口径不可用', () => {
    const { policy } = fixture()
    expect(policyProblem({ ...policy, status: '待确认' }, at)).toBeTruthy()
    expect(policyProblem({ ...policy, source: '', confirmation: '' }, at)).toMatch(/缺少/)
    expect(policyProblem({ ...policy, status: '已停用' }, at)).toMatch(/停用/)
    expect(policyProblem({ ...policy, validUntil: '2026-10-22' }, at)).toMatch(/过期/)
    expect(policyProblem({ ...policy, validUntil: '2026-10-23' }, at)).toBe('')
  })
  it('演示口径不能匹配或用于真实留言', () => {
    const { policy, workspace } = fixture()
    const real = makeMessage('活动什么时候签到？')
    expect(matchingPolicies(real, workspace.policies)).toEqual([])
    expect(() => generateDraft(real, '温和回应', policy, workspace.policies, at)).toThrow(/演示口径/)
  })
  it('只有已确认内容进入模板，不创造新的事实', () => {
    const { policy, message, workspace } = fixture()
    const draft = generateDraft(message, '温和回应', policy, workspace.policies, at)
    expect(draft.text).toBe(`谢谢你的关注与留言。${policy.text}`)
    expect(draft.state).toBe('草稿')
    expect(draft.publishedAt).toBe('')
    expect(draft.copiedAt).toBe('')
    expect(draft.refs[0]).toMatchObject({ version: 1, context: '示例活动' })
  })
  it('无口径只有保守占位回复，未确认口径不能生成事实回复', () => {
    const { message, workspace, policy } = fixture()
    expect(generateDraft(message, '简洁说明', undefined, workspace.policies, at).text).not.toMatch(/18:30|艺术中心/)
    expect(() => generateDraft(message, '简洁说明', { ...policy, status: '待确认' }, workspace.policies, at)).toThrow(/尚未确认/)
  })
  it('同事项不同有效口径阻止自动选边，不同事项不互相阻塞', () => {
    const { policy, workspace, message } = fixture()
    const conflict = { ...policy, id: 'conflicting', text: '另一个不同的事实。' }
    expect(policyConflict(policy, [...workspace.policies, conflict], at)).toBe(true)
    expect(() => generateDraft(message, '正式说明', policy, [policy, conflict], at)).toThrow(/不同口径/)
    expect(policyConflict(policy, [policy, { ...conflict, context: '另一个活动' }], at)).toBe(false)
  })
  it('引用保存快照，更新版本不改写原稿且触发复查', () => {
    const { policy, workspace, message } = fixture()
    const draft = generateDraft(message, '温和回应', policy, workspace.policies, at)
    const changed = { ...policy, text: '新的已确认内容。', version: 2 }
    expect(draft.refs[0].text).toBe(policy.text)
    expect(draftProblems(draft, [changed], at).join()).toMatch(/v1.*v2/)
    expect(draft.text).toContain(policy.text)
    expect(draftProblems(draft, [], at).join()).toMatch(/已删除/)
  })
  it('确认后口径过期仍提示复查，不因已确认而绕过', () => {
    const { policy, message } = fixture()
    const dated = { ...policy, validUntil: '2026-10-23' }
    const draft = { ...generateDraft(message, '简洁说明', dated, [dated], at), state: '本人确认' as const }
    expect(draftProblems(draft, [dated], new Date('2026-10-24T12:00:00')).join()).toMatch(/过期/)
  })
})

describe('资料、备份与范围', () => {
  it('演示结构有效且所有留言有演示标签', () => {
    const workspace = demoWorkspace()
    expect(validateWorkspace(workspace)).toEqual(workspace)
    expect(workspace.messages.every(message => message.demo)).toBe(true)
    expect(workspace.policies.every(policy => policy.demo)).toBe(true)
  })
  it('只允许无凭据的 HTTP/HTTPS 外部链接', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('')
    expect(safeUrl('https://name:secret@example.com/')).toBe('')
    expect(safeUrl('https://example.com/path')).toBe('https://example.com/path')
  })
  it('拒绝无效备份、重复ID、断开的留言引用和非法状态', () => {
    expect(() => readBackup({ workspace: demoWorkspace() })).toThrow()
    const duplicate = demoWorkspace(); duplicate.messages.push(duplicate.messages[0])
    expect(() => validateWorkspace(duplicate)).toThrow()
    const broken = demoWorkspace(); broken.events[0].messageIds = ['missing']
    expect(() => validateWorkspace(broken)).toThrow()
    const malformed = demoWorkspace() as unknown as { messages: { status: string }[] }; malformed.messages[0].status = '自动发布成功'
    expect(() => validateWorkspace(malformed)).toThrow()
  })
  it('合并导入保留当前同ID数据，不改工作台名称', () => {
    const current = demoWorkspace()
    const incoming = structuredClone(current)
    incoming.name = '不应覆盖此名称'
    incoming.messages[0].content = '不应覆盖原文'
    incoming.messages.push(makeMessage('新增一条自己的留言'))
    const merged = mergeBackup(current, incoming)
    expect(merged.name).toBe(current.name)
    expect(merged.messages[0].content).toBe(current.messages[0].content)
    expect(merged.messages).toHaveLength(current.messages.length + 1)
  })
  it('JSON 导出可校验并恢复到空白工作台', () => {
    const { workspace, message, policy } = fixture()
    workspace.drafts.push(generateDraft(message, '温和回应', policy, workspace.policies, at))
    const serialized = JSON.stringify({ format: 'echo-studio-backup', version: 1, workspace })
    const restored = mergeBackup(emptyWorkspace(), readBackup(JSON.parse(serialized)))
    expect(restored.messages).toEqual(workspace.messages)
    expect(restored.drafts).toEqual(workspace.drafts)
    expect(restored.events).toEqual(workspace.events)
  })
  it('排除演示导出保留实际资料且不会留下无效关联', () => {
    const workspace = demoWorkspace()
    workspace.messages.push(makeMessage('我的新留言'))
    const filtered = exportScope(workspace, false)
    expect(filtered.messages).toHaveLength(1)
    expect(filtered.policies).toHaveLength(0)
    expect(filtered.events).toHaveLength(0)
    expect(validateWorkspace(filtered)).toEqual(filtered)
  })
  it('删除留言解除事件与简报关联，同时删除其草稿', () => {
    const { workspace, message, policy } = fixture()
    workspace.drafts.push(generateDraft(message, '简洁说明', policy, workspace.policies, at))
    workspace.briefs.push({ id: 'brief', from: '', to: '', scope: '全部', note: '', createdAt: at.toISOString(), messageIds: [message.id] })
    const removed = removeMessage(workspace, message.id)
    expect(removed.drafts).toHaveLength(0)
    expect(removed.events[0].messageIds).not.toContain(message.id)
    expect(removed.briefs[0].messageIds).toHaveLength(0)
    expect(workspace.messages).toHaveLength(10)
    expect(validateWorkspace(removed)).toEqual(removed)
  })
  it('按导入时间和资料类型筛选，不把演示混为实际样本', () => {
    const messages = [makeMessage('自己的', { importedAt: '2026-10-23T12:00:00' }), makeMessage('示例', { demo: true, importedAt: '2026-10-23T12:00:00' })]
    expect(scopedMessages(messages, '2026-10-23', '2026-10-23', '仅我的留言').map(message => message.content)).toEqual(['自己的'])
    expect(scopedMessages(messages, '', '2026-10-22', '全部')).toHaveLength(0)
    expect(normalize(' 想看   花絮 ')).toBe('想看 花絮')
    expect(normalize('想看🙂')).not.toBe(normalize('想看🙃'))
    expect(isCalendarDate('2026-02-30')).toBe(false)
  })
  it('容量限制使本版导出文件仍可在5MB导入上限内恢复', () => {
    const workspace = emptyWorkspace()
    workspace.messages = Array.from({ length: 100 }, () => makeMessage('字'.repeat(18000)))
    expect(() => validateWorkspace(workspace)).toThrow(/4MB/)
  })
})

export const targets = ['演员', '角色', '作品', '工作室运营', '活动', '其他'] as const
export const intents = ['提问', '支持', '建议', '投诉', '信息争议', '其他'] as const
export const sentiments = ['正向', '负向', '混合', '中性', '待确认'] as const
export const statuses = ['未处理', '待核实', '准备回复', '持续观察', '已处理'] as const
export const topics = ['作品反馈', '内容需求', '活动信息', '运营改进', '其他'] as const
export const policyStates = ['待确认', '已确认', '已停用'] as const
export const draftStates = ['草稿', '待确认', '需修改', '本人确认'] as const
export const eventStates = ['待核实', '处理中', '持续观察', '已结束'] as const
export const tones = ['简洁说明', '温和回应', '正式说明'] as const
export type Target = typeof targets[number]
export type Intent = typeof intents[number]
export type Sentiment = typeof sentiments[number]
export type Status = typeof statuses[number]
export type Topic = typeof topics[number]
export type Classification = { target: Target; intent: Intent; sentiment: Sentiment; topic: Topic; priority: boolean; ruleReason: string }
export type Message = Classification & { id: string; content: string; platform: string; link: string; publishedAt: string; importedAt: string; origin: string; status: Status; manual: boolean; demo: boolean }
export type Policy = { id: string; title: string; text: string; context: string; scope: Topic; keywords: string; source: string; confirmation: string; status: typeof policyStates[number]; validUntil: string; version: number; updatedAt: string; demo: boolean }
export type PolicyRef = Pick<Policy, 'id' | 'title' | 'text' | 'source' | 'confirmation' | 'version' | 'validUntil' | 'context'>
export type Draft = { id: string; messageId: string; text: string; tone: typeof tones[number]; refs: PolicyRef[]; state: typeof draftStates[number]; createdAt: string; updatedAt: string; confirmedAt: string; copiedAt: string; publishedAt: string; publishedUrl: string }
export type EventLog = { id: string; text: string; at: string }
export type StudioEvent = { id: string; title: string; summary: string; known: string; pending: string; owner: string; nextCheck: string; status: typeof eventStates[number]; messageIds: string[]; logs: EventLog[]; createdAt: string; updatedAt: string; demo: boolean }
export type Brief = { id: string; from: string; to: string; scope: string; messageIds: string[]; note: string; createdAt: string }
export type Workspace = { schema: 1; revision: number; name: string; messages: Message[]; policies: Policy[]; drafts: Draft[]; events: StudioEvent[]; briefs: Brief[] }
export const uid = () => crypto.randomUUID()
export const nowIso = () => new Date().toISOString()
export const dateKey = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
export const normalize = (text: string) => text.trim().replace(/\s+/gu, ' ')
export const displayTime = (value: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '未提供'
export function safeUrl(value: string) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '' } catch { return '' }
}
export function classify(content: string): Classification {
  let target: Target = '其他'
  let intent: Intent = '其他'
  let topic: Topic = '其他'
  const reasons: string[] = []
  if (/演技|演得|表演|演员/.test(content)) { target = '演员'; topic = '作品反馈' }
  else if (/角色|反派|人设/.test(content)) { target = '角色'; topic = '作品反馈' }
  else if (/剧|作品|这场戏|台词/.test(content)) { target = '作品'; topic = '作品反馈' }
  if (/花絮|旧图|新图|幕后|想看/.test(content)) { target = '工作室运营'; topic = '内容需求'; intent = '建议'; reasons.push('出现内容需求词') }
  if (/字幕|剪辑|配乐|封面|排版/.test(content)) { target = '工作室运营'; topic = '运营改进'; intent = '建议'; reasons.push('出现素材制作词') }
  if (/活动|签到|入场|地点|几点/.test(content)) { target = '活动'; topic = '活动信息' }
  if (/[?？]|怎么|哪里|几点|到底|是否/.test(content)) { intent = '提问'; reasons.push('出现提问表达') }
  const disputed = /不一致|说法不同|有人说|造谣|真假|是真的吗|未公开|住址|威胁|隐私/.test(content)
  if (disputed) { intent = '信息争议'; reasons.push('存在信息分歧或隐私安全信号，需人工核实') }
  const positive = /喜欢|支持|期待|演得真好|演得好|精彩|感染力|谢谢|好看|太棒/.test(content)
  const negative = /太小|看不清|别再|失望|难看|出戏|差劲|不满|太差/.test(content)
  let sentiment: Sentiment = positive && negative ? '混合' : positive ? '正向' : negative ? '负向' : intent === '提问' || disputed ? '中性' : '待确认'
  if (/恨|讨厌|气死/.test(content) && /演得真好|演得好/.test(content)) { sentiment = negative ? '混合' : '正向'; reasons.push('区分对角色的情绪与对表演的称赞') }
  if (positive && intent === '其他') intent = '支持'
  if (negative && intent === '其他') intent = '投诉'
  reasons.push(sentiment === '待确认' ? '语境不足，保留待确认，不猜测反讽' : `依据关键词建议为${sentiment}，不是模型判断`)
  return { target, intent, sentiment, topic, priority: disputed, ruleReason: reasons.join('；') }
}
export function makeMessage(content: string, values: Partial<Message> = {}): Message {
  return { id: uid(), content, platform: '手动录入', link: '', publishedAt: '', importedAt: nowIso(), origin: '手动录入', status: '未处理', manual: false, demo: false, ...classify(content), ...values }
}
export function policyProblem(policy: Policy, at = new Date()): string {
  if (policy.status !== '已确认') return policy.status === '已停用' ? '口径已停用' : '口径尚未确认'
  if (!policy.source.trim() && !policy.confirmation.trim()) return '缺少来源或本人确认说明'
  if (policy.validUntil && policy.validUntil < dateKey(at)) return '口径已过期'
  return ''
}
export function matchingPolicies(message: Message, policies: Policy[]) {
  return policies.filter(policy => policy.demo === message.demo && (policy.scope === message.topic || policy.keywords.split(/[,，\s]+/).filter(Boolean).some(keyword => message.content.includes(keyword))))
}
export function policyConflict(policy: Policy, policies: Policy[], at = new Date()) {
  return policies.some(other => other.id !== policy.id && other.demo === policy.demo && other.scope === policy.scope && normalize(other.context) === normalize(policy.context) && !policyProblem(other, at) && other.text.trim() !== policy.text.trim())
}
export function generateDraft(message: Message, tone: Draft['tone'], policy: Policy | undefined, policies: Policy[], at = new Date()): Draft {
  if (policy) {
    const issue = policyProblem(policy, at)
    if (issue) throw new Error(`${issue}，请先核实口径。`)
    if (policy.demo !== message.demo) throw new Error('演示口径不能用于真实留言；请新建自己的已确认口径。')
    if (policyConflict(policy, policies, at)) throw new Error('同一适用事项存在不同口径，请先统一或停用旧口径，不能自动判断哪条正确。')
  }
  const prefix = tone === '温和回应' ? '谢谢你的关注与留言。' : tone === '正式说明' ? '感谢关注。关于这条留言，' : '你好，'
  const body = policy ? policy.text : message.intent === '支持' ? '谢谢你的支持，这条反馈已记录。' : '这条反馈已记录；涉及的具体信息尚待核实，目前不作进一步承诺。'
  const time = at.toISOString()
  return { id: uid(), messageId: message.id, text: `${prefix}${body}`, tone, refs: policy ? [{ id: policy.id, version: policy.version, context: policy.context, title: policy.title, text: policy.text, source: policy.source, confirmation: policy.confirmation, validUntil: policy.validUntil }] : [], state: '草稿', createdAt: time, updatedAt: time, confirmedAt: '', copiedAt: '', publishedAt: '', publishedUrl: '' }
}
export function draftProblems(draft: Draft, policies: Policy[], at = new Date()): string[] {
  return draft.refs.flatMap(reference => {
    const policy = policies.find(item => item.id === reference.id)
    if (!policy) return [`「${reference.title}」原口径已删除`]
    const reasons = [policyProblem(policy, at)]
    if (policy.version !== reference.version) reasons.push(`口径已从 v${reference.version} 更新到 v${policy.version}`)
    if (policyConflict(policy, policies, at)) reasons.push('同主题存在不同口径，需核实')
    return reasons.filter(Boolean).map(reason => `「${reference.title}」${reason}`)
  })
}
export function removeMessage(workspace: Workspace, id: string): Workspace {
  return { ...workspace, messages: workspace.messages.filter(message => message.id !== id), drafts: workspace.drafts.filter(draft => draft.messageId !== id), events: workspace.events.map(event => ({ ...event, messageIds: event.messageIds.filter(messageId => messageId !== id) })), briefs: workspace.briefs.map(brief => ({ ...brief, messageIds: brief.messageIds.filter(messageId => messageId !== id) })) }
}
export function scopedMessages(messages: Message[], from: string, to: string, scope: string) {
  return messages.filter(message => (!from || dateKey(new Date(message.importedAt)) >= from) && (!to || dateKey(new Date(message.importedAt)) <= to) && (scope === '全部' || (scope === '仅我的留言' ? !message.demo : message.demo)))
}
export function reportGroups(messages: Message[]) {
  return topics.map(topic => ({ topic, messages: messages.filter(message => message.topic === topic) })).filter(group => group.messages.length > 0).sort((first, second) => second.messages.length - first.messages.length)
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown, max = 20000): value is string => typeof value === 'string' && value.length <= max
export const isCalendarDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
const isTime = (value: unknown, optional = false) => isText(value, 64) && ((optional && value === '') || (/^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value))))
const hasTexts = (value: Record<string, unknown>, keys: string[]) => keys.every(key => isText(value[key]))
const member = (values: readonly string[], value: unknown) => typeof value === 'string' && values.includes(value)
const isIds = (value: unknown): value is string[] => Array.isArray(value) && value.every(entry => isText(entry, 200)) && new Set(value).size === value.length
export function validateWorkspace(input: unknown): Workspace {
  const failure = () => { throw new Error('备份结构或关联关系无效，请使用「回声」导出的 JSON 备份。') }
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 4 * 1024 * 1024) throw new Error('本版单个工作台上限为4MB文字数据。请先备份并整理；本次更改没有保存。')
  if (!isRecord(input) || input.schema !== 1 || !Number.isSafeInteger(input.revision) || Number(input.revision) < 0 || !isText(input.name, 100) || !input.name.trim()) return failure()
  for (const key of ['messages', 'policies', 'drafts', 'events', 'briefs']) {
    if (!Array.isArray(input[key]) || input[key].length > 5000) return failure()
    const records = input[key] as unknown[]
    if (records.some(record => !isRecord(record) || !isText(record.id, 200) || !record.id) || new Set(records.map(record => (record as Record<string, unknown>).id)).size !== records.length) return failure()
  }
  const workspace = input as unknown as Workspace
  for (const message of workspace.messages) {
    if (!hasTexts(message, ['content', 'platform', 'link', 'origin', 'ruleReason']) || !message.content.trim() || !isTime(message.importedAt) || !isTime(message.publishedAt, true) || (message.link && !safeUrl(message.link)) || !member(targets, message.target) || !member(intents, message.intent) || !member(sentiments, message.sentiment) || !member(topics, message.topic) || !member(statuses, message.status) || typeof message.demo !== 'boolean' || typeof message.manual !== 'boolean' || typeof message.priority !== 'boolean') return failure()
  }
  for (const policy of workspace.policies) {
    if (!hasTexts(policy, ['title', 'text', 'context', 'keywords', 'source', 'confirmation', 'validUntil']) || !policy.title.trim() || !policy.text.trim() || !policy.context.trim() || !isText(policy.context, 100) || !member(topics, policy.scope) || !member(policyStates, policy.status) || !Number.isInteger(policy.version) || policy.version < 1 || !isTime(policy.updatedAt) || typeof policy.demo !== 'boolean' || (policy.validUntil && !isCalendarDate(policy.validUntil))) return failure()
  }
  const ids = new Set(workspace.messages.map(message => message.id))
  for (const draft of workspace.drafts) {
    if (!hasTexts(draft, ['messageId', 'text', 'publishedUrl']) || !ids.has(draft.messageId) || !member(tones, draft.tone) || !member(draftStates, draft.state) || !isTime(draft.createdAt) || !isTime(draft.updatedAt) || !['confirmedAt', 'copiedAt', 'publishedAt'].every(key => isTime(draft[key as keyof Draft], true)) || (draft.publishedUrl && !safeUrl(draft.publishedUrl)) || !Array.isArray(draft.refs) || draft.refs.length > 1) return failure()
    if (draft.refs.some(reference => !isRecord(reference) || !hasTexts(reference, ['id', 'title', 'text', 'context', 'source', 'confirmation', 'validUntil']) || !Number.isInteger(reference.version) || reference.version < 1)) return failure()
  }
  for (const event of workspace.events) {
    if (!hasTexts(event, ['title', 'summary', 'known', 'pending', 'owner', 'nextCheck']) || !event.title.trim() || !isIds(event.messageIds) || event.messageIds.some(id => !ids.has(id)) || !member(eventStates, event.status) || !isTime(event.createdAt) || !isTime(event.updatedAt) || !isTime(event.nextCheck, true) || typeof event.demo !== 'boolean' || !Array.isArray(event.logs) || event.logs.length > 5000 || event.logs.some(log => !isRecord(log) || !hasTexts(log, ['id', 'text']) || !isTime(log.at))) return failure()
  }
  for (const brief of workspace.briefs) {
    if (!hasTexts(brief, ['from', 'to', 'scope', 'note']) || !isIds(brief.messageIds) || brief.messageIds.some(id => !ids.has(id)) || !isTime(brief.createdAt) || !['全部', '仅我的留言', '仅虚构演示'].includes(brief.scope) || [brief.from, brief.to].some(date => date && !isCalendarDate(date)) || (brief.from && brief.to && brief.from > brief.to)) return failure()
  }
  return structuredClone(workspace)
}

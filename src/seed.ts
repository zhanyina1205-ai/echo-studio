import { makeMessage, nowIso, type Workspace } from './domain'

export function emptyWorkspace(name = '我的工作室'): Workspace {
  return { schema: 1, revision: 0, name, messages: [], policies: [], drafts: [], events: [], briefs: [] }
}
export function demoWorkspace(): Workspace {
  const time = nowIso()
  const workspace = emptyWorkspace('虚构演示工作室')
  const examples = [
    '示例活动几点开始签到？想提前安排时间。',
    '这个反派让我恨得牙痒痒，演得真好！',
    '别再发旧图了，想看新剧的幕后花絮。',
    '这场戏很有感染力，但字幕实在太小，看不清。',
    '有人说示例活动七点开始，有人说八点，到底哪个对？',
    '这次真行。',
    '谢谢你们分享角色准备的过程，期待下一期！',
    '别再发旧图了，想看新剧的幕后花絮。',
    '如果能整理一份角色台词合集就好了。',
    '有人在评论里传播未公开的住址信息，能核实处理吗？',
  ]
  workspace.messages = examples.map((content, index) => makeMessage(content, { id: `demo-message-${index + 1}`, platform: index % 3 === 0 ? '示例短视频' : '示例微博', importedAt: new Date(Date.now() - index * 17 * 60000).toISOString(), demo: true, origin: '虚构演示', status: index === 4 || index === 9 ? '待核实' : '未处理' }))
  workspace.policies = [
    { id: 'demo-policy-event', title: '示例活动 · 已确认签到信息', text: '【虚构演示】示例活动于18:30开始签到，地点为示例艺术中心。本信息不对应任何真实活动。', context: '示例活动', scope: '活动信息', keywords: '活动 签到 几点 地点', source: '', confirmation: '虚构示例确认，仅用于体验，不是实际工作室审批。', status: '已确认', validUntil: '', version: 1, updatedAt: time, demo: true },
    { id: 'demo-policy-content', title: '示例花絮 · 发布时间待确认', text: '【虚构演示】花絮内容仍在准备中，发布时间尚未确认。', context: '示例作品花絮', scope: '内容需求', keywords: '花絮 幕后 旧图', source: '', confirmation: '', status: '待确认', validUntil: '', version: 1, updatedAt: time, demo: true },
    { id: 'demo-policy-expired', title: '旧版示例活动说明 · 已过期', text: '【虚构演示】上一版活动时间，仅为过期口径提示演示。', context: '示例活动', scope: '活动信息', keywords: '活动', source: '', confirmation: '虚构旧版本示例。', status: '已确认', validUntil: '2020-01-01', version: 1, updatedAt: time, demo: true },
  ]
  workspace.events = [{ id: 'demo-event', title: '示例活动时间出现不同说法', summary: '两条示例留言对签到时间有疑问，先核实，再决定是否补充说明。', known: '演示口径库中存在已确认的虚构签到信息。', pending: '是否需要增加一条置顶说明？由实际负责人判断。', owner: '示例运营（备注，非真实账号）', nextCheck: '', status: '待核实', messageIds: ['demo-message-1', 'demo-message-5'], logs: [{ id: 'demo-log', text: '虚构演示记录：已把重复问题放在同一个事件里，尚未对外回复。', at: time }], createdAt: time, updatedAt: time, demo: true }]
  return workspace
}

export const appUrl = 'https://zhanyina1205-ai.github.io/echo-studio/'
export const stepKeys = ['inbox', 'reply', 'event', 'brief']
export const toneKeys = ['简洁说明', '温和回应', '正式说明']
export const factV1 = '示例见面活动的签到时间为18:30。'
export const factV2 = '示例见面活动的签到时间已改为19:00。'
export const samples = [
  { id: 'one', content: '示例见面活动几点签到？看到两个版本，怕错过。', topic: '活动信息', sentiment: '中性' },
  { id: 'two', content: '这场戏很有感染力，但花絮字幕太小了。', topic: '运营改进', sentiment: '混合' },
  { id: 'three', content: '想看更多角色准备的幕后花絮。', topic: '内容需求', sentiment: '待确认' },
  { id: 'four', content: '想看更多角色准备的幕后花絮。', topic: '内容需求', sentiment: '待确认' },
]
export const moments = {
  release: { index: '01', time: '20:40', label: '新剧播出后的整理片刻', quote: '“这场戏很有感染力，但字幕太小了。”', title: '看见表演肯定，也留下运营建议。', before: '一条留言里可能同时有肯定、问题与期待，不宜只留一个正负标签。', action: '工作人员把获准整理的留言粘贴进待处理，区分讨论对象和反馈主题；规则不准时，手工改。', result: '复盘时少一次把运营问题当成演员评价；有价值的改进点可以进入事件簿。', note: '不要求演员本人追着评论看，也不自动解释复杂语境。' },
  event: { index: '02', time: '16:10', label: '公开活动前的沟通准备', quote: '“签到时间到底是几点？看到两个说法。”', title: '语气可以温和，时间必须有依据。', before: '公开问题需要回应，但流传的说法不一定可靠。亲切的句子也不能弥补事实缺口。', action: '核对来源，建立带版本和有效期的口径；选定口径后准备草稿，由人核实并确认。', result: '减少把不确定安排写成承诺的风险。口径变了，旧草稿会提醒复查，不悄悄改写。', note: '工具不查证现实事实，也不自动在任何平台发布。' },
  content: { index: '03', time: '11:20', label: '一条宣传内容发布以后', quote: '“想看更多角色准备的幕后过程。”', title: '让重复出现的期待，变成可跟进的事。', before: '建议可能分散在多条留言里，只“看见过”并不意味着下一次还记得。', action: '把相关原话关联进同一个事件，分别记录已确认、待核实和下一次检查时间。', result: '内容复盘不只靠印象；是否安排素材、是否回应，由实际负责的人决定。', note: '跟进人是本机文字备注，不是团队任务指派或推送提醒。' },
  review: { index: '04', time: '18:00', label: '工作人员与演员沟通之前', quote: '“这周，哪些声音值得带到下一次沟通？”', title: '不给她一张“情绪成绩单”。', before: '“大家都在说”缺少样本与语境，也不能说明收集是否完整。', action: '工作人员选择日期与资料范围，查看主题、混合情绪及原话，补充人工判断，再导出简报。', result: '让本人在自愿回看的前提下，理解具体反馈；不把少量样本包装成全网意见。', note: '这是建议使用方式。MVP 没有独立演员视图、跨设备共享或团队权限。' },
}
export function initialDemo() {
  return { step: 'inbox', tone: '温和回应', manual: false, draftTone: '', draftVersion: 0, checked: false, confirmed: false, sourceVersion: 1, showSources: false }
}
export function makeDraft(tone, version = 1) {
  if (!toneKeys.includes(tone) || ![1, 2].includes(version)) throw new Error('无效演示状态')
  const prefix = tone === '温和回应' ? '谢谢你的关注与留言。' : tone === '正式说明' ? '感谢关注。关于签到安排，' : '你好，'
  return `${prefix}${version === 1 ? factV1 : factV2}请以本条已确认的虚构说明为准。`
}
export function demoNeedsReview(state) { return state.draftVersion > 0 && state.draftVersion !== state.sourceVersion }
export function canConfirmDemo(state) { return state.draftVersion > 0 && state.checked && !demoNeedsReview(state) }
export function sampleStats() {
  return { raw: samples.length, unique: new Set(samples.map(item => item.content)).size, topics: ['活动信息', '运营改进', '内容需求'].map(topic => ({ topic, count: samples.filter(item => item.topic === topic).length })) }
}
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

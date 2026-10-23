import { validateWorkspace, type Workspace } from './domain'

export function readBackup(input: unknown): Workspace {
  if (typeof input !== 'object' || !input || !('format' in input) || input.format !== 'echo-studio-backup' || !('version' in input) || input.version !== 1 || !('workspace' in input)) throw new Error('这不是「回声」v1 JSON 备份，原有数据未改变。')
  return validateWorkspace(input.workspace)
}
export function mergeBackup(current: Workspace, incoming: Workspace): Workspace {
  const merge = <Value extends { id: string }>(saved: Value[], imported: Value[]) => {
    const ids = new Set(saved.map(record => record.id))
    return [...saved, ...imported.filter(record => !ids.has(record.id))]
  }
  return validateWorkspace({ ...current, messages: merge(current.messages, incoming.messages), policies: merge(current.policies, incoming.policies), drafts: merge(current.drafts, incoming.drafts), events: merge(current.events, incoming.events), briefs: merge(current.briefs, incoming.briefs) })
}
export function exportScope(workspace: Workspace, includeDemo: boolean) {
  if (includeDemo) return structuredClone(workspace)
  const messages = workspace.messages.filter(message => !message.demo)
  const ids = new Set(messages.map(message => message.id))
  return validateWorkspace({ ...workspace, messages, policies: workspace.policies.filter(policy => !policy.demo), drafts: workspace.drafts.filter(draft => ids.has(draft.messageId)), events: workspace.events.filter(event => !event.demo).map(event => ({ ...event, messageIds: event.messageIds.filter(id => ids.has(id)) })), briefs: workspace.briefs.filter(brief => brief.scope !== '仅虚构演示').map(brief => ({ ...brief, messageIds: brief.messageIds.filter(id => ids.has(id)) })) })
}

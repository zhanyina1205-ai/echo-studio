import { validateWorkspace, type Workspace } from './domain'

const databaseName = 'echo-studio-private-v1'
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('浏览器不支持本地数据库，请换用正常模式的现代浏览器。'))
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('workspace')) request.result.createObjectStore('workspace') }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('本地数据库被其他页面占用，请关闭重复标签页后重试。'))
  })
}
export async function readWorkspace(): Promise<Workspace | null> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('workspace', 'readonly')
      const request = transaction.objectStore('workspace').get('current')
      let value: unknown
      request.onsuccess = () => { value = request.result }
      transaction.oncomplete = () => {
        try { resolve(value === undefined ? null : validateWorkspace(value)) } catch (error) { reject(error) }
      }
      transaction.onerror = () => reject(transaction.error)
    })
  } finally { database.close() }
}
export async function writeWorkspace(workspace: Workspace, expectedRevision: number | null) {
  const valid = validateWorkspace(workspace)
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('workspace', 'readwrite')
      const store = transaction.objectStore('workspace')
      const current = store.get('current')
      let conflict: Error | null = null
      current.onsuccess = () => {
        const revision = current.result?.revision ?? null
        if (revision !== expectedRevision) { conflict = new Error('另一个页面已更新工作台。请先备份当前已保存内容，再刷新；不要多标签同时编辑。'); transaction.abort(); return }
        try { store.put(valid, 'current') } catch (failure) { conflict = failure instanceof Error ? failure : new Error('保存未完成，请重试。'); transaction.abort() }
      }
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(conflict || transaction.error || new Error('保存事务未完成，请重试。'))
    })
  } finally { database.close() }
}
export function storageError(error: unknown) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return '设备可用空间不足，本次没有保存。请保留输入，释放空间后重试；可先导出已经保存的数据。'
  return error instanceof Error ? error.message : '保存失败，本次更改未写入设备。请保留输入后重试。'
}

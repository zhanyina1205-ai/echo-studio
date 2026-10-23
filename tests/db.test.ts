import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readWorkspace, storageError, writeWorkspace } from '../src/db'
import { makeMessage } from '../src/domain'
import { demoWorkspace } from '../src/seed'

beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()) })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('IndexedDB 事务与恢复', () => {
  it('关闭连接后再次读取可恢复已保存工作台', async () => {
    const workspace = demoWorkspace()
    await writeWorkspace(workspace, null)
    expect(await readWorkspace()).toEqual(workspace)
  })
  it('版本冲突不覆盖另一个标签页已提交的数据', async () => {
    const workspace = demoWorkspace()
    await writeWorkspace(workspace, null)
    const next = { ...workspace, revision: 1, name: '先成功保存的版本' }
    await writeWorkspace(next, 0)
    await expect(writeWorkspace({ ...workspace, revision: 1, name: '旧页面' }, 0)).rejects.toThrow(/另一个页面/)
    expect((await readWorkspace())?.name).toBe(next.name)
  })
  it('模拟空间不足时事务回滚，原数据仍可读取', async () => {
    const workspace = demoWorkspace()
    await writeWorkspace(workspace, null)
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
    const next = { ...workspace, revision: 1, messages: [...workspace.messages, makeMessage('这条不应被保存')] }
    await expect(writeWorkspace(next, 0)).rejects.toMatchObject({ name: 'QuotaExceededError' })
    put.mockRestore()
    expect(await readWorkspace()).toEqual(workspace)
    expect(storageError(new DOMException('Full', 'QuotaExceededError'))).toMatch(/空间不足/)
  })
  it('无存储能力明确失败，不伪装保存成功', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await expect(readWorkspace()).rejects.toThrow(/不支持/)
  })
})

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { readWorkspace, storageError, writeWorkspace } from './db'
import { demoWorkspace } from './seed'
import { type Workspace } from './domain'

type Store = { data: Workspace; busy: boolean; mutate: (action: (current: Workspace) => Workspace) => Promise<boolean>; notify: (text: string) => void; error: string; clearError: () => void }
const Context = createContext<Store | null>(null)
export function useWorkspace() {
  const store = useContext(Context)
  if (!store) throw new Error('Workspace unavailable')
  return store
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Workspace | null>(null)
  const current = useRef<Workspace | null>(null)
  const [bootError, setBootError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const working = useRef(false)
  const [toast, setToast] = useState('')
  useEffect(() => {
    let stopped = false
    void (async () => {
      try {
        setBootError('')
        let workspace = await readWorkspace()
        if (!workspace) { workspace = demoWorkspace(); await writeWorkspace(workspace, null) }
        if (!stopped) { current.current = workspace; setData(workspace) }
      } catch (failure) { if (!stopped) setBootError(storageError(failure)) }
    })()
    return () => { stopped = true }
  }, [attempt])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer) }, [toast])
  const mutate = async (action: (saved: Workspace) => Workspace) => {
    if (!current.current || working.current) { setError('正在保存上一项更改，请稍后重试。'); return false }
    working.current = true; setBusy(true)
    try {
      const next = action(structuredClone(current.current))
      next.revision = current.current.revision + 1
      await writeWorkspace(next, current.current.revision)
      current.current = next; setData(next); setError('')
      return true
    } catch (failure) { setError(storageError(failure)); return false }
    finally { working.current = false; setBusy(false) }
  }
  if (!data) return <div className="boot"><span className="echo-mark" /><h1>{bootError ? '暂时无法打开本地工作台' : '给每一种声音，一个回音。'}</h1><p>{bootError || '正在读取此设备的数据…'}</p>{bootError && <button className="button dark-button" onClick={() => setAttempt(value => value + 1)}>重试读取，不清除数据</button>}</div>
  return <Context.Provider value={{ data, busy, mutate, notify: setToast, error, clearError: () => setError('') }}>{children}{toast && <div className="toast" role="status">{toast}</div>}</Context.Provider>
}

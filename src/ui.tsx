import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { safeUrl } from './domain'

export function Badge({ children, kind = '' }: { children: ReactNode; kind?: string }) { return <span className={`badge ${kind}`}>{children}</span> }
export function SourceLink({ value, label = '查看原文' }: { value: string; label?: string }) {
  const href = safeUrl(value)
  return href ? <a className="source-link" href={href} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={13} /></a> : <span className="muted small">未提供外部原文链接</span>
}
export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="empty"><span className="empty-star" aria-hidden="true">✳</span><h3>{title}</h3><p>{text}</p>{action}</div> }
export function Modal({ title, label, children, close, wide = false }: { title: string; label?: string; children: ReactNode; close: () => void; wide?: boolean }) {
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>('input:not([type=file]),textarea,select,button')?.focus())
    return () => { cancelAnimationFrame(timer); document.body.style.overflow = original; previous?.focus() }
  }, [])
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close() }}><section ref={dialog} className={`modal ${wide ? 'wide-modal' : ''}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close() }
    if (event.key === 'Tab') {
      const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]') || [])].filter(element => element.offsetParent !== null)
      const first = focusable[0]; const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
  }}><header className="modal-head"><div>{label && <span className="eyebrow">{label}</span>}<h2>{title}</h2></div><button className="icon-button" onClick={close} aria-label="关闭对话框"><X size={22} /></button></header>{children}</section></div>
}
export function useDirty(dirty: boolean, onDirty?: (value: boolean) => void) {
  useEffect(() => {
    onDirty?.(dirty)
    const before = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', before)
    return () => { onDirty?.(false); window.removeEventListener('beforeunload', before) }
  }, [dirty, onDirty])
}
export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function localDateTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

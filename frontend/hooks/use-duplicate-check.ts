'use client'

import { useEffect, useRef, useState } from 'react'
import { checkDuplicate, type DuplicateResponse } from '@/lib/semantic-api'

export type DupStatus = 'idle' | 'checking' | 'done' | 'error'

/** Debounced, cancellable, non-blocking duplicate check (mirrors useClassify). */
export function useDuplicateCheck(text: string, opts: { minChars?: number; debounceMs?: number } = {}) {
  const { minChars = 25, debounceMs = 700 } = opts
  const [status, setStatus] = useState<DupStatus>('idle')
  const [result, setResult] = useState<DuplicateResponse | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const t = text.trim()
    if (t.length < minChars) {
      abortRef.current?.abort()
      setStatus('idle')
      setResult(null)
      return
    }
    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setStatus('checking')
      checkDuplicate(t, undefined, undefined, ctrl.signal)
        .then((r) => {
          setResult(r)
          setStatus('done')
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setStatus('error')
        })
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [text, minChars, debounceMs])

  return { status, result }
}

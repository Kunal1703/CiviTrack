'use client'

import { useEffect, useRef, useState } from 'react'
import { classifyComplaint, type ClassifyResult } from '@/lib/api-client'

export type ClassifyStatus = 'idle' | 'analyzing' | 'done' | 'error'

interface Options {
  minChars?: number
  debounceMs?: number
}

/**
 * Debounced, cancellable live classification. Never throws to the caller and
 * never blocks the form — it only surfaces status + result for the UI to render
 * as a non-blocking enhancement.
 */
export function useClassify(text: string, opts: Options = {}) {
  const { minChars = 15, debounceMs = 550 } = opts
  const [status, setStatus] = useState<ClassifyStatus>('idle')
  const [result, setResult] = useState<ClassifyResult | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = text.trim()
    if (trimmed.length < minChars) {
      abortRef.current?.abort()
      setStatus('idle')
      setResult(null)
      return
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setStatus('analyzing')
      classifyComplaint(trimmed, ctrl.signal)
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

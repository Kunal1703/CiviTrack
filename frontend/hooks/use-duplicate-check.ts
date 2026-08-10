'use client'

import { useEffect, useRef, useState } from 'react'
import { checkDuplicate, type Dataset, type DuplicateResponse } from '@/lib/semantic-api'

export type DupStatus = 'idle' | 'checking' | 'done' | 'error'

interface Options {
  minChars?: number
  debounceMs?: number
  dataset?: Dataset
  latitude?: number | null
  longitude?: number | null
}

/** Debounced, cancellable, non-blocking duplicate check (mirrors useClassify).
 *  Dataset defaults to the NYC corpus; the citizen flow passes 'delhi' + coords
 *  so the spatial-temporal gate runs against Delhi community complaints. */
export function useDuplicateCheck(text: string, opts: Options = {}) {
  const { minChars = 25, debounceMs = 700, dataset = 'nyc', latitude, longitude } = opts
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
      checkDuplicate(t, latitude ?? undefined, longitude ?? undefined, dataset, ctrl.signal)
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
  }, [text, minChars, debounceMs, dataset, latitude, longitude])

  return { status, result }
}

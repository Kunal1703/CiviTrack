'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { bandStyle, type HotspotCell } from '@/lib/hotspots-api'

// New York City — the analytical corpus for the Gi* hotspots. (Deliberately NOT
// Delhi: the Delhi product map is a separate, sparse demo and stays unchanged.)
export const NYC_CENTER: [number, number] = [40.7128, -74.006]

interface HotspotMapProps {
  cells: HotspotCell[]
  height?: string
}

/**
 * Renders precomputed Gi* grid cells as rectangles shaded by confidence band.
 * Significant cells (hot/cold) are drawn opaque and on top; non-significant cells
 * sit underneath as faint context. Each cell popups its z-score and p-value.
 */
export function HotspotMap({ cells, height = '560px' }: HotspotMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const creating = useRef(false)
  const [isClient, setIsClient] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => setIsClient(true), [])

  // Create the map once.
  useEffect(() => {
    if (!isClient || !mapRef.current || mapInstanceRef.current || creating.current) return
    creating.current = true
    import('leaflet').then((L) => {
      if (mapInstanceRef.current) return
      const map = L.map(mapRef.current!, {
        center: NYC_CENTER,
        zoom: 11,
        scrollWheelZoom: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      mapInstanceRef.current = map
      creating.current = false
      setReady(true)
    })
    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
      layerRef.current = null
      creating.current = false
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient])

  // (Re)draw cells whenever the data changes.
  useEffect(() => {
    if (!isClient || !ready || !mapInstanceRef.current || !layerRef.current) return
    import('leaflet').then((L) => {
      const group = layerRef.current!
      group.clearLayers()

      // Draw non-significant context first (underneath), significant cells last.
      const ordered = [...cells].sort(
        (a, b) => Number(a.significance !== 'ns') - Number(b.significance !== 'ns'),
      )
      for (const c of ordered) {
        const { color, label } = bandStyle(c.significance)
        const significant = c.significance !== 'ns'
        L.rectangle(
          [
            [c.south, c.west],
            [c.north, c.east],
          ],
          {
            color,
            weight: significant ? 1 : 0.5,
            fillColor: color,
            fillOpacity: significant ? 0.55 : 0.12,
          },
        )
          .addTo(group)
          .bindPopup(
            `<div style="min-width:190px">
               <strong>${label}</strong><br/>
               <span>${c.count.toLocaleString()} complaint${c.count === 1 ? '' : 's'} in this ~1&nbsp;km cell</span><br/>
               <small>Gi* z = ${c.gi_z === null ? '—' : c.gi_z.toFixed(2)} ·
                 p = ${c.p_value === null ? '—' : c.p_value < 0.001 ? '<0.001' : c.p_value.toFixed(3)} (FDR)</small><br/>
               <small style="opacity:.65">cell ${c.cell_key}${c.category ? ` · ${c.category}` : ''}</small>
             </div>`,
          )
      }
    })
  }, [isClient, ready, cells])

  if (!isClient) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border border-border bg-muted/40"
        role="status"
        aria-label="Loading map"
      >
        <span className="text-sm text-muted-foreground">Loading map…</span>
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className="overflow-hidden rounded-xl border border-border"
      role="application"
      aria-label="NYC 311 Getis-Ord Gi* hotspot map"
    />
  )
}

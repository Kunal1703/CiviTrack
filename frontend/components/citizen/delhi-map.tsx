'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { MapPoint } from '@/lib/complaints-api'
import { getCategory } from '@/lib/categories'

// Delhi, not Bangalore — the product's geographic home.
export const DELHI_CENTER: [number, number] = [28.6139, 77.209]

// Category → recognizable glyph for map markers (kept lightweight vs. bundling
// icon SVGs into Leaflet HTML). Colors come from the shared category system.
const CATEGORY_GLYPH: Record<string, string> = {
  'Street Light': '💡',
  'Street Condition': '🛣️',
  Sanitation: '🗑️',
  'Plumbing/Water': '💧',
  Sewer: '🌊',
  Noise: '🔊',
  'Illegal Parking': '🚗',
  Tree: '🌳',
  'Environmental Hazard': '⚠️',
}

function glyph(category?: string | null): string {
  return (category && CATEGORY_GLYPH[category]) || '📍'
}

export interface HeatCell {
  lat: number
  lng: number
  count: number
  top: [string, number][]
}

/** Aggregate points into ~1.1km grid cells for a data-driven heat/hotspot view. */
export function aggregateHeat(points: MapPoint[], precision = 2): HeatCell[] {
  const cells = new Map<string, { sumLat: number; sumLng: number; count: number; cats: Map<string, number> }>()
  for (const p of points) {
    const key = `${p.latitude.toFixed(precision)},${p.longitude.toFixed(precision)}`
    const cell = cells.get(key) ?? { sumLat: 0, sumLng: 0, count: 0, cats: new Map() }
    cell.sumLat += p.latitude
    cell.sumLng += p.longitude
    cell.count += 1
    const c = p.category ?? 'Other'
    cell.cats.set(c, (cell.cats.get(c) ?? 0) + 1)
    cells.set(key, cell)
  }
  return [...cells.values()].map((c) => ({
    lat: c.sumLat / c.count,
    lng: c.sumLng / c.count,
    count: c.count,
    top: [...c.cats.entries()].sort((a, b) => b[1] - a[1]),
  }))
}

/** Agreed heat thresholds: 1–2 yellow, 3–4 orange, 5+ red. */
export function heatColor(count: number): string {
  if (count >= 5) return '#ef4444'
  if (count >= 3) return '#f97316'
  return '#eab308'
}

function heatLabel(count: number): string {
  if (count >= 5) return 'High activity'
  if (count >= 3) return 'Moderate activity'
  return 'Low activity'
}

interface DelhiMapProps {
  points?: MapPoint[]
  height?: string
  zoom?: number
  center?: [number, number]
  showMarkers?: boolean
  showHeat?: boolean
  interactive?: boolean
  /** Location-picker mode (report form): click to choose a point. */
  selectable?: boolean
  selected?: { lat: number; lng: number } | null
  onSelect?: (lat: number, lng: number) => void
  className?: string
}

export function DelhiMap({
  points = [],
  height = '400px',
  zoom = 11,
  center = DELHI_CENTER,
  showMarkers = true,
  showHeat = false,
  interactive = true,
  selectable = false,
  selected = null,
  onSelect,
  className,
}: DelhiMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const selectedMarkerRef = useRef<L.Marker | null>(null)
  const creating = useRef(false)
  const [isClient, setIsClient] = useState(false)
  // Flips true once the (async) Leaflet map is created, so the marker/heat effect
  // re-runs even when data was already present before the map finished mounting.
  const [ready, setReady] = useState(false)

  const heat = useMemo(() => (showHeat ? aggregateHeat(points) : []), [points, showHeat])

  useEffect(() => setIsClient(true), [])

  // Create the map once.
  useEffect(() => {
    if (!isClient || !mapRef.current || mapInstanceRef.current || creating.current) return
    creating.current = true
    import('leaflet').then((L) => {
      if (mapInstanceRef.current) return
      const map = L.map(mapRef.current!, {
        center,
        zoom,
        scrollWheelZoom: interactive,
        dragging: interactive,
        zoomControl: interactive,
        attributionControl: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      if (selectable && onSelect) {
        map.on('click', (e: L.LeafletMouseEvent) => onSelect(e.latlng.lat, e.latlng.lng))
      }
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

  // Render markers + heat whenever data changes (or once the map becomes ready).
  useEffect(() => {
    if (!isClient || !ready || !mapInstanceRef.current || !layerRef.current) return
    import('leaflet').then((L) => {
      const group = layerRef.current!
      group.clearLayers()

      if (showHeat) {
        for (const cell of heat) {
          const color = heatColor(cell.count)
          L.circle([cell.lat, cell.lng], {
            color,
            fillColor: color,
            fillOpacity: 0.25,
            weight: 1.5,
            radius: 250 + cell.count * 70,
          })
            .addTo(group)
            .bindPopup(
              `<div style="min-width:170px">
                 <strong>${heatLabel(cell.count)}</strong><br/>
                 <span>${cell.count} report${cell.count > 1 ? 's' : ''} in this area</span><br/>
                 <small>${cell.top.slice(0, 3).map(([c, n]) => `${c} (${n})`).join(', ')}</small>
               </div>`,
            )
        }
      }

      if (showMarkers) {
        for (const p of points) {
          const meta = getCategory(p.category)
          const icon = L.divIcon({
            className: 'civic-pin',
            html: `<div style="
                width:30px;height:30px;border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                background:${meta.color};
                border:2px solid rgba(255,255,255,.9);
                box-shadow:0 3px 8px rgba(0,0,0,.35);
                display:grid;place-items:center;">
                <span style="transform:rotate(45deg);font-size:14px;line-height:1">${glyph(p.category)}</span>
              </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 28],
            popupAnchor: [0, -26],
          })
          L.marker([p.latitude, p.longitude], { icon })
            .addTo(group)
            .bindPopup(
              `<div style="min-width:170px">
                 <strong>${p.title}</strong><br/>
                 <span>${p.category ?? 'Other'}</span><br/>
                 <small>${p.status.replace('_', ' ')} · ${new Date(p.created_at).toLocaleDateString()}</small><br/>
                 <small style="opacity:.7">${p.public_ref}</small>
               </div>`,
            )
        }
      }
    })
  }, [isClient, ready, points, heat, showMarkers, showHeat])

  // Location-picker selected marker.
  useEffect(() => {
    if (!isClient || !ready || !mapInstanceRef.current) return
    import('leaflet').then((L) => {
      selectedMarkerRef.current?.remove()
      selectedMarkerRef.current = null
      if (selected) {
        const icon = L.divIcon({
          className: 'civic-pin-selected',
          html: `<div style="width:22px;height:22px;border-radius:50%;background:#06b6d4;border:3px solid white;box-shadow:0 0 0 6px rgba(6,182,212,.25)"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })
        selectedMarkerRef.current = L.marker([selected.lat, selected.lng], { icon }).addTo(mapInstanceRef.current!)
        mapInstanceRef.current!.setView([selected.lat, selected.lng], Math.max(mapInstanceRef.current!.getZoom(), 14))
      }
    })
  }, [isClient, ready, selected])

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
      className={`overflow-hidden rounded-xl border border-border ${className ?? ''}`}
      role="application"
      aria-label="Delhi civic issues map"
    />
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import type { IssueLocation, Hotspot } from '@/lib/types'

// Leaflet CSS must be imported
import 'leaflet/dist/leaflet.css'

interface IssueMapProps {
  locations?: IssueLocation[]
  hotspots?: Hotspot[]
  center?: [number, number]
  zoom?: number
  height?: string
  onLocationSelect?: (lat: number, lng: number) => void
  selectedLocation?: { lat: number; lng: number } | null
  interactive?: boolean
}

// Status colors
const statusColors: Record<string, string> = {
  pending: '#eab308',
  in_progress: '#3b82f6',
  resolved: '#22c55e',
}

export function IssueMap({
  locations = [],
  hotspots = [],
  center = [12.9716, 77.5946], // Default: Bangalore
  zoom = 12,
  height = '400px',
  onLocationSelect,
  selectedLocation,
  interactive = true,
}: IssueMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const selectedMarkerRef = useRef<L.Marker | null>(null)
  const [isClient, setIsClient] = useState(false)
  const isMapCreating = useRef(false);

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !mapRef.current ) return

     // 🛑 Prevent multiple initialization
    if (mapInstanceRef.current || isMapCreating.current) return;

    isMapCreating.current = true;

    // Dynamic import of Leaflet
    import('leaflet').then((L) => {

      if(mapInstanceRef.current) return;

      // Fix default marker icons
      delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center: center,
        zoom: zoom,
        scrollWheelZoom: interactive,
        dragging: interactive,
        zoomControl: interactive,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      mapInstanceRef.current = map
      isMapCreating.current = false;

      // Add click handler for location selection
      if (onLocationSelect) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onLocationSelect(e.latlng.lat, e.latlng.lng)
        })
      }

      // Add issue markers
      locations.forEach((loc) => {
        const color = statusColors[loc.status] || '#6b7280'
        const markerIcon = L.divIcon({
          html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          className: 'custom-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        L.marker([loc.latitude, loc.longitude], { icon: markerIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 150px;">
              <strong>${loc.title}</strong><br/>
              <span style="color: ${color}; text-transform: capitalize;">${loc.status.replace('_', ' ')}</span><br/>
              <small>${loc.category_name}</small>
            </div>
          `)
      })

      // Add hotspot circles
      hotspots.forEach((hotspot) => {
        L.circle([hotspot.latitude, hotspot.longitude], {
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.2,
          radius: hotspot.radius_meters,
        })
          .addTo(map)
          .bindPopup(`
            <div>
              <strong>Hotspot Area</strong><br/>
              ${hotspot.location_name}<br/>
              <small>${hotspot.issue_count} issues in this area</small>
            </div>
          `)
      })
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      isMapCreating.current = false;
    }
  }, [isClient, center, zoom, locations, hotspots, onLocationSelect, interactive])

  // Update selected location marker
  useEffect(() => {
    if (!isClient || !mapInstanceRef.current) return

    import('leaflet').then((L) => {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove()
        selectedMarkerRef.current = null
      }

      if (selectedLocation) {
        selectedMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng])
          .addTo(mapInstanceRef.current!)
          .bindPopup('Selected Location')
          .openPopup()

        mapInstanceRef.current!.setView([selectedLocation.lat, selectedLocation.lng], 15)
      }
    })
  }, [isClient, selectedLocation])

  if (!isClient) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg border border-border bg-muted"
      >
        <span className="text-sm text-muted-foreground">Loading map...</span>
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className="rounded-lg border border-border overflow-hidden"
    />
  )
}

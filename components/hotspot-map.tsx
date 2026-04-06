'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { IssueMap } from '@/components/issue-map'
import type { IssueLocation, Hotspot } from '@/lib/types'
import { AlertTriangle, MapPin } from 'lucide-react'

interface HotspotMapProps {
  locations: IssueLocation[]
  hotspots: Hotspot[]
}

export function HotspotMap({ locations, hotspots }: HotspotMapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Issue Map & Hotspots
        </CardTitle>
        <CardDescription>
          Geographic distribution of issues and detected hotspot areas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <IssueMap
          locations={locations}
          hotspots={hotspots}
          height="400px"
          interactive={true}
        />

        {hotspots.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Detected Hotspots ({hotspots.length})
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {hotspots.map((hotspot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {hotspot.location_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hotspot.issue_count} issues within {hotspot.radius_meters}m
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[var(--status-pending)]" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[var(--status-in-progress)]" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[var(--status-resolved)]" />
            <span>Resolved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-destructive bg-destructive/20" />
            <span>Hotspot Area</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

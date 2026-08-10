'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Sparkles, Loader2, Send, MapPin, Check, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DelhiMap } from '@/components/citizen/delhi-map'
import { SimilarReports } from '@/components/citizen/similar-reports'
import { useClassify } from '@/hooks/use-classify'
import { useDuplicateCheck } from '@/hooks/use-duplicate-check'
import { CATEGORIES, getCategory } from '@/lib/categories'
import { createComplaint } from '@/lib/complaints-api'
import { fadeInUp, staggerContainer } from '@/lib/motion'

export function CitizenReportForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [address, setAddress] = useState('')
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Live, non-blocking AI category suggestion (M1).
  const { status: aiStatus, result: ai } = useClassify(description, { minChars: 20, debounceMs: 550 })
  const applied = !!ai && category === ai.category

  // Live, non-blocking Delhi duplicate/related check (M3, spatial when a point is set).
  const { result: dup } = useDuplicateCheck(description, {
    dataset: 'delhi',
    minChars: 25,
    latitude: loc?.lat ?? null,
    longitude: loc?.lng ?? null,
  })

  const applySuggestion = () => ai && setCategory(ai.category)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (title.trim().length < 5) return setError('Please give your report a short title (at least 5 characters).')
    if (description.trim().length < 20) return setError('Please describe the issue in a little more detail (at least 20 characters).')

    setSubmitting(true)
    try {
      const created = await createComplaint({
        title: title.trim(),
        description: description.trim(),
        category: category ?? ai?.category ?? null,
        category_confidence: applied ? ai?.confidence ?? null : ai && category === ai.category ? ai.confidence : null,
        latitude: loc?.lat ?? null,
        longitude: loc?.lng ?? null,
        address_text: address.trim() || null,
        priority,
      })
      toast.success('Report submitted', { description: `Reference ${created.public_ref}` })
      router.push(`/citizen/reports/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your report')
      setSubmitting(false)
    }
  }

  const suggestion = ai ? getCategory(ai.category) : null
  const confPct = ai ? Math.round(ai.confidence * 100) : 0

  return (
    <motion.form onSubmit={onSubmit} variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      {/* What's wrong */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle>What’s the issue?</CardTitle>
            <CardDescription>Tell us what’s wrong and where — we’ll suggest a category automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Street light not working near the park" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Describe the issue</Label>
              <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="What's happening, where exactly, and for how long?" />
            </div>

            {/* Friendly AI suggestion (no technical jargon) */}
            {(aiStatus === 'analyzing' || ai) && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  {aiStatus === 'analyzing' ? 'Reading your report…' : 'Suggested category'}
                </div>
                {ai && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm font-medium">
                      {suggestion && <suggestion.Icon className="h-4 w-4" style={{ color: suggestion.color }} />}
                      {ai.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }}
                          animate={{ width: `${confPct}%` }} transition={{ duration: 0.6 }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{confPct}% confident</span>
                    </div>
                    {applied ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-500">
                        <Check className="h-3.5 w-3.5" /> Applied
                      </span>
                    ) : (
                      <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={applySuggestion}>
                        <Wand2 className="h-3.5 w-3.5" /> Use this
                      </Button>
                    )}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">You can always choose a different category below.</p>
              </motion.div>
            )}

            {/* Non-blocking similar-reports (M3 Delhi) */}
            {dup && dup.matches.length > 0 && <SimilarReports items={dup.matches} variant="warning" />}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category"><SelectValue placeholder="Choose or use the suggestion" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(({ name, Icon, color }) => (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" style={{ color }} />
                          {name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">How urgent is it?</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as 'low' | 'medium' | 'high')}>
                  <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Not urgent</SelectItem>
                    <SelectItem value="medium">Needs attention</SelectItem>
                    <SelectItem value="high">Urgent / unsafe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Where */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Where is it?</CardTitle>
            <CardDescription>Tap the map to drop a pin at the location in Delhi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Landmark / address (optional)</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Near Gate 3, Connaught Place" />
            </div>
            <DelhiMap height="320px" selectable selected={loc} onSelect={(lat, lng) => setLoc({ lat, lng })}
              showMarkers={false} />
            {loc && (
              <p className="text-sm text-muted-foreground">
                Pinned at {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <motion.div variants={fadeInUp} className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/citizen')}>Cancel</Button>
        <Button type="submit" disabled={submitting} className="gap-2 shadow-glow">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'Submitting…' : 'Submit report'}
        </Button>
      </motion.div>
    </motion.form>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { IssueMap } from '@/components/issue-map'
import { AiAnalysis } from '@/components/ai-analysis'
import { useClassify } from '@/hooks/use-classify'
import { CATEGORIES } from '@/lib/categories'
import { fadeInUp, staggerContainer } from '@/lib/motion'
import { MapPin, Send, Loader2 } from 'lucide-react'

const issueSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  location_name: z.string().optional(),
  reporter_name: z.string().min(2, 'Name is required'),
  reporter_email: z.string().email('Invalid email address'),
})

type IssueFormData = z.infer<typeof issueSchema>

const MotionCard = motion.create(Card)

export function IssueForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: { priority: 'medium' },
  })

  const description = watch('description') ?? ''
  const category = watch('category')

  // Live, debounced, non-blocking classification of the description text.
  const { status, result } = useClassify(description, { minChars: 20, debounceMs: 550 })
  const applied = !!result && category === result.category

  const applySuggestion = () => {
    if (result) setValue('category', result.category, { shouldValidate: true })
  }

  const onSubmit = async (data: IssueFormData) => {
    setIsSubmitting(true)
    // Persistence endpoint arrives in a later milestone; M2 confirms the flow.
    await new Promise((r) => setTimeout(r, 900))
    setIsSubmitting(false)
    toast.success('Report submitted', {
      description: data.category ? `Categorized as ${data.category}.` : 'Thanks — your report was received.',
    })
    router.push('/issues')
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Issue details + live AI */}
      <MotionCard variants={fadeInUp}>
        <CardHeader>
          <CardTitle>Issue details</CardTitle>
          <CardDescription>Describe the civic issue — our AI categorizes it as you type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="e.g., Pothole on Main Street" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what's wrong, where, and for how long…"
              rows={4}
              {...register('description')}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {/* Flagship live AI panel (non-blocking) */}
          <AiAnalysis status={status} result={result} applied={applied} onApply={applySuggestion} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setValue('category', v, { shouldValidate: true })}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select or let AI suggest" />
                </SelectTrigger>
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
              <Label htmlFor="priority">Priority</Label>
              <Select
                defaultValue="medium"
                onValueChange={(v) => setValue('priority', v as 'low' | 'medium' | 'high')}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </MotionCard>

      {/* Location */}
      <MotionCard variants={fadeInUp}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
          <CardDescription>Click on the map to pinpoint the issue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location_name">Location name</Label>
            <Input id="location_name" placeholder="e.g., Near City Hospital, Main Street" {...register('location_name')} />
          </div>
          <IssueMap
            height="300px"
            onLocationSelect={(lat, lng) => setSelectedLocation({ lat, lng })}
            selectedLocation={selectedLocation}
            interactive
          />
          {selectedLocation && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </p>
          )}
        </CardContent>
      </MotionCard>

      {/* Contact */}
      <MotionCard variants={fadeInUp}>
        <CardHeader>
          <CardTitle>Your information</CardTitle>
          <CardDescription>We'll use this to keep you updated on the issue status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reporter_name">Your name *</Label>
              <Input id="reporter_name" placeholder="John Doe" {...register('reporter_name')} />
              {errors.reporter_name && <p className="text-sm text-destructive">{errors.reporter_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporter_email">Email address *</Label>
              <Input id="reporter_email" type="email" placeholder="john@example.com" {...register('reporter_email')} />
              {errors.reporter_email && <p className="text-sm text-destructive">{errors.reporter_email.message}</p>}
            </div>
          </div>
        </CardContent>
      </MotionCard>

      <motion.div variants={fadeInUp} className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit report
            </>
          )}
        </Button>
      </motion.div>
    </motion.form>
  )
}

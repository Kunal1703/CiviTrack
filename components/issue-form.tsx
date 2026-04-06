'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { mockCategories, mockCategorize } from '@/lib/mock-data'
import { Sparkles, MapPin, Send, Loader2 } from 'lucide-react'

const issueSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  location_name: z.string().optional(),
  reporter_name: z.string().min(2, 'Name is required'),
  reporter_email: z.string().email('Invalid email address'),
})

type IssueFormData = z.infer<typeof issueSchema>

export function IssueForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [suggestion, setSuggestion] = useState<{
    category: string
    confidence: number
    keywords: string[]
  } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      priority: 'medium',
    },
  })

  const title = watch('title')
  const description = watch('description')

  // Auto-categorize when title or description changes
  useEffect(() => {
    if (title && description && title.length > 3 && description.length > 10) {
      const result = mockCategorize(title, description)
      setSuggestion({
        category: result.suggested_category,
        confidence: result.confidence,
        keywords: result.matched_keywords,
      })
    } else {
      setSuggestion(null)
    }
  }, [title, description])

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng })
  }

  const applySuggestion = () => {
    if (suggestion) {
      const category = mockCategories.find((c) => c.name === suggestion.category)
      if (category) {
        setValue('category_id', String(category.id))
      }
    }
  }

  const onSubmit = async (data: IssueFormData) => {
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const issueData = {
      ...data,
      category_id: data.category_id ? parseInt(data.category_id) : undefined,
      latitude: selectedLocation?.lat,
      longitude: selectedLocation?.lng,
    }

    console.log('Issue submitted:', issueData)

    // In production, this would call the API
    // await createIssue(issueData)

    setIsSubmitting(false)
    router.push('/issues')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Issue Details</CardTitle>
          <CardDescription>
            Describe the civic issue you want to report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Pothole on Main Street"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Please provide a detailed description of the issue..."
              rows={4}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Auto-categorization suggestion */}
          {suggestion && suggestion.confidence > 0.3 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      AI Suggestion: <span className="text-primary">{suggestion.category}</span>
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(suggestion.confidence * 100)}% confident
                    </span>
                  </div>
                  {suggestion.keywords.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Keywords detected: {suggestion.keywords.join(', ')}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applySuggestion}
                  >
                    Apply Suggestion
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                onValueChange={(value) => setValue('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {mockCategories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                defaultValue="medium"
                onValueChange={(value) => setValue('priority', value as 'low' | 'medium' | 'high')}
              >
                <SelectTrigger>
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
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
          <CardDescription>
            Click on the map to select the issue location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location_name">Location Name</Label>
            <Input
              id="location_name"
              placeholder="e.g., Near City Hospital, Main Street"
              {...register('location_name')}
            />
          </div>

          <IssueMap
            height="300px"
            onLocationSelect={handleLocationSelect}
            selectedLocation={selectedLocation}
            interactive={true}
          />

          {selectedLocation && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
          <CardDescription>
            We will use this to keep you updated on the issue status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reporter_name">Your Name *</Label>
              <Input
                id="reporter_name"
                placeholder="John Doe"
                {...register('reporter_name')}
              />
              {errors.reporter_name && (
                <p className="text-sm text-destructive">{errors.reporter_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reporter_email">Email Address *</Label>
              <Input
                id="reporter_email"
                type="email"
                placeholder="john@example.com"
                {...register('reporter_email')}
              />
              {errors.reporter_email && (
                <p className="text-sm text-destructive">{errors.reporter_email.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Report
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

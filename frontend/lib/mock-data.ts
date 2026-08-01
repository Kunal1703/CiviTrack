// Mock data for development/demo when Flask backend is not connected

import type {
  Issue,
  Category,
  SummaryStats,
  CategoryStats,
  TrendData,
  Hotspot,
  IssueLocation,
} from './types'

export const mockCategories: Category[] = [
  { id: 1, name: 'Garbage', description: 'Waste management and cleanliness issues', icon: 'trash-2' },
  { id: 2, name: 'Pothole', description: 'Road damage and potholes', icon: 'circle-alert' },
  { id: 3, name: 'Water Leakage', description: 'Water supply and leakage problems', icon: 'droplets' },
  { id: 4, name: 'Streetlight', description: 'Street lighting issues', icon: 'lightbulb-off' },
  { id: 5, name: 'Drainage', description: 'Drainage and sewage problems', icon: 'waves' },
  { id: 6, name: 'Other', description: 'Other civic issues', icon: 'help-circle' },
]

export const mockIssues: Issue[] = [
  {
    id: 1,
    title: 'Large pothole on Main Street',
    description: 'There is a dangerous pothole near the traffic signal on Main Street. Multiple vehicles have been damaged.',
    category_id: 2,
    category_name: 'Pothole',
    category_icon: 'circle-alert',
    status: 'pending',
    priority: 'high',
    location_name: 'Main Street, Downtown',
    latitude: 12.9716,
    longitude: 77.5946,
    image_url: null,
    reporter_name: 'John Doe',
    reporter_email: 'john@example.com',
    auto_categorized: true,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    resolved_at: null,
  },
  {
    id: 2,
    title: 'Garbage overflow near Park',
    description: 'The garbage bins near Central Park are overflowing for the past 3 days. Bad smell and hygiene concern.',
    category_id: 1,
    category_name: 'Garbage',
    category_icon: 'trash-2',
    status: 'in_progress',
    priority: 'medium',
    location_name: 'Central Park, Sector 5',
    latitude: 12.9352,
    longitude: 77.6245,
    image_url: null,
    reporter_name: 'Jane Smith',
    reporter_email: 'jane@example.com',
    auto_categorized: true,
    created_at: '2024-01-14T14:20:00Z',
    updated_at: '2024-01-15T09:00:00Z',
    resolved_at: null,
  },
  {
    id: 3,
    title: 'Streetlight not working',
    description: 'The streetlight at the corner of 5th Avenue has not been working for a week. Safety concern at night.',
    category_id: 4,
    category_name: 'Streetlight',
    category_icon: 'lightbulb-off',
    status: 'pending',
    priority: 'medium',
    location_name: '5th Avenue, Block B',
    latitude: 12.9542,
    longitude: 77.6015,
    image_url: null,
    reporter_name: 'Mike Johnson',
    reporter_email: 'mike@example.com',
    auto_categorized: false,
    created_at: '2024-01-13T16:45:00Z',
    updated_at: '2024-01-13T16:45:00Z',
    resolved_at: null,
  },
  {
    id: 4,
    title: 'Water pipe leaking',
    description: 'Major water leakage from underground pipe. Water is flooding the street.',
    category_id: 3,
    category_name: 'Water Leakage',
    category_icon: 'droplets',
    status: 'resolved',
    priority: 'high',
    location_name: 'Green Valley Road',
    latitude: 12.9156,
    longitude: 77.6101,
    image_url: null,
    reporter_name: 'Sarah Williams',
    reporter_email: 'sarah@example.com',
    auto_categorized: true,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-12T15:30:00Z',
    resolved_at: '2024-01-12T15:30:00Z',
  },
  {
    id: 5,
    title: 'Blocked drainage causing flooding',
    description: 'The drainage near the school is completely blocked causing water logging during rain.',
    category_id: 5,
    category_name: 'Drainage',
    category_icon: 'waves',
    status: 'pending',
    priority: 'high',
    location_name: 'School Road, Sector 12',
    latitude: 12.9618,
    longitude: 77.5874,
    image_url: null,
    reporter_name: 'Robert Brown',
    reporter_email: 'robert@example.com',
    auto_categorized: true,
    created_at: '2024-01-12T11:20:00Z',
    updated_at: '2024-01-12T11:20:00Z',
    resolved_at: null,
  },
  {
    id: 6,
    title: 'Garbage pile near hospital',
    description: 'Huge garbage pile accumulated near the hospital entrance. Health hazard.',
    category_id: 1,
    category_name: 'Garbage',
    category_icon: 'trash-2',
    status: 'in_progress',
    priority: 'high',
    location_name: 'Hospital Road',
    latitude: 12.9482,
    longitude: 77.5789,
    image_url: null,
    reporter_name: 'Emily Davis',
    reporter_email: 'emily@example.com',
    auto_categorized: false,
    created_at: '2024-01-11T09:15:00Z',
    updated_at: '2024-01-14T10:00:00Z',
    resolved_at: null,
  },
  {
    id: 7,
    title: 'Multiple potholes on Highway',
    description: 'Several potholes on the highway causing traffic congestion and accidents.',
    category_id: 2,
    category_name: 'Pothole',
    category_icon: 'circle-alert',
    status: 'pending',
    priority: 'high',
    location_name: 'Ring Road, Exit 5',
    latitude: 12.9285,
    longitude: 77.6321,
    image_url: null,
    reporter_name: 'David Wilson',
    reporter_email: 'david@example.com',
    auto_categorized: true,
    created_at: '2024-01-09T07:30:00Z',
    updated_at: '2024-01-09T07:30:00Z',
    resolved_at: null,
  },
  {
    id: 8,
    title: 'Dim streetlights in residential area',
    description: 'All streetlights in our residential area are very dim. Not safe for evening walks.',
    category_id: 4,
    category_name: 'Streetlight',
    category_icon: 'lightbulb-off',
    status: 'in_progress',
    priority: 'low',
    location_name: 'Sunrise Colony',
    latitude: 12.9712,
    longitude: 77.6182,
    image_url: null,
    reporter_name: 'Lisa Anderson',
    reporter_email: 'lisa@example.com',
    auto_categorized: false,
    created_at: '2024-01-08T18:00:00Z',
    updated_at: '2024-01-13T11:00:00Z',
    resolved_at: null,
  },
]

export const mockSummaryStats: SummaryStats = {
  total_issues: 8,
  pending: 4,
  in_progress: 3,
  resolved: 1,
  resolved_today: 0,
  new_today: 1,
  avg_resolution_hours: 48,
}

export const mockCategoryStats: CategoryStats[] = [
  { id: 1, name: 'Garbage', icon: 'trash-2', count: 2, pending: 0, in_progress: 2, resolved: 0 },
  { id: 2, name: 'Pothole', icon: 'circle-alert', count: 2, pending: 2, in_progress: 0, resolved: 0 },
  { id: 3, name: 'Water Leakage', icon: 'droplets', count: 1, pending: 0, in_progress: 0, resolved: 1 },
  { id: 4, name: 'Streetlight', icon: 'lightbulb-off', count: 2, pending: 1, in_progress: 1, resolved: 0 },
  { id: 5, name: 'Drainage', icon: 'waves', count: 1, pending: 1, in_progress: 0, resolved: 0 },
  { id: 6, name: 'Other', icon: 'help-circle', count: 0, pending: 0, in_progress: 0, resolved: 0 },
]

export const mockTrends: TrendData[] = [
  { date: '2024-01-09', reported: 1, resolved: 0 },
  { date: '2024-01-10', reported: 1, resolved: 0 },
  { date: '2024-01-11', reported: 1, resolved: 0 },
  { date: '2024-01-12', reported: 1, resolved: 1 },
  { date: '2024-01-13', reported: 1, resolved: 0 },
  { date: '2024-01-14', reported: 1, resolved: 0 },
  { date: '2024-01-15', reported: 2, resolved: 0 },
]

export const mockHotspots: Hotspot[] = [
  {
    latitude: 12.9516,
    longitude: 77.5946,
    location_name: 'Downtown Area',
    issue_count: 3,
    issue_ids: [1, 3, 6],
    radius_meters: 500,
  },
  {
    latitude: 12.9452,
    longitude: 77.6145,
    location_name: 'Central District',
    issue_count: 3,
    issue_ids: [2, 4, 7],
    radius_meters: 500,
  },
]

export const mockIssueLocations: IssueLocation[] = mockIssues
  .filter((issue) => issue.latitude && issue.longitude)
  .map((issue) => ({
    id: issue.id,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    latitude: issue.latitude!,
    longitude: issue.longitude!,
    location_name: issue.location_name || '',
    category_name: issue.category_name || 'Other',
    category_icon: issue.category_icon || 'help-circle',
  }))

// Helper to simulate API delay
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Mock category keywords for auto-categorization demo
export const categoryKeywords: Record<string, string[]> = {
  'Garbage': ['garbage', 'trash', 'waste', 'litter', 'dump', 'rubbish', 'dirty', 'smell'],
  'Pothole': ['pothole', 'road', 'crack', 'hole', 'damage', 'broken road', 'uneven'],
  'Water Leakage': ['water', 'leak', 'pipe', 'burst', 'flooding', 'overflow', 'tap'],
  'Streetlight': ['light', 'lamp', 'dark', 'bulb', 'streetlight', 'not working', 'dim'],
  'Drainage': ['drain', 'sewer', 'blocked', 'clogged', 'overflow', 'gutter'],
}

// Mock auto-categorize function
export function mockCategorize(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase()
  
  let bestMatch = { category: 'Other', confidence: 0, keywords: [] as string[] }
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matched = keywords.filter((kw) => text.includes(kw))
    const confidence = Math.min(matched.length / 3, 1)
    
    if (confidence > bestMatch.confidence) {
      bestMatch = { category, confidence, keywords: matched }
    }
  }
  
  return {
    suggested_category: bestMatch.category,
    confidence: bestMatch.confidence || 0.5,
    matched_keywords: bestMatch.keywords,
  }
}

// CiviTrack TypeScript Types

export type IssueStatus = 'pending' | 'in_progress' | 'resolved'
export type IssuePriority = 'low' | 'medium' | 'high'
export type UserRole = 'user' | 'admin'

export interface Category {
  id: number
  name: string
  description: string | null
  icon: string | null
}

export interface Issue {
  id: number
  title: string
  description: string
  category_id: number | null
  category_name?: string
  category_icon?: string
  status: IssueStatus
  priority: IssuePriority
  location_name: string | null
  latitude: number | null
  longitude: number | null
  image_url: string | null
  reporter_name: string | null
  reporter_email: string | null
  auto_categorized: boolean
  created_at: string
  updated_at: string
  resolved_at: string | null
  history?: IssueHistory[]
}

export interface IssueHistory {
  id: number
  issue_id: number
  old_status: IssueStatus | null
  new_status: IssueStatus
  changed_at: string
  changed_by: string | null
}

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  created_at: string
}

export interface Hotspot {
  id?: number
  latitude: number
  longitude: number
  location_name: string
  issue_count: number
  issue_ids?: number[]
  radius_meters: number
  last_calculated?: string
}

// API Response Types
export interface IssuesResponse {
  issues: Issue[]
  total: number
  limit: number
  offset: number
}

export interface SummaryStats {
  total_issues: number
  pending: number
  in_progress: number
  resolved: number
  resolved_today: number
  new_today: number
  avg_resolution_hours: number
}

export interface CategoryStats {
  id: number
  name: string
  icon: string | null
  count: number
  pending: number
  in_progress: number
  resolved: number
}

export interface StatusStats {
  status: IssueStatus
  count: number
  high_priority: number
  medium_priority: number
  low_priority: number
}

export interface PriorityStats {
  priority: IssuePriority
  count: number
  pending: number
  in_progress: number
  resolved: number
}

export interface TrendData {
  date: string
  reported: number
  resolved: number
}

export interface WeeklyData {
  week_start: string
  reported: number
  resolved: number
}

export interface IssueLocation {
  id: number
  title: string
  status: IssueStatus
  priority: IssuePriority
  latitude: number
  longitude: number
  location_name: string
  category_name: string
  category_icon: string
}

// Smart Detection Types
export interface CategorySuggestion {
  suggested_category: string
  confidence: number
  matched_keywords: string[]
  all_matches: Record<string, { confidence: number; matched_keywords: string[] }>
}

export interface PrioritySuggestion {
  priority: IssuePriority
  matched_keywords: string[]
  confidence: number
}

export interface AnalysisResult {
  category: CategorySuggestion
  priority: PrioritySuggestion
}

// Form Types
export interface CreateIssueInput {
  title: string
  description: string
  category_id?: number
  priority?: IssuePriority
  location_name?: string
  latitude?: number
  longitude?: number
  image_url?: string
  reporter_name?: string
  reporter_email?: string
}

export interface UpdateIssueInput {
  title?: string
  description?: string
  category_id?: number
  priority?: IssuePriority
  location_name?: string
  latitude?: number
  longitude?: number
  image_url?: string
}

export interface UpdateStatusInput {
  status: IssueStatus
  changed_by?: string
}

// Filter Types
export interface IssueFilters {
  status?: IssueStatus
  category_id?: number
  priority?: IssuePriority
  search?: string
  sort_by?: 'created_at' | 'updated_at' | 'priority' | 'status' | 'title'
  sort_order?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

// CiviTrack API Client

import type {
  Issue,
  IssuesResponse,
  Category,
  Hotspot,
  SummaryStats,
  CategoryStats,
  StatusStats,
  PriorityStats,
  TrendData,
  WeeklyData,
  IssueLocation,
  CategorySuggestion,
  PrioritySuggestion,
  AnalysisResult,
  CreateIssueInput,
  UpdateIssueInput,
  UpdateStatusInput,
  IssueFilters,
} from './types'

// API Base URL - change this to your Flask backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `API Error: ${response.status}`)
  }

  return response.json()
}

// ==================== Issues API ====================

export async function getIssues(filters: IssueFilters = {}): Promise<IssuesResponse> {
  const params = new URLSearchParams()
  
  if (filters.status) params.append('status', filters.status)
  if (filters.category_id) params.append('category_id', String(filters.category_id))
  if (filters.priority) params.append('priority', filters.priority)
  if (filters.search) params.append('search', filters.search)
  if (filters.sort_by) params.append('sort_by', filters.sort_by)
  if (filters.sort_order) params.append('sort_order', filters.sort_order)
  if (filters.limit) params.append('limit', String(filters.limit))
  if (filters.offset) params.append('offset', String(filters.offset))

  const queryString = params.toString()
  return fetchAPI<IssuesResponse>(`/api/issues${queryString ? `?${queryString}` : ''}`)
}

export async function getIssue(id: number): Promise<Issue> {
  return fetchAPI<Issue>(`/api/issues/${id}`)
}

export async function createIssue(data: CreateIssueInput): Promise<Issue> {
  return fetchAPI<Issue>('/api/issues', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateIssue(id: number, data: UpdateIssueInput): Promise<Issue> {
  return fetchAPI<Issue>(`/api/issues/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function updateIssueStatus(id: number, data: UpdateStatusInput): Promise<Issue> {
  return fetchAPI<Issue>(`/api/issues/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteIssue(id: number): Promise<{ message: string }> {
  return fetchAPI<{ message: string }>(`/api/issues/${id}`, {
    method: 'DELETE',
  })
}

// ==================== Categories API ====================

export async function getCategories(): Promise<Category[]> {
  return fetchAPI<Category[]>('/api/categories')
}

// ==================== Analytics API ====================

export async function getSummaryStats(): Promise<SummaryStats> {
  return fetchAPI<SummaryStats>('/api/analytics/summary')
}

export async function getCategoryStats(): Promise<CategoryStats[]> {
  return fetchAPI<CategoryStats[]>('/api/analytics/by-category')
}

export async function getStatusStats(): Promise<StatusStats[]> {
  return fetchAPI<StatusStats[]>('/api/analytics/by-status')
}

export async function getPriorityStats(): Promise<PriorityStats[]> {
  return fetchAPI<PriorityStats[]>('/api/analytics/by-priority')
}

export async function getTrends(): Promise<TrendData[]> {
  return fetchAPI<TrendData[]>('/api/analytics/trends')
}

export async function getWeeklyStats(): Promise<WeeklyData[]> {
  return fetchAPI<WeeklyData[]>('/api/analytics/weekly')
}

export async function getHotspots(): Promise<Hotspot[]> {
  return fetchAPI<Hotspot[]>('/api/analytics/hotspots')
}

export async function refreshHotspots(): Promise<{ message: string; count: number; hotspots: Hotspot[] }> {
  return fetchAPI<{ message: string; count: number; hotspots: Hotspot[] }>('/api/analytics/hotspots/refresh', {
    method: 'POST',
  })
}

export async function getIssueLocations(): Promise<IssueLocation[]> {
  return fetchAPI<IssueLocation[]>('/api/analytics/locations')
}

// ==================== Smart Detection API ====================

export async function categorizeText(title: string, description: string): Promise<CategorySuggestion> {
  return fetchAPI<CategorySuggestion>('/api/smart/categorize', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  })
}

export async function detectPriority(title: string, description: string): Promise<PrioritySuggestion> {
  return fetchAPI<PrioritySuggestion>('/api/smart/priority', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  })
}

export async function analyzeIssue(title: string, description: string): Promise<AnalysisResult> {
  return fetchAPI<AnalysisResult>('/api/smart/analyze', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  })
}

// ==================== Health Check ====================

export async function healthCheck(): Promise<{ status: string }> {
  return fetchAPI<{ status: string }>('/api/health')
}

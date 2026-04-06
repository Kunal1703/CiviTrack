'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { CategoryStats, StatusStats } from '@/lib/types'

interface CategoryChartProps {
  data: CategoryStats[]
}

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--muted-foreground)',
]

export function CategoryBarChart({ data }: CategoryChartProps) {
  const chartData = data
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.name,
      total: item.count,
      pending: item.pending,
      inProgress: item.in_progress,
      resolved: item.resolved,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issues by Category</CardTitle>
        <CardDescription>Distribution of issues across categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="var(--muted-foreground)"
                fontSize={12}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface StatusPieChartProps {
  data: StatusStats[]
}

export function StatusPieChart({ data }: StatusPieChartProps) {
  const chartData = data.map((item) => ({
    name: item.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    value: item.count,
    status: item.status,
  }))

  const statusColors: Record<string, string> = {
    pending: 'var(--status-pending)',
    in_progress: 'var(--status-in-progress)',
    resolved: 'var(--status-resolved)',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issues by Status</CardTitle>
        <CardDescription>Current status breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={statusColors[entry.status]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

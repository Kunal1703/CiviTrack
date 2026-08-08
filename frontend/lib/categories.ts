import {
  Flame,
  Volume2,
  Car,
  CarFront,
  Building2,
  Store,
  Zap,
  TriangleAlert,
  Tent,
  Droplets,
  ShieldAlert,
  Bug,
  Trash2,
  Waves,
  Construction,
  Lightbulb,
  Trees,
  PawPrint,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react'

/**
 * The canonical complaint taxonomy — reconciled to the DistilBERT model's 19
 * labels (ml/data/category_taxonomy.yaml). This is the single source of truth
 * for category display across the app (form, dashboard, admin).
 */
export interface CategoryMeta {
  name: string
  Icon: LucideIcon
  color: string
}

export const CATEGORIES: CategoryMeta[] = [
  { name: 'Heat/Hot Water', Icon: Flame, color: '#f97316' },
  { name: 'Noise', Icon: Volume2, color: '#8b5cf6' },
  { name: 'Illegal Parking', Icon: Car, color: '#ef4444' },
  { name: 'Abandoned/Derelict Vehicle', Icon: CarFront, color: '#f43f5e' },
  { name: 'Plumbing/Water', Icon: Droplets, color: '#3b82f6' },
  { name: 'Sanitation', Icon: Trash2, color: '#84cc16' },
  { name: 'Building/Apartment Condition', Icon: Building2, color: '#a855f7' },
  { name: 'Electrical/Elevator', Icon: Zap, color: '#eab308' },
  { name: 'Street Condition', Icon: Construction, color: '#f59e0b' },
  { name: 'Street Light', Icon: Lightbulb, color: '#facc15' },
  { name: 'Sewer', Icon: Waves, color: '#0ea5e9' },
  { name: 'Rodent/Pest', Icon: Bug, color: '#65a30d' },
  { name: 'Tree', Icon: Trees, color: '#22c55e' },
  { name: 'Homeless/Encampment', Icon: Tent, color: '#14b8a6' },
  { name: 'Environmental Hazard', Icon: TriangleAlert, color: '#dc2626' },
  { name: 'Public Safety', Icon: ShieldAlert, color: '#e11d48' },
  { name: 'Animal', Icon: PawPrint, color: '#d97706' },
  { name: 'Business/Consumer', Icon: Store, color: '#6366f1' },
  { name: 'Other', Icon: CircleHelp, color: '#64748b' },
]

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name)

export const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.name, c]),
)

export function getCategory(name?: string | null): CategoryMeta {
  return (name ? CATEGORY_MAP[name] : undefined) ?? CATEGORY_MAP['Other']
}

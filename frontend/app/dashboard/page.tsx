import { redirect } from 'next/navigation'

// The old mock analytics dashboard is retired. Operational analytics now live in
// the admin area (/admin/analytics); citizens have their own home (/citizen).
export default function DashboardRedirect() {
  redirect('/')
}

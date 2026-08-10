import { redirect } from 'next/navigation'

// The public report flow moved into the role-based citizen area.
export default function ReportRedirect() {
  redirect('/citizen/report')
}

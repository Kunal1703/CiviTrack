import { redirect } from 'next/navigation'

// The old public mock issues list is retired. Community issues now live on the
// citizen "Nearby" map and the admin issue queue.
export default function IssuesRedirect() {
  redirect('/')
}

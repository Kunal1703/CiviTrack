/** @type {import('next').NextConfig} */

// Proxy /api/* to the FastAPI gateway (avoids CORS in dev; same-origin from the
// browser). Override the target with GATEWAY_URL in the environment.
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${GATEWAY_URL}/api/:path*` },
    ]
  },
}

export default nextConfig

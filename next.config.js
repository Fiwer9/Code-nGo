/** @type {import('next').NextConfig} */
const API_ORIGIN = process.env.API_PROXY_TARGET || 'http://31.76.44.247:8000'

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${API_ORIGIN}/:path*`
      }
    ]
  }
}
module.exports = nextConfig
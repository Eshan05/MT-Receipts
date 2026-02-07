import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  allowedDevOrigins: ['*'],
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  images: {
    qualities: [100, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['skia-canvas', '@loskir/styled-qr-code-node'],
  outputFileTracingIncludes: {
    '/api/receipts/[receiptNumber]': [
      'node_modules/@resvg/resvg-wasm/index_bg.wasm',
      'node_modules/.pnpm/@resvg+resvg-wasm@*/node_modules/@resvg/resvg-wasm/index_bg.wasm',
    ],
    '/api/receipts/[receiptNumber]/emails': [
      'node_modules/@resvg/resvg-wasm/index_bg.wasm',
      'node_modules/.pnpm/@resvg+resvg-wasm@*/node_modules/@resvg/resvg-wasm/index_bg.wasm',
    ],
    '/api/receipts/emails': [
      'node_modules/@resvg/resvg-wasm/index_bg.wasm',
      'node_modules/.pnpm/@resvg+resvg-wasm@*/node_modules/@resvg/resvg-wasm/index_bg.wasm',
    ],
  },
}

export default nextConfig

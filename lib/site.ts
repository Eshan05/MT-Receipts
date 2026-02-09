export type SiteConfig = {
  name: string
  description: string
  author: {
    name: string
    url?: string
  }
  url: string
}

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const withProtocol = vercel.startsWith('http')
      ? vercel
      : `https://${vercel}`
    return withProtocol.replace(/\/$/, '')
  }

  return 'http://localhost:3000'
}

export const siteConfig: SiteConfig = {
  name: 'Acquittance',
  description: 'Generate, email, and verify receipts with your team.',
  author: {
    name: 'Eshan',
    url: 'https://github.com/Eshan05',
  },
  url: resolveSiteUrl(),
}

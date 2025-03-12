import { GetServerSidePropsContext } from 'next'

export function getClientDetails(context: GetServerSidePropsContext) {
  const { req } = context // From share
  let clientIp = ''

  if (req.headers['x-real-ip']) {
    clientIp = req.headers['x-real-ip'].toString()
  } else if (
    req.headers['x-vercel-forwarded-for'] ||
    req.headers['x-forwarded-for']
  ) {
    const forwarded =
      req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for']

    if (typeof forwarded === 'string') {
      clientIp = forwarded.split(',')[0].trim()
    } else if (Array.isArray(forwarded) && typeof forwarded[0] === 'string') {
      clientIp = (forwarded[0] as string)?.trim()
    }
  } else {
    clientIp = req.socket.remoteAddress || ''
  }

  // Handle IPv6
  if (clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.slice(7)
  }

  const userAgent = req.headers['user-agent'] || 'Unknown'
  const referrer = req.headers['referer'] || 'Direct'

  return {
    clientIp,
    userAgent,
    referrer,
  }
}

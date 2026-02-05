import { redirect } from 'next/navigation'

export default function OrgRootPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  return params.then(({ slug }) => {
    redirect(`/${slug}/dashboard`)
  })
}

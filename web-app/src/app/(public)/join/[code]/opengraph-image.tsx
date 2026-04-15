import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getGangByInviteCode } from '@/lib/dal/gangs'

export const alt = 'Join a Gang on Bragg'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const gangPromise = getGangByInviteCode(code).catch(() => null)
  const [logoData, gang] = await Promise.all([
    readFile(join(process.cwd(), 'public/logo.png')),
    gangPromise,
  ])
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`

  const headline = gang ? gang.name : 'Join a Gang'
  const tagline = gang
    ? "You've been invited to join"
    : 'Predict right. Prove it.'

  return new ImageResponse(
    (
      <div
        style={{
          background: '#111111',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
        }}
      >
        {/* Logo mark */}
        <img
          src={logoSrc}
          width={96}
          height={96}
          alt=""
          style={{ objectFit: 'contain' }}
        />

        {/* Tagline above headline */}
        <div
          style={{
            color: '#777777',
            fontSize: 24,
            letterSpacing: '3px',
            textTransform: 'uppercase' as const,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {tagline}
        </div>

        {/* Gang name / headline */}
        <div
          style={{
            color: '#c8e64a',
            fontSize: headline.length > 20 ? 64 : 80,
            fontWeight: 800,
            letterSpacing: '-2px',
            lineHeight: 1,
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            maxWidth: '80%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {headline}
        </div>

        {/* CTA */}
        <div
          style={{
            color: '#999999',
            fontSize: 22,
            fontFamily: 'system-ui, sans-serif',
            marginTop: 8,
          }}
        >
          bragg.app
        </div>

        {/* Bottom lime bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#c8e64a',
          }}
        />
      </div>
    ),
    { ...size },
  )
}

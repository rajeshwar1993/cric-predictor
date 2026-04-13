import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const alt = 'Bragg — Predict Right. Prove It.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), 'public/logo.png'))
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`

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
          gap: 20,
          position: 'relative',
        }}
      >
        {/* Logo mark */}
        <img src={logoSrc} width={128} height={128} alt="" style={{ objectFit: 'contain' }} />

        {/* Wordmark */}
        <div
          style={{
            color: '#c8e64a',
            fontSize: 112,
            fontWeight: 800,
            letterSpacing: '-3px',
            lineHeight: 1,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          BRAGG
        </div>

        {/* Tagline */}
        <div
          style={{
            color: '#777777',
            fontSize: 26,
            letterSpacing: '3px',
            textTransform: 'uppercase' as const,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Predict Right. Prove It.
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

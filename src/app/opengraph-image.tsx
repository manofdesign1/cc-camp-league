import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'CC Camp League — AI Native Camp 리더보드';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#121212',
          backgroundImage: 'radial-gradient(circle at 25% 25%, #6366f120 0%, transparent 50%), radial-gradient(circle at 75% 75%, #6366f120 0%, transparent 50%)',
        }}
      >
        {/* Logo and Title */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" style={{ marginRight: 20 }}>
            <rect x="3" y="14" width="5" height="7" rx="1" fill="#6366f1" opacity="0.5"/>
            <rect x="9.5" y="8" width="5" height="13" rx="1" fill="#6366f1" opacity="0.75"/>
            <rect x="16" y="3" width="5" height="18" rx="1" fill="#6366f1"/>
          </svg>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#fafafa',
              margin: 0,
            }}
          >
            CC Camp League
          </h1>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 36,
            color: '#a1a1aa',
            margin: '0 40px',
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          AI Native Camp 리더보드
        </p>

        {/* Tagline */}
        <p
          style={{
            fontSize: 24,
            color: '#71717a',
            margin: '20px 40px 0',
            textAlign: 'center',
          }}
        >
          더 많이 쓰는 사람이 더 빠르게 성장합니다
        </p>

        {/* Command */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 60,
            padding: '20px 40px',
            backgroundColor: '#1e1e1e',
            borderRadius: 12,
            border: '1px solid #2e2e2e',
          }}
        >
          <span style={{ fontSize: 28, color: '#a1a1aa' }}>$</span>
          <span style={{ fontSize: 28, color: '#6366f1', fontFamily: 'monospace' }}>npx cc-camp</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

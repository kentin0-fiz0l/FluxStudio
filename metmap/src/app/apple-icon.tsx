import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2a2a2f',
        }}
      >
        {/* Metronome shape */}
        <svg
          width="130"
          height="150"
          viewBox="0 0 140 160"
          style={{ position: 'absolute' }}
        >
          {/* Triangle body */}
          <path d="M70 10 L120 150 L20 150 Z" fill="#c9a962" />
          {/* Pendulum arm */}
          <line
            x1="70"
            y1="30"
            x2="100"
            y2="70"
            stroke="#f5f0e6"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Weight */}
          <circle cx="100" cy="70" r="12" fill="#f5f0e6" />
          {/* Base */}
          <rect x="15" y="140" width="110" height="12" rx="3" fill="#d4a056" />
        </svg>
      </div>
    ),
    { ...size }
  );
}

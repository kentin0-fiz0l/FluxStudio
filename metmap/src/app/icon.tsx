import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  // Pulse Prism brand colors
  const midnight = '#0E1020';
  const mint = '#3EF2C8';
  const violet = '#8B5CF6';
  const coral = '#FF5A70';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: midnight,
          borderRadius: '32px',
        }}
      >
        <svg
          width="160"
          height="160"
          viewBox="0 0 500 500"
          fill="none"
        >
          {/* Coral offset layer (back) */}
          <path
            d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
            stroke={coral}
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(4, 4)"
            opacity="0.6"
          />

          {/* Violet offset layer (middle) */}
          <path
            d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
            stroke={violet}
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(-2, -2)"
            opacity="0.7"
          />

          {/* Mint main stroke (front) */}
          <path
            d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
            stroke={mint}
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}

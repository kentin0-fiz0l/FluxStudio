import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  // MetMap logo colors - Cyan with Pink chromatic aberration
  const midnight = '#0E1020';
  const cyan = '#4CC9F0';
  const pink = '#FF4DA6';

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
          {/* Pink chromatic offset layer (back) */}
          <path
            d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
            stroke={pink}
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(4, 4)"
            opacity="0.7"
          />

          {/* Cyan main stroke (front) */}
          <path
            d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
            stroke={cyan}
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

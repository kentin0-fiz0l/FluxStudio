import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: '32px',
        }}
      >
        <svg
          width="160"
          height="160"
          viewBox="0 0 500 500"
          fill="none"
        >
          {/* Pink/Magenta offset layer (chromatic aberration) */}
          <path
            d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
            stroke="#FF69B4"
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(-3, -3)"
            opacity="0.7"
          />

          {/* Cyan offset layer (chromatic aberration) */}
          <path
            d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
            stroke="#00CED1"
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(3, 3)"
            opacity="0.7"
          />

          {/* Main cyan/blue stroke */}
          <path
            d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
            stroke="#00BFFF"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}

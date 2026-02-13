// React import not needed with JSX transform

interface Logo3DProps {
  variant?: 'light' | 'dark';
}

export function Logo3D({ variant = 'dark' }: Logo3DProps) {
  const textColor = variant === 'dark' ? 'rgb(248, 248, 248)' : 'rgb(15, 23, 42)';
  const shadowColor = variant === 'dark' ? 'rgba(248, 248, 248, 0.25)' : 'rgba(15, 23, 42, 0.25)';

  return (
    <div className="flex flex-col items-center space-y-1 sm:space-y-2" style={{ perspective: '800px' }}>
      {/* FLUX */}
      <div className="flex text-6xl justify-center" style={{ perspective: '1000px' }}>
        {['F', 'L', 'U', 'X'].map((letter) => (
          <div
            key={`flux-${letter}`}
            className="relative inline-block"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateX(25deg) rotateY(-15deg)',
              marginRight: '0.02em',
            }}
          >
            <div
              className="relative z-20 font-black"
              style={{
                color: textColor,
                fontSize: 'inherit',
                lineHeight: 'inherit',
                fontFamily: 'Outfit, sans-serif',
                textShadow: `${shadowColor} 0px 0px 20px`,
              }}
            >
              {letter}
            </div>
            {/* Create depth layers with animated gradient */}
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 left-0 font-black"
                style={{
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Outfit, sans-serif',
                  transform: `translateZ(-${i + 1}px) translateX(${(i + 1) * 0.125}px) translateY(${(i + 1) * 0.125}px)`,
                  opacity: 1 - (i + 1) * 0.04,
                  zIndex: 19 - i,
                  background: 'linear-gradient(45deg, #60A5FA, #A78BFA, #06B6D4, #8B5CF6)',
                  backgroundSize: '300% 300%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'gradientShift 3s ease-in-out infinite',
                }}
              >
                {letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* STUDIO */}
      <div className="flex text-4xl justify-center">
        {['S', 'T', 'U', 'D', 'I', 'O'].map((letter) => (
          <div
            key={`studio-${letter}`}
            className="font-black"
            style={{
              fontSize: 'inherit',
              lineHeight: 'inherit',
              fontFamily: 'Outfit, sans-serif',
              marginRight: '0.15em',
              background: 'linear-gradient(45deg, #8B5CF6, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {letter}
          </div>
        ))}
      </div>
    </div>
  );
}
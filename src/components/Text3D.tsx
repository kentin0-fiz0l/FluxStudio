interface Text3DProps {
  text: string;
  className?: string;
  depth?: number;
  color?: string;
  shadowColor?: string;
}

export function Text3D({ 
  text, 
  className = "", 
  depth = 8, 
  color = "#f8f8f8",
  shadowColor = "#1a1a1a"
}: Text3DProps) {
  const letters = text.split('');
  
  return (
    <div className={`flex ${className}`} style={{ perspective: '1000px' }}>
      {letters.map((letter, index) => (
        <div
          key={index}
          className="relative inline-block"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(25deg) rotateY(-15deg)',
            marginRight: letter === ' ' ? '0.5em' : '0.02em'
          }}
        >
          {letter === ' ' ? (
            <div style={{ width: '0.3em' }} />
          ) : (
            <>
              {/* Front face */}
              <div
                className="relative z-20 font-black"
                style={{
                  color: color,
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, "Space Grotesk", sans-serif',
                  textShadow: `0 0 20px ${color}40`
                }}
              >
                {letter}
              </div>
              
              {/* 3D depth layers */}
              {[...Array(depth)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 left-0 font-black"
                  style={{
                    color: shadowColor,
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    fontFamily: 'Orbitron, "Space Grotesk", sans-serif',
                    transform: `translateZ(-${i + 1}px) translateX(${i * 0.5}px) translateY(${i * 0.5}px)`,
                    opacity: Math.max(0.1, 1 - (i * 0.15)),
                    zIndex: 19 - i
                  }}
                >
                  {letter}
                </div>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
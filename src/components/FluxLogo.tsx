interface FluxLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FluxLogo({ className = "", size = 'md' }: FluxLogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  const fluxSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`text-3d-container transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}>
      <div className="flex items-center space-x-3" style={{ perspective: '800px' }}>
        {/* FLUX */}
        <div className={`flex ${fluxSizeClasses[size]} justify-center`} style={{ perspective: '1000px' }}>
          {['F', 'L', 'U', 'X'].map((letter, index) => (
            <div
              key={index}
              className="relative inline-block"
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateX(25deg) rotateY(-15deg)',
                marginRight: '0.02em'
              }}
            >
              <div
                className="relative z-20 font-black"
                style={{
                  color: 'rgb(248, 248, 248)',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, sans-serif',
                  textShadow: 'rgba(248, 248, 248, 0.25) 0px 0px 20px'
                }}
              >
                {letter}
              </div>
              <div
                className="absolute top-0 left-0 font-black"
                style={{
                  color: 'rgb(26, 26, 26)',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, sans-serif',
                  transform: 'translateZ(-1px) translateX(0px) translateY(0px)',
                  opacity: 1,
                  zIndex: 19
                }}
              >
                {letter}
              </div>
              <div
                className="absolute top-0 left-0 font-black"
                style={{
                  color: 'rgb(26, 26, 26)',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, sans-serif',
                  transform: 'translateZ(-2px) translateX(0.5px) translateY(0.5px)',
                  opacity: 0.85,
                  zIndex: 18
                }}
              >
                {letter}
              </div>
              <div
                className="absolute top-0 left-0 font-black"
                style={{
                  color: 'rgb(26, 26, 26)',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, sans-serif',
                  transform: 'translateZ(-3px) translateX(1px) translateY(1px)',
                  opacity: 0.7,
                  zIndex: 17
                }}
              >
                {letter}
              </div>
              <div
                className="absolute top-0 left-0 font-black"
                style={{
                  color: 'rgb(26, 26, 26)',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, sans-serif',
                  transform: 'translateZ(-4px) translateX(1.5px) translateY(1.5px)',
                  opacity: 0.55,
                  zIndex: 16
                }}
              >
                {letter}
              </div>
            </div>
          ))}
        </div>

        {/* STUDIO */}
        <div className={`flex ${sizeClasses[size]} justify-center`} style={{ perspective: '1000px' }}>
          {['S', 'T', 'U', 'D', 'I', 'O'].map((letter, index) => (
            <div
              key={index}
              className="relative inline-block"
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateX(25deg) rotateY(-15deg)',
                marginRight: '0.02em'
              }}
            >
              <div
                className="relative z-20 font-black"
                style={{
                  color: 'rgb(248, 248, 248)',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, sans-serif',
                  textShadow: 'rgba(248, 248, 248, 0.25) 0px 0px 20px'
                }}
              >
                {letter}
              </div>
              <div
                className="absolute top-0 left-0 font-black"
                style={{
                  color: 'rgb(26, 26, 26)',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, sans-serif',
                  transform: 'translateZ(-1px) translateX(0px) translateY(0px)',
                  opacity: 1,
                  zIndex: 19
                }}
              >
                {letter}
              </div>
              <div
                className="absolute top-0 left-0 font-black"
                style={{
                  color: 'rgb(26, 26, 26)',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, sans-serif',
                  transform: 'translateZ(-2px) translateX(0.5px) translateY(0.5px)',
                  opacity: 0.85,
                  zIndex: 18
                }}
              >
                {letter}
              </div>
              <div
                className="absolute top-0 left-0 font-black"
                style={{
                  color: 'rgb(26, 26, 26)',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, sans-serif',
                  transform: 'translateZ(-3px) translateX(1px) translateY(1px)',
                  opacity: 0.7,
                  zIndex: 17
                }}
              >
                {letter}
              </div>
              <div
                className="absolute top-0 left-0 font-black"
                style={{
                  color: 'rgb(26, 26, 26)',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  fontFamily: 'Orbitron, sans-serif',
                  transform: 'translateZ(-4px) translateX(1.5px) translateY(1.5px)',
                  opacity: 0.55,
                  zIndex: 16
                }}
              >
                {letter}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
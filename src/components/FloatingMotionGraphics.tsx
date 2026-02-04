import { useEffect, useState, useMemo } from 'react';

export function FloatingMotionGraphics() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrolled / maxScroll, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update time for animations at 60fps
  useEffect(() => {
    let animationId: number;
    const updateTime = () => {
      setCurrentTime(Date.now());
      animationId = requestAnimationFrame(updateTime);
    };
    animationId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Define motion characteristics based on scroll sections with 3D star objects and geometric shapes
  const getMotionCharacteristics = (progress: number) => {
    if (progress < 0.15) {
      // Hero Section - Bright and energetic 3D stars
      return {
        elements: ['star-5point', 'star-burst', 'cube', 'star-3d'],
        colors: ['#FCD34D', '#EC4899', '#FCD34D', '#EC4899'],
        speed: 'slow',
        interaction: 'gentle',
        density: 'sparse'
      };
    } else if (progress < 0.3) {
      // About Section - Creative and thoughtful 3D stars
      return {
        elements: ['star-spiral', 'pyramid', 'star-5point', 'diamond'],
        colors: ['#EC4899', '#8B5CF6', '#EC4899', '#8B5CF6'],
        speed: 'medium',
        interaction: 'formation',
        density: 'medium'
      };
    } else if (progress < 0.5) {
      // Work Section - Achievement and excellence 3D stars
      return {
        elements: ['star-3d', 'cube', 'star-burst', 'octahedron'],
        colors: ['#8B5CF6', '#06B6D4', '#8B5CF6', '#06B6D4'],
        speed: 'medium',
        interaction: 'technical',
        density: 'medium'
      };
    } else if (progress < 0.7) {
      // Services/Creative - Dynamic and innovative 3D stars
      return {
        elements: ['star-spiral', 'dodecahedron', 'star-3d', 'sphere'],
        colors: ['#06B6D4', '#10B981', '#06B6D4', '#FCD34D'],
        speed: 'fast',
        interaction: 'dynamic',
        density: 'dense'
      };
    } else {
      // Process/Contact - Flowing and connected 3D stars
      return {
        elements: ['star-burst', 'torus', 'star-5point', 'crystal'],
        colors: ['#10B981', '#FCD34D', '#EC4899', '#8B5CF6'],
        speed: 'slow',
        interaction: 'flowing',
        density: 'sparse'
      };
    }
  };

  const characteristics = getMotionCharacteristics(scrollProgress);

  // Get animation properties based on characteristics
  const getAnimationProps = (type: string) => {
    const baseProps = {
      slow: { duration: '15s', scale: 1 },
      medium: { duration: '8s', scale: 1.2 },
      fast: { duration: '4s', scale: 1.5 }
    };
    return baseProps[type as keyof typeof baseProps] || baseProps.medium;
  };

  const getInteractionStyle = (interaction: string, index: number) => {
    // Enhanced 3D movement patterns
    const time = currentTime * 0.001;
    switch (interaction) {
      case 'gentle':
        return {
          transform: `translate3d(${Math.sin(time + index) * 20}px, ${Math.cos(time + index) * 15}px, ${Math.sin(time * 0.5 + index) * 10}px) rotateX(${Math.sin(time * 0.3 + index) * 15}deg) rotateY(${Math.cos(time * 0.2 + index) * 20}deg)`
        };
      case 'formation':
        return {
          transform: `rotateZ(${index * 45}deg) translate3d(${Math.sin(time * 2) * 30}px, 0, ${Math.cos(time + index) * 15}px) rotateX(${time * 10 + index * 30}deg) rotateY(${time * 15}deg)`
        };
      case 'technical':
        return {
          transform: `translate3d(${Math.sin(time * 3 + index) * 10}px, ${Math.cos(time * 2 + index) * 25}px, ${Math.sin(time + index) * 8}px) rotateX(${time * 50 + index * 90}deg) rotateY(${time * 30}deg) rotateZ(${time * 20}deg)`
        };
      case 'dynamic':
        return {
          transform: `scale3d(${1 + Math.sin(time * 4 + index) * 0.3}, ${1 + Math.cos(time * 3 + index) * 0.2}, ${1 + Math.sin(time * 2 + index) * 0.1}) rotateX(${time * 100 + index * 60}deg) rotateY(${time * 80}deg) rotateZ(${time * 60}deg)`
        };
      case 'flowing':
        return {
          transform: `translate3d(${Math.sin(time + index) * 40}px, ${Math.sin(time * 1.5 + index) * 20}px, ${Math.cos(time * 0.8 + index) * 12}px) rotateX(${Math.sin(time * 0.5 + index) * 25}deg) rotateY(${Math.cos(time * 0.7 + index) * 30}deg)`
        };
      default:
        return {};
    }
  };

  const renderElement = (element: string, size: number, color: string, opacity: number, index: number) => {
    const animProps = getAnimationProps(characteristics.speed);
    const baseSize = Math.max(16, Math.round(size * animProps.scale));
    
    const elementComponent = (() => {
      // Check if it's an emoji
      if (/[\u{1F300}-\u{1F9FF}]/u.test(element)) {
        return (
          <div
            className="select-none"
            style={{
              fontSize: `${baseSize}px`,
              textShadow: 'none',
              filter: 'none',
              background: 'transparent',
              transform: 'perspective(100px) rotateX(5deg)',
              animation: `emoji-bounce ${animProps.duration} ease-in-out infinite`
            }}
          >
            {element}
          </div>
        );
      }

      // 3D Geometric shapes
      switch (element) {
        case 'cube':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `formation-shift ${animProps.duration} ease-in-out infinite`
              }}
            >
              {/* Front face */}
              <div
                className="absolute"
                style={{
                  width: baseSize,
                  height: baseSize,
                  background: color,
                  transform: `translateZ(${baseSize/2}px)`,
                  border: `1px solid ${color}88`
                }}
              />
              {/* Right face */}
              <div
                className="absolute"
                style={{
                  width: baseSize,
                  height: baseSize,
                  background: `linear-gradient(45deg, ${color}AA, ${color}66)`,
                  transform: `rotateY(90deg) translateZ(${baseSize/2}px)`,
                  border: `1px solid ${color}66`
                }}
              />
              {/* Top face */}
              <div
                className="absolute"
                style={{
                  width: baseSize,
                  height: baseSize,
                  background: `linear-gradient(180deg, ${color}CC, ${color}88)`,
                  transform: `rotateX(90deg) translateZ(${baseSize/2}px)`,
                  border: `1px solid ${color}44`
                }}
              />
            </div>
          );
        
        case 'pyramid':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `morph ${animProps.duration} ease-in-out infinite`
              }}
            >
              <svg width={baseSize} height={baseSize} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                <defs>
                  <linearGradient id={`pyramidGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.6 }} />
                  </linearGradient>
                </defs>
                <polygon
                  points={`${baseSize/2},4 ${baseSize-4},${baseSize-4} 4,${baseSize-4}`}
                  fill={`url(#pyramidGrad-${index})`}
                  stroke={color}
                  strokeWidth="1"
                />
              </svg>
            </div>
          );
        
        case 'diamond':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `drift ${animProps.duration} ease-in-out infinite`
              }}
            >
              <div
                style={{
                  width: baseSize,
                  height: baseSize,
                  background: `linear-gradient(45deg, ${color}, ${color}88, ${color}CC)`,
                  transform: 'rotateZ(45deg)',
                  borderRadius: '8px',
                  boxShadow: `
                    0 0 20px ${color}40,
                    inset 2px 2px 4px rgba(255,255,255,0.2),
                    inset -2px -2px 4px rgba(0,0,0,0.2)
                  `
                }}
              />
            </div>
          );
        
        case 'octahedron':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `formation-shift ${animProps.duration} ease-in-out infinite`
              }}
            >
              <svg width={baseSize} height={baseSize} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                <defs>
                  <linearGradient id={`octaGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: color, stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.6 }} />
                  </linearGradient>
                </defs>
                <polygon
                  points={`${baseSize/2},2 ${baseSize-2},${baseSize/2} ${baseSize/2},${baseSize-2} 2,${baseSize/2}`}
                  fill={`url(#octaGrad-${index})`}
                  stroke={color}
                  strokeWidth="1"
                />
              </svg>
            </div>
          );
        
        case 'dodecahedron':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `morph ${animProps.duration} ease-in-out infinite`
              }}
            >
              <svg width={baseSize} height={baseSize} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                <defs>
                  <radialGradient id={`dodecaGrad-${index}`}>
                    <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.6 }} />
                  </radialGradient>
                </defs>
                <polygon
                  points={`${baseSize/2},2 ${baseSize-4},${baseSize*0.2} ${baseSize-4},${baseSize*0.8} ${baseSize/2},${baseSize-2} 4,${baseSize*0.8} 4,${baseSize*0.2}`}
                  fill={`url(#dodecaGrad-${index})`}
                  stroke={color}
                  strokeWidth="1"
                />
              </svg>
            </div>
          );
        
        case 'sphere':
          return (
            <div
              style={{
                width: baseSize,
                height: baseSize,
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${color}FF, ${color}AA, ${color}66)`,
                boxShadow: `
                  0 0 20px ${color}40,
                  inset 3px 3px 6px rgba(255,255,255,0.3),
                  inset -3px -3px 6px rgba(0,0,0,0.3)
                `,
                animation: `pulse-glow ${animProps.duration} ease-in-out infinite`
              }}
            />
          );
        
        case 'torus':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `drift ${animProps.duration} ease-in-out infinite`
              }}
            >
              <svg width={baseSize} height={baseSize} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                <defs>
                  <radialGradient id={`torusGrad-${index}`}>
                    <stop offset="0%" style={{ stopColor: 'transparent' }} />
                    <stop offset="40%" style={{ stopColor: color, stopOpacity: 0.8 }} />
                    <stop offset="60%" style={{ stopColor: color, stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.6 }} />
                  </radialGradient>
                </defs>
                <circle
                  cx={baseSize/2}
                  cy={baseSize/2}
                  r={baseSize/2 - 2}
                  fill="none"
                  stroke={`url(#torusGrad-${index})`}
                  strokeWidth="6"
                />
              </svg>
            </div>
          );
        
        case 'crystal':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `formation-shift ${animProps.duration} ease-in-out infinite`
              }}
            >
              <svg width={baseSize} height={baseSize} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                <defs>
                  <linearGradient id={`crystalGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
                    <stop offset="30%" style={{ stopColor: color, stopOpacity: 0.9 }} />
                    <stop offset="70%" style={{ stopColor: color, stopOpacity: 0.7 }} />
                    <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.5 }} />
                  </linearGradient>
                </defs>
                <polygon
                  points={`${baseSize/2},2 ${baseSize*0.8},${baseSize*0.3} ${baseSize*0.8},${baseSize*0.7} ${baseSize/2},${baseSize-2} ${baseSize*0.2},${baseSize*0.7} ${baseSize*0.2},${baseSize*0.3}`}
                  fill={`url(#crystalGrad-${index})`}
                  stroke={color}
                  strokeWidth="1"
                />
              </svg>
            </div>
          );

        case 'star-5point':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `spin3d ${animProps.duration} linear infinite`
              }}
            >
              <svg width={baseSize} height={baseSize} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
                <defs>
                  <linearGradient id={`star5Grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: color, stopOpacity: 0.9 }} />
                    <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.7 }} />
                  </linearGradient>
                </defs>
                <polygon
                  points={`${baseSize/2},2 ${baseSize*0.6},${baseSize*0.35} ${baseSize-2},${baseSize*0.35} ${baseSize*0.7},${baseSize*0.6} ${baseSize*0.8},${baseSize-2} ${baseSize/2},${baseSize*0.75} ${baseSize*0.2},${baseSize-2} ${baseSize*0.3},${baseSize*0.6} 2,${baseSize*0.35} ${baseSize*0.4},${baseSize*0.35}`}
                  fill={`url(#star5Grad-${index})`}
                  stroke={color}
                  strokeWidth="1"
                />
              </svg>
            </div>
          );

        case 'star-burst':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `pulse-glow ${animProps.duration} ease-in-out infinite`
              }}
            >
              <svg width={baseSize} height={baseSize} style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}>
                <defs>
                  <radialGradient id={`starBurstGrad-${index}`}>
                    <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
                    <stop offset="70%" style={{ stopColor: color, stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.3 }} />
                  </radialGradient>
                </defs>
                {/* Central star */}
                <polygon
                  points={`${baseSize/2},4 ${baseSize*0.55},${baseSize*0.4} ${baseSize*0.9},${baseSize*0.4} ${baseSize*0.65},${baseSize*0.55} ${baseSize*0.75},${baseSize*0.9} ${baseSize/2},${baseSize*0.7} ${baseSize*0.25},${baseSize*0.9} ${baseSize*0.35},${baseSize*0.55} ${baseSize*0.1},${baseSize*0.4} ${baseSize*0.45},${baseSize*0.4}`}
                  fill={`url(#starBurstGrad-${index})`}
                  stroke={color}
                  strokeWidth="0.5"
                />
                {/* Burst rays */}
                {[...Array(8)].map((_, rayIndex) => (
                  <line
                    key={rayIndex}
                    x1={baseSize/2}
                    y1={baseSize/2}
                    x2={baseSize/2 + Math.cos(rayIndex * Math.PI / 4) * baseSize * 0.4}
                    y2={baseSize/2 + Math.sin(rayIndex * Math.PI / 4) * baseSize * 0.4}
                    stroke={color}
                    strokeWidth="1"
                    opacity="0.6"
                  />
                ))}
              </svg>
            </div>
          );

        case 'star-3d':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `float3d ${animProps.duration} ease-in-out infinite`
              }}
            >
              {/* Front face of 3D star */}
              <div
                className="absolute"
                style={{
                  width: baseSize,
                  height: baseSize,
                  transform: `translateZ(${baseSize/6}px)`,
                  transformStyle: 'preserve-3d'
                }}
              >
                <svg width={baseSize} height={baseSize} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                  <defs>
                    <linearGradient id={`star3dFrontGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.8 }} />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`${baseSize/2},2 ${baseSize*0.6},${baseSize*0.35} ${baseSize-2},${baseSize*0.35} ${baseSize*0.7},${baseSize*0.6} ${baseSize*0.8},${baseSize-2} ${baseSize/2},${baseSize*0.75} ${baseSize*0.2},${baseSize-2} ${baseSize*0.3},${baseSize*0.6} 2,${baseSize*0.35} ${baseSize*0.4},${baseSize*0.35}`}
                    fill={`url(#star3dFrontGrad-${index})`}
                    stroke={color}
                    strokeWidth="1"
                  />
                </svg>
              </div>
              {/* Back face of 3D star */}
              <div
                className="absolute"
                style={{
                  width: baseSize,
                  height: baseSize,
                  transform: `translateZ(-${baseSize/6}px)`,
                  transformStyle: 'preserve-3d'
                }}
              >
                <svg width={baseSize} height={baseSize}>
                  <defs>
                    <linearGradient id={`star3dBackGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.6 }} />
                      <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.4 }} />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`${baseSize/2},2 ${baseSize*0.6},${baseSize*0.35} ${baseSize-2},${baseSize*0.35} ${baseSize*0.7},${baseSize*0.6} ${baseSize*0.8},${baseSize-2} ${baseSize/2},${baseSize*0.75} ${baseSize*0.2},${baseSize-2} ${baseSize*0.3},${baseSize*0.6} 2,${baseSize*0.35} ${baseSize*0.4},${baseSize*0.35}`}
                    fill={`url(#star3dBackGrad-${index})`}
                    stroke={color}
                    strokeWidth="0.5"
                    opacity="0.7"
                  />
                </svg>
              </div>
            </div>
          );

        case 'star-spiral':
          return (
            <div
              className="relative"
              style={{
                width: baseSize,
                height: baseSize,
                transformStyle: 'preserve-3d',
                animation: `wobble3d ${animProps.duration} ease-in-out infinite`
              }}
            >
              <svg width={baseSize} height={baseSize} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                <defs>
                  <radialGradient id={`starSpiralGrad-${index}`}>
                    <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: color, stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.4 }} />
                  </radialGradient>
                </defs>
                {/* Spiral arms */}
                <path
                  d={`M ${baseSize/2} ${baseSize/2} 
                     Q ${baseSize*0.8} ${baseSize*0.2} ${baseSize*0.9} ${baseSize*0.5}
                     Q ${baseSize*0.8} ${baseSize*0.8} ${baseSize*0.5} ${baseSize*0.9}
                     Q ${baseSize*0.2} ${baseSize*0.8} ${baseSize*0.1} ${baseSize*0.5}
                     Q ${baseSize*0.2} ${baseSize*0.2} ${baseSize*0.5} ${baseSize*0.1}
                     Q ${baseSize*0.7} ${baseSize*0.3} ${baseSize/2} ${baseSize/2}`}
                  fill={`url(#starSpiralGrad-${index})`}
                  stroke={color}
                  strokeWidth="1"
                />
                {/* Central core */}
                <circle
                  cx={baseSize/2}
                  cy={baseSize/2}
                  r={baseSize*0.1}
                  fill={color}
                  opacity="0.9"
                />
              </svg>
            </div>
          );
        
        default:
          return (
            <div
              className="rounded-full"
              style={{
                width: baseSize,
                height: baseSize,
                background: `radial-gradient(circle at 30% 30%, ${color}, ${color}88)`,
                boxShadow: `0 0 10px ${color}40`
              }}
            />
          );
      }
    })();

    return (
      <div
        style={{
          opacity,
          transformStyle: 'preserve-3d',
          ...getInteractionStyle(characteristics.interaction, index)
        }}
        className="transition-opacity duration-1000"
      >
        {elementComponent}
      </div>
    );
  };

  // Determine number of elements based on density
  const getElementCount = (density: string) => {
    switch (density) {
      case 'sparse': return { large: 4, small: 8 };
      case 'medium': return { large: 6, small: 12 };
      case 'dense': return { large: 8, small: 16 };
      default: return { large: 6, small: 12 };
    }
  };

  const elementCount = getElementCount(characteristics.density);

  // Memoize random positions for small particles to avoid recalculating during render
  const smallParticlePositions = useMemo(() => {
    return [...Array(16)].map((_, i) => ({
      left: (i * 6.25 + (i % 3) * 15) % 100,
      top: (i * 7.14 + (i % 4) * 10) % 100
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {/* Main floating elements */}
      <div className="absolute inset-0">
        {/* Large 3D elements */}
        {[...Array(elementCount.large)].map((_, i) => {
          const element = characteristics.elements[i % characteristics.elements.length];
          const color = characteristics.colors[i % characteristics.colors.length];
          
          return (
            <div
              key={`float-${i}`}
              className="absolute"
              style={{
                left: `${10 + i * (80 / elementCount.large)}%`,
                top: `${15 + (i % 3) * 30}%`,
                zIndex: 2,
                perspective: '1000px'
              }}
            >
              {renderElement(element, 32, color, 0.7, i)}
            </div>
          );
        })}

        {/* Small ambient 3D elements */}
        {smallParticlePositions.map((pos, i) => {
          const element = characteristics.elements[(i + 2) % characteristics.elements.length];
          const color = characteristics.colors[(i + 1) % characteristics.colors.length];

          return (
            <div
              key={`particle-${i}`}
              className="absolute"
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                zIndex: 1,
                perspective: '800px'
              }}
            >
              {renderElement(element, 16, color, 0.4, i + 10)}
            </div>
          );
        })}
      </div>

      {/* Dynamic path system */}
      <div className="absolute inset-0">
        <svg className="w-full h-full">
          {/* Main flowing path */}
          <path
            d="M20,40 Q50,25 80,40"
            stroke={characteristics.colors[0]}
            strokeWidth={characteristics.speed === 'fast' ? '2' : '1'}
            fill="none"
            opacity="0.2"
            strokeDasharray={characteristics.interaction === 'technical' ? '8,4' : '4,4'}
          >
            <animate
              attributeName="d"
              values="M20,40 Q50,25 80,40;M20,40 Q50,55 80,40;M20,40 Q50,25 80,40"
              dur={getAnimationProps(characteristics.speed).duration}
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-dashoffset"
              values="0;12"
              dur="3s"
              repeatCount="indefinite"
            />
          </path>

          {/* Secondary connection paths */}
          {characteristics.interaction === 'formation' && (
            <g opacity="0.15">
              {[...Array(3)].map((_, i) => (
                <line
                  key={`connection-${i}`}
                  x1={20 + i * 30}
                  y1={30}
                  x2={30 + i * 30}
                  y2={50}
                  stroke={characteristics.colors[1]}
                  strokeWidth="0.5"
                >
                  <animate
                    attributeName="opacity"
                    values="0.1;0.3;0.1"
                    dur={`${4 + i}s`}
                    repeatCount="indefinite"
                  />
                </line>
              ))}
            </g>
          )}

          {/* Dynamic formation indicators */}
          {characteristics.interaction === 'dynamic' && (
            <g>
              {[...Array(5)].map((_, i) => (
                <circle
                  key={`indicator-${i}`}
                  cx="50"
                  cy="50"
                  r="1"
                  fill={characteristics.colors[i % characteristics.colors.length]}
                  opacity="0.3"
                  transform={`rotate(${i * 72} 50 50) translate(25 0)`}
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values={`${i * 72} 50 50;${i * 72 + 360} 50 50`}
                    dur="10s"
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
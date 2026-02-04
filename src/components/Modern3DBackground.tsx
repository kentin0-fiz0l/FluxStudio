import { useEffect, useState, useRef, useMemo } from 'react';

// 3D Asset Library - CSS-based procedural 3D shapes
const create3DShapes = () => {
  return {
    // Modern geometric primitives
    'hexagonal-prism': (size: number, color: string, index: number) => (
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          animation: `rotate3d ${8 + index}s linear infinite`
        }}
      >
        {/* Hexagonal faces */}
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: size * 0.8,
              height: size * 0.3,
              background: `linear-gradient(135deg, ${color}FF, ${color}AA, ${color}66)`,
              transform: `rotateY(${i * 60}deg) translateZ(${size * 0.4}px)`,
              borderRadius: '4px',
              border: `1px solid ${color}44`,
              boxShadow: `inset 0 0 10px ${color}33`
            }}
          />
        ))}
        {/* Top and bottom faces */}
        <div
          className="absolute"
          style={{
            width: size * 0.8,
            height: size * 0.8,
            background: `radial-gradient(circle, ${color}CC, ${color}88)`,
            transform: `rotateX(90deg) translateZ(${size * 0.15}px)`,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: `1px solid ${color}66`
          }}
        />
        <div
          className="absolute"
          style={{
            width: size * 0.8,
            height: size * 0.8,
            background: `radial-gradient(circle, ${color}88, ${color}44)`,
            transform: `rotateX(90deg) translateZ(-${size * 0.15}px)`,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: `1px solid ${color}44`
          }}
        />
      </div>
    ),

    'crystalline-structure': (size: number, color: string, index: number) => (
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          animation: `crystalline-rotation ${10 + index * 2}s ease-in-out infinite`
        }}
      >
        {/* Central core */}
        <div
          className="absolute"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            left: '35%',
            top: '35%',
            background: `radial-gradient(circle, ${color}FF, ${color}BB)`,
            borderRadius: '50%',
            boxShadow: `0 0 20px ${color}80`,
            transform: 'translateZ(0px)'
          }}
        />
        {/* Crystal spikes */}
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: 4,
              height: size * 0.6,
              left: '50%',
              top: '20%',
              background: `linear-gradient(to top, ${color}AA, ${color}FF, ${color}AA)`,
              transform: `
                translateX(-50%) 
                rotateZ(${i * 45}deg) 
                rotateX(${30 + i * 10}deg) 
                translateZ(${size * 0.2}px)
              `,
              borderRadius: '2px 2px 0 0',
              boxShadow: `0 0 5px ${color}60`
            }}
          />
        ))}
      </div>
    ),

    'molecular-cluster': (size: number, color: string, index: number) => (
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          animation: `molecular-orbit ${12 + index}s linear infinite`
        }}
      >
        {/* Central atom */}
        <div
          className="absolute"
          style={{
            width: size * 0.4,
            height: size * 0.4,
            left: '30%',
            top: '30%',
            background: `radial-gradient(circle at 30% 30%, ${color}FF, ${color}AA, ${color}66)`,
            borderRadius: '50%',
            boxShadow: `0 0 15px ${color}60, inset 3px 3px 6px rgba(255,255,255,0.3)`,
            transform: 'translateZ(0px)'
          }}
        />
        {/* Orbiting electrons */}
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: size * 0.15,
              height: size * 0.15,
              background: `radial-gradient(circle, ${color}DD, ${color}88)`,
              borderRadius: '50%',
              left: '50%',
              top: '50%',
              transform: `
                translateX(-50%) translateY(-50%)
                rotateY(${i * 60}deg) 
                translateZ(${size * 0.3}px) 
                rotateX(${i * 30}deg)
              `,
              boxShadow: `0 0 8px ${color}40`
            }}
          />
        ))}
        {/* Orbital paths */}
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={`orbit-${i}`}
            className="absolute"
            style={{
              width: size * (0.6 + i * 0.2),
              height: size * (0.6 + i * 0.2),
              left: '50%',
              top: '50%',
              border: `1px solid ${color}20`,
              borderRadius: '50%',
              transform: `translateX(-50%) translateY(-50%) rotateX(${i * 30}deg)`,
              opacity: 0.3
            }}
          />
        ))}
      </div>
    ),

    'fractal-pyramid': (size: number, color: string, index: number) => (
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          animation: `fractal-spin ${9 + index * 1.5}s ease-in-out infinite`
        }}
      >
        {/* Main pyramid faces */}
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: 0,
              height: 0,
              borderLeft: `${size * 0.4}px solid transparent`,
              borderRight: `${size * 0.4}px solid transparent`,
              borderBottom: `${size * 0.6}px solid ${color}`,
              left: '10%',
              top: '20%',
              transform: `rotateY(${i * 90}deg) translateZ(${size * 0.2}px)`,
              filter: `drop-shadow(0 0 8px ${color}60)`,
              opacity: 0.8 - i * 0.1
            }}
          />
        ))}
        {/* Smaller recursive pyramids */}
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={`mini-${i}`}
            className="absolute"
            style={{
              width: 0,
              height: 0,
              borderLeft: `${size * 0.15}px solid transparent`,
              borderRight: `${size * 0.15}px solid transparent`,
              borderBottom: `${size * 0.25}px solid ${color}AA`,
              transform: `
                translateX(${Math.cos(i * Math.PI / 2) * size * 0.3}px)
                translateY(${Math.sin(i * Math.PI / 2) * size * 0.3}px)
                translateZ(${size * 0.1}px)
                rotateY(${i * 90 + 45}deg)
              `,
              filter: `drop-shadow(0 0 4px ${color}40)`
            }}
          />
        ))}
      </div>
    ),

    'quantum-ring': (size: number, color: string, index: number) => (
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          animation: `quantum-pulse ${7 + index * 0.5}s ease-in-out infinite`
        }}
      >
        {/* Main torus structure */}
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: size * 0.15,
              height: size * 0.15,
              background: `radial-gradient(circle, ${color}FF, ${color}66)`,
              borderRadius: '50%',
              left: '50%',
              top: '50%',
              transform: `
                translateX(-50%) translateY(-50%)
                rotateY(${i * 22.5}deg) 
                translateZ(${size * 0.3}px)
                rotateX(${Math.sin(i * 0.5) * 20}deg)
              `,
              boxShadow: `0 0 10px ${color}80`,
              opacity: 0.7 + Math.sin(i * 0.5) * 0.3
            }}
          />
        ))}
        {/* Energy waves */}
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={`wave-${i}`}
            className="absolute"
            style={{
              width: size * (0.8 + i * 0.2),
              height: size * (0.8 + i * 0.2),
              left: '50%',
              top: '50%',
              border: `2px solid ${color}${30 + i * 20}`,
              borderRadius: '50%',
              transform: `translateX(-50%) translateY(-50%) rotateX(${i * 20}deg)`,
              animation: `wave-pulse ${3 + i}s ease-in-out infinite`
            }}
          />
        ))}
      </div>
    ),

    'neural-network': (size: number, color: string, index: number) => (
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          animation: `neural-activity ${8 + index * 1.2}s linear infinite`
        }}
      >
        {/* Neural nodes */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * 2 * Math.PI;
          const radius = size * 0.3;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const z = Math.sin(i * 0.8) * radius * 0.5;
          
          return (
            <div
              key={i}
              className="absolute"
              style={{
                width: size * 0.08,
                height: size * 0.08,
                background: `radial-gradient(circle, ${color}FF, ${color}88)`,
                borderRadius: '50%',
                left: '50%',
                top: '50%',
                transform: `
                  translateX(-50%) translateY(-50%)
                  translate3d(${x}px, ${y}px, ${z}px)
                `,
                boxShadow: `0 0 8px ${color}AA`,
                animation: `neural-pulse ${2 + i * 0.3}s ease-in-out infinite`
              }}
            />
          );
        })}
        {/* Connection lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            width: size,
            height: size,
            opacity: 0.4
          }}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={i}
              x1="50%"
              y1="50%"
              x2={50 + Math.cos(i * Math.PI / 4) * 40}
              y2={50 + Math.sin(i * Math.PI / 4) * 40}
              stroke={color}
              strokeWidth="1"
              opacity="0.6"
            >
              <animate
                attributeName="stroke-opacity"
                values="0.2;0.8;0.2"
                dur={`${2 + i * 0.5}s`}
                repeatCount="indefinite"
              />
            </line>
          ))}
        </svg>
      </div>
    )
  };
};

export function Modern3DBackground() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const shapes = create3DShapes();

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

  // Dynamic shape configuration based on scroll progress
  const getSceneConfig = (progress: number) => {
    if (progress < 0.2) {
      return {
        shapes: ['crystalline-structure', 'quantum-ring', 'molecular-cluster'],
        colors: ['#EC4899', '#8B5CF6', '#EC4899'],
        density: 8,
        theme: 'energetic'
      };
    } else if (progress < 0.4) {
      return {
        shapes: ['neural-network', 'hexagonal-prism', 'crystalline-structure'],
        colors: ['#EC4899', '#8B5CF6', '#06B6D4'],
        density: 10,
        theme: 'creative'
      };
    } else if (progress < 0.6) {
      return {
        shapes: ['fractal-pyramid', 'molecular-cluster', 'quantum-ring'],
        colors: ['#8B5CF6', '#06B6D4', '#10B981'],
        density: 12,
        theme: 'technical'
      };
    } else if (progress < 0.8) {
      return {
        shapes: ['neural-network', 'hexagonal-prism', 'fractal-pyramid'],
        colors: ['#06B6D4', '#10B981', '#EC4899'],
        density: 14,
        theme: 'dynamic'
      };
    } else {
      return {
        shapes: ['quantum-ring', 'crystalline-structure', 'neural-network'],
        colors: ['#10B981', '#EC4899', '#8B5CF6'],
        density: 10,
        theme: 'flowing'
      };
    }
  };

  const config = getSceneConfig(scrollProgress);

  // Memoize object positions to avoid random calls during render
  const objects = useMemo(() => {
    const result = [];
    const maxDensity = 14; // Maximum density from config
    for (let i = 0; i < maxDensity; i++) {
      // Use deterministic pseudo-random values based on index
      const seedX = ((i * 17 + 31) % 100);
      const seedY = ((i * 23 + 47) % 100);
      const seedZ = ((i * 13 + 59) % 100);
      const seedSize = 24 + ((i * 19 + 37) % 32);
      const seedOpacity = 0.4 + ((i * 11 + 29) % 40) / 100;

      result.push({
        id: i,
        shape: '', // Will be set based on config during render
        color: '', // Will be set based on config during render
        size: seedSize,
        x: seedX,
        y: seedY,
        z: seedZ,
        opacity: seedOpacity
      });
    }
    return result;
  }, []);

  // Memoize particle positions
  const particlePositions = useMemo(() => {
    return [...Array(50)].map((_, i) => ({
      cx: ((i * 7 + 13) % 100),
      cy: ((i * 11 + 17) % 100),
      dur: 3 + ((i * 3 + 5) % 4)
    }));
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none" 
      style={{ zIndex: 1 }}
    >
      {/* Main 3D objects */}
      <div className="absolute inset-0">
        {objects.slice(0, config.density).map((obj, idx) => {
          const shapeType = config.shapes[idx % config.shapes.length];
          const color = config.colors[idx % config.colors.length];
          const ShapeComponent = shapes[shapeType as keyof typeof shapes];

          return (
            <div
              key={obj.id}
              className="absolute"
              style={{
                left: `${obj.x}%`,
                top: `${obj.y}%`,
                transform: `translateZ(${obj.z}px)`,
                opacity: obj.opacity,
                perspective: '1000px',
                zIndex: Math.floor(obj.z / 10)
              }}
            >
              {ShapeComponent(obj.size, color, obj.id)}
            </div>
          );
        })}
      </div>

      {/* Ambient particle field */}
      <div className="absolute inset-0">
        <svg className="w-full h-full opacity-30">
          {particlePositions.map((pos, i) => (
            <circle
              key={i}
              cx={`${pos.cx}%`}
              cy={`${pos.cy}%`}
              r="1"
              fill={config.colors[i % config.colors.length]}
              opacity="0.6"
            >
              <animate
                attributeName="opacity"
                values="0.2;0.8;0.2"
                dur={`${pos.dur}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </svg>
      </div>

      {/* Dynamic connection network */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full">
          <defs>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: config.colors[0], stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: config.colors[1], stopOpacity: 0.2 }} />
            </linearGradient>
          </defs>
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d={`M ${20 + i * 10},20 Q 50,${50 + i * 5} ${80 - i * 5},80`}
              stroke="url(#connectionGradient)"
              strokeWidth="1"
              fill="none"
              opacity="0.4"
            >
              <animate
                attributeName="stroke-dasharray"
                values="0,100;50,50;0,100"
                dur={`${5 + i}s`}
                repeatCount="indefinite"
              />
            </path>
          ))}
        </svg>
      </div>
    </div>
  );
}
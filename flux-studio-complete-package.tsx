/**
 * FLUX STUDIO - Complete Animated Background & Orbital Logo Package
 *
 * This package contains the exact implementation of:
 * 1. Brian Eno-inspired generative ambient background with canvas particles
 * 2. Modern 3D geometric shapes floating animation
 * 3. 3D orbital "FLUX STUDIO" logo with depth effects
 * 4. All keyframe animations and styles
 *
 * Copy this entire package to recreate the Flux Studio animated experience.
 */

import { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';

// =============================================================================
// 1. 3D TEXT COMPONENT (Orbital Logo)
// =============================================================================

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

// =============================================================================
// 2. BRIAN ENO AMBIENT BACKGROUND
// =============================================================================

export function EnoBackground() {
  const { theme } = useTheme();
  const [scrollProgress, setScrollProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<any[]>([]);
  const timeRef = useRef(0);

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

  // Initialize generative particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create ambient particles with Eno-inspired characteristics
    const initializeParticles = () => {
      particlesRef.current = [];
      const particleCount = 60;

      const canvasWidth = canvas.width || window.innerWidth;
      const canvasHeight = canvas.height || window.innerHeight;

      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvasWidth,
          y: Math.random() * canvasHeight,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.3 + 0.1,
          phase: Math.random() * Math.PI * 2,
          frequency: Math.random() * 0.02 + 0.005,
          colorPhase: Math.random() * Math.PI * 2,
          connectionRadius: Math.random() * 150 + 100,
          depth: Math.random() * 0.8 + 0.2
        });
      }
    };

    initializeParticles();

    // Eno-inspired color palette that evolves with scroll
    const getColorFromProgress = (progress: number, alpha: number = 1) => {
      const colors = [
        { r: 236, g: 72, b: 153 },   // Pink
        { r: 139, g: 92, b: 246 },   // Purple
        { r: 6, g: 182, b: 212 },    // Cyan
        { r: 16, g: 185, b: 129 },   // Green
      ];

      const clampedProgress = Math.max(0, Math.min(1, progress));
      const scaledProgress = clampedProgress * (colors.length - 1);
      const index = Math.floor(scaledProgress);
      const nextIndex = Math.min(index + 1, colors.length - 1);
      const factor = scaledProgress - index;

      const safeIndex = Math.max(0, Math.min(index, colors.length - 1));
      const safeNextIndex = Math.max(0, Math.min(nextIndex, colors.length - 1));

      const current = colors[safeIndex] || colors[0];
      const next = colors[safeNextIndex] || colors[0];

      return {
        r: Math.round(current.r + (next.r - current.r) * factor),
        g: Math.round(current.g + (next.g - current.g) * factor),
        b: Math.round(current.b + (next.b - current.b) * factor),
        a: alpha
      };
    };

    // Generative animation loop
    const animate = () => {
      if (!ctx || !canvas) return;

      try {
        timeRef.current += 0.016;

        // Clear with subtle fade for trailing effect
        ctx.fillStyle = 'rgba(10, 10, 10, 0.02)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ambient color field background
        const gradient = ctx.createRadialGradient(
          canvas.width * 0.5,
          canvas.height * 0.5,
          0,
          canvas.width * 0.5,
          canvas.height * 0.5,
          Math.max(canvas.width, canvas.height)
        );

        const baseColor = getColorFromProgress(scrollProgress, 0.02 + Math.sin(timeRef.current * 0.3) * 0.01);
        gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${baseColor.a})`);
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        if (particlesRef.current && particlesRef.current.length > 0) {
          particlesRef.current.forEach((particle, index) => {
            if (!particle) return;

            // Gentle Brownian motion with Eno-inspired drift
            particle.x += particle.vx + Math.sin(timeRef.current * particle.frequency + particle.phase) * 0.1;
            particle.y += particle.vy + Math.cos(timeRef.current * particle.frequency * 0.7 + particle.phase) * 0.08;

            // Wrap around screen
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvas.height;
            if (particle.y > canvas.height) particle.y = 0;

            // Evolving opacity based on time and scroll
            const timeOpacity = Math.sin(timeRef.current * particle.frequency * 2 + particle.phase) * 0.15 + 0.15;
            const scrollOpacity = 0.1 + scrollProgress * 0.2;
            particle.opacity = Math.min(timeOpacity + scrollOpacity, 0.4);

            // Color cycling through the palette
            const colorProgress = Math.abs((scrollProgress + Math.sin(timeRef.current * 0.1 + particle.colorPhase) * 0.2)) % 1;
            const particleColor = getColorFromProgress(colorProgress, particle.opacity * particle.depth);

            // Draw particle with soft glow
            const glowSize = Math.max(1, particle.size * (2 + Math.sin(timeRef.current * particle.frequency * 3) * 0.5));

            ctx.beginPath();
            const glowGradient = ctx.createRadialGradient(
              particle.x, particle.y, 0,
              particle.x, particle.y, glowSize
            );
            glowGradient.addColorStop(0, `rgba(${particleColor.r}, ${particleColor.g}, ${particleColor.b}, ${particleColor.a})`);
            glowGradient.addColorStop(0.7, `rgba(${particleColor.r}, ${particleColor.g}, ${particleColor.b}, ${Math.max(0, particleColor.a * 0.5)})`);
            glowGradient.addColorStop(1, `rgba(${particleColor.r}, ${particleColor.g}, ${particleColor.b}, 0)`);

            ctx.fillStyle = glowGradient;
            ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // Generative connection lines (very subtle)
        if (particlesRef.current && particlesRef.current.length > 0) {
          const connectionColor = getColorFromProgress(scrollProgress, 0.05);
          ctx.strokeStyle = `rgba(${connectionColor.r}, ${connectionColor.g}, ${connectionColor.b}, 0.05)`;
          ctx.lineWidth = 0.5;

          particlesRef.current.forEach((particle, i) => {
            if (!particle) return;

            particlesRef.current.slice(i + 1).forEach(otherParticle => {
              if (!otherParticle) return;

              const dx = particle.x - otherParticle.x;
              const dy = particle.y - otherParticle.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < particle.connectionRadius && Math.random() > 0.98) {
                const opacity = Math.max(0, (particle.connectionRadius - distance) / particle.connectionRadius * 0.03);
                ctx.globalAlpha = opacity;
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(otherParticle.x, otherParticle.y);
                ctx.stroke();
                ctx.globalAlpha = 1;
              }
            });
          });
        }

        animationRef.current = requestAnimationFrame(animate);
      } catch (error) {
        console.error('Animation error:', error);
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scrollProgress]);

  // Only render background in dark mode
  if (theme === 'light') {
    return null;
  }

  return (
    <>
      {/* Canvas for generative ambient visuals */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1, mixBlendMode: 'screen' }}
      />

      {/* Layered CSS ambient effects */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {/* Ambient color washes */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 20% 30%,
              rgba(236, 72, 153, ${0.05 + scrollProgress * 0.03}) 0%,
              transparent 60%),
            radial-gradient(ellipse at 80% 70%,
              rgba(139, 92, 246, ${0.04 + scrollProgress * 0.02}) 0%,
              transparent 60%),
            radial-gradient(ellipse at 60% 20%,
              rgba(6, 182, 212, ${0.03 + scrollProgress * 0.02}) 0%,
              transparent 70%)`,
            animation: 'ambient-drift 60s ease-in-out infinite'
          }}
        />

        {/* Slow-moving gradient overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(45deg,
              rgba(236, 72, 153, 0.1) 0%,
              rgba(139, 92, 246, 0.08) 25%,
              rgba(6, 182, 212, 0.06) 50%,
              rgba(16, 185, 129, 0.08) 75%,
              rgba(236, 72, 153, 0.1) 100%)`,
            backgroundSize: '400% 400%',
            animation: 'ambient-flow 120s ease-in-out infinite'
          }}
        />

        {/* Breathing glow effect */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%,
              rgba(255, 255, 255, ${0.002 + Math.sin(Date.now() * 0.001) * 0.001}) 0%,
              transparent 50%)`,
            animation: 'breathe 8s ease-in-out infinite'
          }}
        />
      </div>
    </>
  );
}

// =============================================================================
// 3. MODERN 3D BACKGROUND SHAPES
// =============================================================================

// 3D Asset Library - CSS-based procedural 3D shapes
const create3DShapes = () => {
  return {
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
    if (progress < 0.3) {
      return {
        shapes: ['crystalline-structure', 'quantum-ring', 'neural-network'],
        colors: ['#EC4899', '#8B5CF6', '#06B6D4'],
        density: 8,
        theme: 'energetic'
      };
    } else if (progress < 0.6) {
      return {
        shapes: ['neural-network', 'crystalline-structure', 'quantum-ring'],
        colors: ['#8B5CF6', '#06B6D4', '#10B981'],
        density: 10,
        theme: 'creative'
      };
    } else {
      return {
        shapes: ['quantum-ring', 'crystalline-structure', 'neural-network'],
        colors: ['#10B981', '#EC4899', '#8B5CF6'],
        density: 12,
        theme: 'flowing'
      };
    }
  };

  const config = getSceneConfig(scrollProgress);

  // Generate positions for objects
  const generateObjects = () => {
    const objects = [];
    for (let i = 0; i < config.density; i++) {
      const shapeType = config.shapes[i % config.shapes.length];
      const color = config.colors[i % config.colors.length];
      const size = 24 + Math.random() * 32;

      objects.push({
        id: i,
        shape: shapeType,
        color,
        size,
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 100,
        opacity: 0.4 + Math.random() * 0.4
      });
    }
    return objects;
  };

  const [objects] = useState(generateObjects);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {/* Main 3D objects */}
      <div className="absolute inset-0">
        {objects.map((obj) => {
          const ShapeComponent = shapes[obj.shape as keyof typeof shapes];

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
              {ShapeComponent(obj.size, obj.color, obj.id)}
            </div>
          );
        })}
      </div>

      {/* Ambient particle field */}
      <div className="absolute inset-0">
        <svg className="w-full h-full opacity-30">
          {Array.from({ length: 50 }, (_, i) => (
            <circle
              key={i}
              cx={`${Math.random() * 100}%`}
              cy={`${Math.random() * 100}%`}
              r="1"
              fill={config.colors[i % config.colors.length]}
              opacity="0.6"
            >
              <animate
                attributeName="opacity"
                values="0.2;0.8;0.2"
                dur={`${3 + Math.random() * 4}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
}

// =============================================================================
// 4. HERO COMPONENT WITH ORBITAL LOGO
// =============================================================================

export function FluxStudioHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Interactive gradient overlay that works with floating graphics */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/20 to-zinc-950/40"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-sm mb-12">
            <span className="w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full mr-3 animate-pulse"></span>
            Design in Motion
          </div>

          <div className="text-3d-container mb-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center space-y-4">
              <Text3D
                text="FLUX"
                className="text-6xl md:text-8xl lg:text-9xl justify-center"
                depth={12}
                color="#f8f8f8"
                shadowColor="#1a1a1a"
              />
              <Text3D
                text="STUDIO"
                className="text-6xl md:text-8xl lg:text-9xl justify-center"
                depth={12}
                color="#EC4899"
                shadowColor="#8B5CF6"
              />
            </div>
          </div>

          <p className="text-lg text-white/80 max-w-3xl mx-auto mb-4">
            Creative Design Studio for Marching Arts
          </p>

          <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto mb-12">
            Visual design concepts, mockups, storyboarded show ideas — founded and led by <span className="text-white font-semibold">Kentino</span>.
          </p>

          <div className="mt-20 text-sm text-white/50">
            <span>Founded by </span>
            <span className="gradient-text font-medium">Kentino</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// 5. COMPLETE CSS KEYFRAMES (Add to your global CSS)
// =============================================================================

export const FluxStudioCSS = `
/* Font imports */
/* Rampart One font removed - using Orbitron instead from Google Fonts */

/* Ambient background animations */
@keyframes ambient-drift {
  0%, 100% {
    transform: translate(0px, 0px) rotate(0deg);
    filter: hue-rotate(0deg);
  }
  25% {
    transform: translate(20px, -20px) rotate(90deg);
    filter: hue-rotate(90deg);
  }
  50% {
    transform: translate(-20px, -40px) rotate(180deg);
    filter: hue-rotate(180deg);
  }
  75% {
    transform: translate(-40px, 20px) rotate(270deg);
    filter: hue-rotate(270deg);
  }
}

@keyframes ambient-flow {
  0%, 100% {
    background-position: 0% 0%;
    filter: brightness(1);
  }
  25% {
    background-position: 100% 0%;
    filter: brightness(1.1);
  }
  50% {
    background-position: 100% 100%;
    filter: brightness(0.9);
  }
  75% {
    background-position: 0% 100%;
    filter: brightness(1.05);
  }
}

@keyframes breathe {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

/* 3D Shape animations */
@keyframes crystalline-rotation {
  0%, 100% {
    transform: perspective(800px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1);
  }
  25% {
    transform: perspective(800px) rotateX(90deg) rotateY(90deg) rotateZ(45deg) scale(1.1);
  }
  50% {
    transform: perspective(800px) rotateX(180deg) rotateY(180deg) rotateZ(90deg) scale(0.9);
  }
  75% {
    transform: perspective(800px) rotateX(270deg) rotateY(270deg) rotateZ(135deg) scale(1.05);
  }
}

@keyframes quantum-pulse {
  0%, 100% {
    transform: perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1);
    filter: brightness(1) saturate(1);
  }
  33% {
    transform: perspective(1000px) rotateX(60deg) rotateY(120deg) scale(1.2);
    filter: brightness(1.2) saturate(1.3);
  }
  66% {
    transform: perspective(1000px) rotateX(120deg) rotateY(240deg) scale(0.8);
    filter: brightness(0.8) saturate(0.7);
  }
}

@keyframes neural-activity {
  0% {
    transform: perspective(800px) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }
  25% {
    transform: perspective(800px) rotateX(45deg) rotateY(90deg) rotateZ(22.5deg);
  }
  50% {
    transform: perspective(800px) rotateX(90deg) rotateY(180deg) rotateZ(45deg);
  }
  75% {
    transform: perspective(800px) rotateX(135deg) rotateY(270deg) rotateZ(67.5deg);
  }
  100% {
    transform: perspective(800px) rotateX(180deg) rotateY(360deg) rotateZ(90deg);
  }
}

@keyframes neural-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 8px currentColor;
  }
  50% {
    transform: scale(1.3);
    box-shadow: 0 0 16px currentColor, 0 0 24px currentColor;
  }
}

@keyframes wave-pulse {
  0%, 100% {
    transform: translateX(-50%) translateY(-50%) rotateX(0deg) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translateX(-50%) translateY(-50%) rotateX(20deg) scale(1.1);
    opacity: 0.8;
  }
}

/* Gradient text effect */
.gradient-text {
  background: linear-gradient(135deg, #EC4899, #8B5CF6, #06B6D4);
  background-size: 200% 200%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-flow 3s ease-in-out infinite;
}

@keyframes gradient-flow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
`;

// =============================================================================
// 6. COMPLETE APP COMPONENT
// =============================================================================

export function FluxStudioApp() {
  return (
    <div className="min-h-screen bg-black text-white relative transition-colors duration-300">
      {/* Brian Eno-inspired ambient background */}
      <EnoBackground />

      {/* Modern 3D floating shapes */}
      <Modern3DBackground />

      {/* Main content with orbital logo */}
      <main className="relative z-10">
        <FluxStudioHero />
      </main>

      {/* Add CSS styles */}
      <style dangerouslySetInnerHTML={{ __html: FluxStudioCSS }} />
    </div>
  );
}

/**
 * INSTALLATION INSTRUCTIONS:
 *
 * 1. Install dependencies:
 *    npm install next-themes
 *
 * 2. Add the Rampart One font to your public/fonts/ directory
 *
 * 3. Import and use the FluxStudioApp component:
 *    import { FluxStudioApp } from './flux-studio-complete-package';
 *
 * 4. Or use individual components:
 *    - EnoBackground for ambient canvas animation
 *    - Modern3DBackground for floating 3D shapes
 *    - Text3D for orbital logo text
 *    - FluxStudioHero for complete hero section
 *
 * 5. The CSS keyframes are included in FluxStudioCSS constant
 *
 * This package provides the complete Flux Studio animated experience:
 * ✅ Generative ambient background with particles
 * ✅ 3D geometric shapes with complex animations
 * ✅ Orbital "FLUX STUDIO" logo with depth
 * ✅ Scroll-reactive color transitions
 * ✅ All keyframe animations included
 * ✅ Performance optimized with RAF and canvas
 */
import { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';

// Brian Eno-inspired generative ambient background
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

    // Calculate theme mode for this effect
    const isLightMode = theme === 'light';

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
      
      // Ensure canvas dimensions are available
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
      // Smooth color transitions inspired by ambient music progressions
      const colors = [
        { r: 236, g: 72, b: 153 },   // Pink
        { r: 139, g: 92, b: 246 },   // Purple
        { r: 6, g: 182, b: 212 },    // Cyan
        { r: 16, g: 185, b: 129 },   // Green
      ];
      
      // Clamp progress between 0 and 1
      const clampedProgress = Math.max(0, Math.min(1, progress));
      const scaledProgress = clampedProgress * (colors.length - 1);
      const index = Math.floor(scaledProgress);
      const nextIndex = Math.min(index + 1, colors.length - 1);
      const factor = scaledProgress - index;
      
      // Ensure indices are within bounds
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
        const bgColor = isLightMode ? 'rgba(250, 250, 250, 0.02)' : 'rgba(10, 10, 10, 0.02)';
        ctx.fillStyle = bgColor;
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

        // Use different color palettes for light vs dark mode
        let baseColor;
        if (isLightMode) {
          // Flux Studio brand colors for light mode
          const lightColors = [
            { r: 255, g: 165, b: 0 },    // Orange
            { r: 236, g: 72, b: 153 },   // Pink
            { r: 139, g: 92, b: 246 },   // Purple
            { r: 59, g: 130, b: 246 },   // Blue
          ];
          const progress = Math.max(0, Math.min(1, scrollProgress));
          const scaledProgress = progress * (lightColors.length - 1);
          const index = Math.floor(scaledProgress);
          const nextIndex = Math.min(index + 1, lightColors.length - 1);
          const factor = scaledProgress - index;
          const current = lightColors[index] || lightColors[0];
          const next = lightColors[nextIndex] || lightColors[0];
          baseColor = {
            r: Math.round(current.r + (next.r - current.r) * factor),
            g: Math.round(current.g + (next.g - current.g) * factor),
            b: Math.round(current.b + (next.b - current.b) * factor),
            a: 0.03 + Math.sin(timeRef.current * 0.3) * 0.01
          };
        } else {
          baseColor = getColorFromProgress(scrollProgress, 0.02 + Math.sin(timeRef.current * 0.3) * 0.01);
        }

        gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${baseColor.a})`);
        const endColor = isLightMode ? 'rgba(250, 250, 250, 0)' : 'rgba(10, 10, 10, 0)';
        gradient.addColorStop(1, endColor);

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
        // Fallback: continue animation even if there's an error
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
  }, [scrollProgress, theme]);

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
            background: isLightMode ?
              `radial-gradient(ellipse at 20% 30%,
                rgba(255, 165, 0, ${0.08 + scrollProgress * 0.05}) 0%,
                transparent 60%),
              radial-gradient(ellipse at 80% 70%,
                rgba(236, 72, 153, ${0.06 + scrollProgress * 0.04}) 0%,
                transparent 60%),
              radial-gradient(ellipse at 60% 20%,
                rgba(139, 92, 246, ${0.05 + scrollProgress * 0.03}) 0%,
                transparent 70%),
              radial-gradient(ellipse at 40% 80%,
                rgba(59, 130, 246, ${0.05 + scrollProgress * 0.03}) 0%,
                transparent 70%)` :
              `radial-gradient(ellipse at 20% 30%,
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
            background: isLightMode ?
              `linear-gradient(45deg,
                rgba(255, 165, 0, 0.12) 0%,
                rgba(236, 72, 153, 0.10) 25%,
                rgba(139, 92, 246, 0.08) 50%,
                rgba(59, 130, 246, 0.10) 75%,
                rgba(255, 165, 0, 0.12) 100%)` :
              `linear-gradient(45deg,
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
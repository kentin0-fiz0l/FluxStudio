import { Button } from './ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { Text3D } from './Text3D';
import { useResponsive, TouchButton, AnimationWrapper } from './PerformanceOptimizer';
import { HomepageAuth } from './HomepageAuth';
import { useAuth } from '../contexts/AuthContext';

export function MobileOptimizedHero() {
  const { isMobile, isTablet } = useResponsive();
  const { isAuthenticated } = useAuth();

  const handleNavigation = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      const offset = 80; // Header height
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section 
      id="home" 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ paddingTop: isMobile ? '4rem' : '5rem' }}
    >
      {/* Interactive gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/20 to-zinc-950/40"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Status Badge - Clickable */}
          <button
            onClick={() => handleNavigation('#contact')}
            className="inline-flex items-center px-4 py-2 rounded-full bg-card-solid backdrop-blur-sm border border-white/10 text-xs sm:text-sm mb-8 sm:mb-12 hover:bg-white/5 transition-all duration-200 cursor-pointer group"
          >
            <span className="w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full mr-2 sm:mr-3 animate-pulse"></span>
            <span className="text-pink-500 font-medium group-hover:text-pink-400 transition-colors">Now booking for 2026 seasons</span>
            <ArrowRight className="w-3 h-3 ml-2 text-pink-500 group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
          </button>
          
          {/* Main Title - Exact Header Logo Style with Individual Letter Transforms */}
          <AnimationWrapper className="mb-6 sm:mb-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center space-y-1 sm:space-y-2" style={{ perspective: '800px' }}>
              {/* FLUX */}
              <div className={`flex ${isMobile ? 'text-6xl' : isTablet ? 'text-8xl' : 'text-8xl md:text-9xl lg:text-[12rem]'} justify-center`} style={{ perspective: '1000px' }}>
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
                    {/* Generate 24 shadow layers */}
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={`shadow-${i}`}
                        className="absolute top-0 left-0 font-black"
                        style={{
                          color: 'rgb(26, 26, 26)',
                          fontSize: 'inherit',
                          lineHeight: 'inherit',
                          fontFamily: 'Orbitron, sans-serif',
                          transform: `translateZ(-${i + 1}px) translateX(${(i + 1) * 0.125}px) translateY(${(i + 1) * 0.125}px)`,
                          opacity: Math.max(0.05, 1 - (i * 0.04)),
                          zIndex: 19 - i
                        }}
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* STUDIO */}
              <div className={`flex ${isMobile ? 'text-4xl' : isTablet ? 'text-6xl' : 'text-6xl md:text-8xl lg:text-9xl'} justify-center`} style={{ perspective: '1000px' }}>
                {['S', 'T', 'U', 'D', 'I', 'O'].map((letter, index) => (
                  <div
                    key={index}
                    className="relative inline-block"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: 'rotateX(25deg) rotateY(-15deg)',
                      marginRight: '0.15em'
                    }}
                  >
                    <div
                      className="relative z-20 font-black gradient-text"
                      style={{
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        fontFamily: 'Orbitron, sans-serif',
                        textShadow: 'rgba(139, 92, 246, 0.25) 0px 0px 20px'
                      }}
                    >
                      {letter}
                    </div>
                    {/* Generate 24 shadow layers */}
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={`shadow-${i}`}
                        className="absolute top-0 left-0 font-black"
                        style={{
                          color: 'rgb(139, 92, 246)',
                          fontSize: 'inherit',
                          lineHeight: 'inherit',
                          fontFamily: 'Orbitron, sans-serif',
                          transform: `translateZ(-${i + 1}px) translateX(${(i + 1) * 0.125}px) translateY(${(i + 1) * 0.125}px)`,
                          opacity: Math.max(0.05, 1 - (i * 0.04)),
                          zIndex: 19 - i
                        }}
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </AnimationWrapper>
          
          {/* Subtitle */}
          <p className="text-label text-off-white/80 max-w-3xl mx-auto mb-3 sm:mb-4 text-xs sm:text-sm">
            Creative Design Studio for Marching Arts
          </p>

          {/* Tagline */}
          <p className="text-technical text-off-white/60 max-w-2xl mx-auto mb-2 sm:mb-4 text-sm sm:text-base">
            Design in Motion
          </p>

          {/* Description */}
          <p className={`
            text-technical text-off-white/60 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed
            ${isMobile ? 'text-base px-2' : 'text-xl md:text-2xl'}
          `}>
            Visual design concepts, mockups, storyboarded show ideas — founded and led by <span className="text-off-white font-semibold">Kentino</span>.
          </p>
          
          {/* CTA Buttons - Mobile Optimized */}
          <div className={`
            flex gap-4 justify-center items-center
            ${isMobile ? 'flex-col w-full max-w-sm mx-auto' : 'flex-col sm:flex-row gap-6'}
          `}>
            <TouchButton
              onClick={() => handleNavigation('#contact')}
              className={`
                btn-glass-gradient text-white font-semibold relative z-10 inline-flex items-center justify-center rounded-lg
                ${isMobile ? 'w-full py-4 px-6 text-base' : 'px-8 py-4 text-lg'}
              `}
              aria-label="Book a consultation"
            >
              Book a Consult
              <ArrowRight className={`ml-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </TouchButton>
            
            <TouchButton
              onClick={() => handleNavigation('#concepts')}
              className={`
                btn-glass-outline text-white hover:text-white transition-all duration-300 relative z-10 inline-flex items-center justify-center rounded-lg
                ${isMobile ? 'w-full py-4 px-6 text-base' : 'px-8 py-4 text-lg'}
              `}
              aria-label="View our work"
            >
              <Play className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              View Concepts
            </TouchButton>
          </div>

          {/* Authentication Section - Only show if not authenticated */}
          {!isAuthenticated && (
            <div className={`
              mt-12 sm:mt-16 max-w-md mx-auto
              ${isMobile ? 'px-2' : ''}
            `}>
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">
                  Ready to Get Started?
                </h3>
                <p className="text-white/60 text-sm md:text-base">
                  Join the Flux Studio community and bring your creative vision to life
                </p>
              </div>
              <HomepageAuth />
            </div>
          )}

          {/* Credit */}
          <div className={`
            mt-12 sm:mt-20 text-off-white/50
            ${isMobile ? 'text-xs' : 'text-sm'}
          `}>
            <span>Founded by </span>
            <span className="gradient-text font-medium">Kentino</span>
          </div>
        </div>
      </div>

      {/* Mobile-specific touch feedback */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (max-width: 768px) {
            .touch-manipulation {
              -webkit-touch-callout: none;
              -webkit-user-select: none;
              -khtml-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
            }
          }
        `
      }} />
    </section>
  );
}
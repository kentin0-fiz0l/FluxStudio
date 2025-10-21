import { Button } from './ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { Text3D } from './Text3D';
import { useResponsive, TouchButton, AnimationWrapper } from './PerformanceOptimizer';

export function MobileOptimizedHero() {
  const { isMobile, isTablet } = useResponsive();

  const handleNavigation = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      const offset = 80;
      const elementPosition = element.offsetTop - offset;
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
          {/* Status Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-xs sm:text-sm mb-8 sm:mb-12">
            <span className="w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full mr-2 sm:mr-3 animate-pulse"></span>
            <span className="text-off-white/90">Now booking for 2026 season</span>
          </div>
          
          {/* 3D Title */}
          <AnimationWrapper className="text-3d-container mb-6 sm:mb-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center space-y-2 sm:space-y-4">
              <Text3D 
                text="FLUX" 
                className={`
                  ${isMobile ? 'text-4xl' : isTablet ? 'text-6xl' : 'text-6xl md:text-8xl lg:text-9xl'} 
                  justify-center
                `}
                depth={isMobile ? 6 : 12}
                color="#f8f8f8"
                shadowColor="#1a1a1a"
              />
              <Text3D 
                text="STUDIO" 
                className={`
                  ${isMobile ? 'text-4xl' : isTablet ? 'text-6xl' : 'text-6xl md:text-8xl lg:text-9xl'} 
                  justify-center
                `}
                depth={isMobile ? 6 : 12}
                color="#EC4899"
                shadowColor="#8B5CF6"
              />
            </div>
          </AnimationWrapper>
          
          {/* Subtitle */}
          <p className="text-label text-off-white/80 max-w-3xl mx-auto mb-3 sm:mb-4 text-xs sm:text-sm">
            Marching Arts Creative Design Shop
          </p>
          
          {/* Description */}
          <p className={`
            text-technical text-off-white/60 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed
            ${isMobile ? 'text-base px-2' : 'text-xl md:text-2xl'}
          `}>
            Bringing form, flow, and impact to ensembles through 
            modern, accessible, and visually striking design.
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
              onClick={() => handleNavigation('#work')}
              className={`
                btn-glass-outline text-white hover:text-white transition-all duration-300 relative z-10 inline-flex items-center justify-center rounded-lg
                ${isMobile ? 'w-full py-4 px-6 text-base' : 'px-8 py-4 text-lg'}
              `}
              aria-label="View our work"
            >
              <Play className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              View Work
            </TouchButton>
          </div>
          
          {/* Credit */}
          <div className={`
            mt-12 sm:mt-20 text-off-white/50
            ${isMobile ? 'text-xs' : 'text-sm'}
          `}>
            <span>Creative Direction by </span>
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
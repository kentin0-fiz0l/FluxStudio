import { MobileOptimizedHeader } from './components/MobileOptimizedHeader';
import { MobileOptimizedHero } from './components/MobileOptimizedHero';
import { AboutSnapshot } from './components/AboutSnapshot';
import { Work } from './components/Work';
import { Services } from './components/Services';
import { CreativeShowcase } from './components/CreativeShowcase';
import { Process } from './components/Process';
import { Testimonials } from './components/Testimonials';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { EnoBackground } from './components/EnoBackground';
import { ScrollTriggeredMotion } from './components/ScrollTriggeredMotion';
import { MobileFirstLayout } from './components/MobileFirstLayout';
import { PerformanceOptimizer } from './components/PerformanceOptimizer';
import { ServiceWorkerManager } from './components/ServiceWorkerManager';

export default function App() {
  return (
    <MobileFirstLayout>
      <div className="min-h-screen bg-ink text-off-white relative">
        {/* Brian Eno-inspired ambient background - Performance optimized */}
        <PerformanceOptimizer threshold={0.1} rootMargin="200px">
          <EnoBackground />
        </PerformanceOptimizer>
        
        {/* Scroll-triggered motion effects - Performance optimized */}
        <PerformanceOptimizer threshold={0.2} rootMargin="100px">
          <ScrollTriggeredMotion />
        </PerformanceOptimizer>
        
        <MobileOptimizedHeader />
        <ServiceWorkerManager />
        <main className="relative z-10">
          {/* 1. Hero Section */}
          <MobileOptimizedHero />
        
        {/* 2. About Snapshot */}
        <AboutSnapshot />
        <div className="gradient-flow"></div>
        
        {/* 3. Featured Work */}
        <Work />
        <div className="gradient-flow"></div>
        
        {/* 4. Services Snapshot */}
        <Services />
        <div className="gradient-flow"></div>
        
        {/* 5. Creative Showcase (Speculative Works) */}
        <CreativeShowcase />
        <div className="gradient-flow"></div>
        
        {/* 6. Process */}
        <Process />
        <div className="gradient-flow"></div>
        
        {/* 7. Testimonials */}
        <Testimonials />
        <div className="gradient-flow"></div>
        
        {/* 8. Contact / CTA */}
        <Contact />
      </main>
      <Footer />
    </div>
    </MobileFirstLayout>
  );
}
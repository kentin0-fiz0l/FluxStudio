import { Button } from './ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { Text3D } from './Text3D';

export function Hero() {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Interactive gradient overlay that works with floating graphics */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/20 to-zinc-950/40"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-sm mb-12">
            <span className="w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full mr-3 animate-pulse"></span>
            Now booking for 2026 season
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
          
          <p className="text-label text-off-white/80 max-w-3xl mx-auto mb-4">
            Marching Arts Creative Design Shop
          </p>
          
          <p className="text-technical text-xl md:text-2xl text-off-white/60 max-w-2xl mx-auto mb-12">
            Bringing form, flow, and impact to ensembles through 
            modern, accessible, and visually striking design.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button size="lg" className="btn-glass-gradient text-white font-semibold px-8 py-4 text-lg" asChild>
              <a href="#contact" className="inline-flex items-center relative z-10">
                Book a Consult
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            
            <Button variant="outline" size="lg" className="btn-glass-outline text-white hover:text-white transition-all duration-300 px-8 py-4 text-lg" asChild>
              <a href="#work" className="inline-flex items-center relative z-10">
                <Play className="mr-2 h-5 w-5" />
                View Work
              </a>
            </Button>
          </div>
          
          <div className="mt-20 text-sm text-off-white/50">
            <span>Creative Direction by </span>
            <span className="gradient-text font-medium">Kentino</span>
          </div>
        </div>
      </div>
    </section>
  );
}
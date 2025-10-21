import { forwardRef } from 'react';
import { Button } from './ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { Text3D } from './Text3D';

// ForwardRef wrapper for anchor elements to fix Slot ref warnings
const ForwardedAnchor = forwardRef<HTMLAnchorElement, React.ComponentProps<'a'>>((props, ref) => (
  <a {...props} ref={ref} />
));
ForwardedAnchor.displayName = "ForwardedAnchor";

export function Hero() {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
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
          
          <p className="text-label text-off-white/80 max-w-3xl mx-auto mb-4">
            Creative Design Studio for Marching Arts
          </p>

          <p className="text-technical text-lg text-off-white/60 max-w-2xl mx-auto mb-4">
            <strong className="text-off-white">Tagline:</strong> Design in Motion
          </p>

          <p className="text-technical text-xl md:text-2xl text-off-white/60 max-w-2xl mx-auto mb-12">
            Visual design concepts, mockups, storyboarded show ideas — founded and led by <span className="text-off-white font-semibold">Kentino</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button size="lg" className="btn-glass-gradient text-white font-semibold px-8 py-4 text-lg" asChild>
              <ForwardedAnchor href="#contact" className="inline-flex items-center relative z-10">
                Book a Consult
                <ArrowRight className="ml-2 h-5 w-5" />
              </ForwardedAnchor>
            </Button>

            <Button variant="outline" size="lg" className="btn-glass-outline text-white hover:text-white transition-all duration-300 px-8 py-4 text-lg" asChild>
              <ForwardedAnchor href="#concepts" className="inline-flex items-center relative z-10">
                <Play className="mr-2 h-5 w-5" />
                View Concepts
              </ForwardedAnchor>
            </Button>
          </div>
          
          <div className="mt-20 text-sm text-off-white/50">
            <span>Founded by </span>
            <span className="gradient-text font-medium">Kentino</span>
          </div>
        </div>
      </div>
    </section>
  );
}
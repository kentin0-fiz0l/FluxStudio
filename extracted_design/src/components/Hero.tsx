import { Button } from './ui/button';
import { ArrowRight, Play } from 'lucide-react';

export function Hero() {
  return (
    <section id="home" className="pt-20 pb-16 lg:pt-24 lg:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-sm mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Now booking for 2026 season
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl mb-6 max-w-4xl mx-auto leading-tight tracking-tight font-semibold" style={{ fontFamily: 'var(--font-title)' }}>
            Design in{' '}
            <span className="gradient-text">Motion</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Bringing form, flow, and impact to marching bands and ensembles through 
            modern, accessible, and visually striking design.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" asChild>
              <a href="#contact" className="inline-flex items-center">
                Start Your Project
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            
            <Button variant="outline" size="lg" asChild>
              <a href="#work" className="inline-flex items-center">
                <Play className="mr-2 h-4 w-4" />
                View Our Work
              </a>
            </Button>
          </div>
          
          <div className="mt-16 text-sm text-gray-500">
            <span className="gradient-text">Creative Direction by Kentino</span>
          </div>
        </div>
      </div>
    </section>
  );
}
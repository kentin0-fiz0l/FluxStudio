import { useState } from 'react';
import { ChevronLeft, ChevronRight, Palette, Users, Layers } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function CreativeShowcase() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const speculative = [
    {
      title: 'Metamorphic Structures',
      type: 'Prop Concept',
      description: 'Transforming geometric forms that shift between organic and architectural elements throughout the show.',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMHNjdWxwdHVyZXxlbnwxfHx8fDE3NTgxMjc5NDZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      icon: Layers,
      concept: 'Modular design allowing real-time transformation'
    },
    {
      title: 'Fluid Formation Theory',
      type: 'Drill Innovation',
      description: 'Revolutionary approach to drill design using mathematical flow dynamics and organic movement patterns.',
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbHVpZCUyMGZsb3clMjBhYnN0cmFjdHxlbnwxfHx8fDE3NTgxMjc5NDZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      icon: Users,
      concept: 'Biomimetic movement creating living geometry'
    },
    {
      title: 'Chromatic Resonance',
      type: 'Visual System',
      description: 'Interactive color-responsive elements that react to musical frequencies and performer movement.',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xvcmZ1bCUyMGxpZ2h0JTIwYWJzdHJhY3R8ZW58MXx8fHwxNzU4MTI3OTQ2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      icon: Palette,
      concept: 'Technology-enhanced theatrical design'
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % speculative.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + speculative.length) % speculative.length);
  };

  return (
    <section className="py-32 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-7xl lg:text-8xl mb-6 tracking-tight font-black text-off-white" style={{ fontFamily: 'var(--font-title)' }}>
            EXPERIMENTAL
          </h2>
          <p className="text-xl text-off-white/70 max-w-3xl mx-auto mb-4">
            Experimental concepts pushing the boundaries of marching arts design
          </p>
          <p className="text-off-white/50 max-w-2xl mx-auto">
            An artistic laboratory where innovation meets performance
          </p>
        </div>

        <div className="relative">
          {/* Main showcase */}
          <div className="relative overflow-hidden rounded-3xl">
            <div 
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {speculative.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div key={index} className="w-full flex-shrink-0">
                    <div className="relative h-96 md:h-[500px] overflow-hidden rounded-3xl">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                      
                      {/* Content overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-black" />
                          </div>
                          <Badge className="bg-white/10 backdrop-blur-sm text-off-white border-white/20">
                            {item.type}
                          </Badge>
                        </div>
                        
                        <h3 className="text-3xl md:text-5xl font-black text-off-white mb-4" style={{ fontFamily: 'var(--font-title)' }}>
                          {item.title}
                        </h3>
                        
                        <p className="text-lg text-off-white/80 mb-4 max-w-2xl">
                          {item.description}
                        </p>
                        
                        <p className="text-sm text-off-white/60 italic max-w-xl">
                          <span className="gradient-text font-medium">Concept:</span> {item.concept}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              className="btn-glass-outline text-off-white w-12 h-12 rounded-full p-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex space-x-2">
              {speculative.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-gradient-to-r from-yellow-400 to-pink-500' 
                      : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={nextSlide}
              className="btn-glass-outline text-off-white w-12 h-12 rounded-full p-0"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-off-white/60 mb-6 max-w-2xl mx-auto">
            These experimental works represent our commitment to advancing the marching arts through innovative design thinking and creative exploration.
          </p>
          <Button variant="outline" className="btn-glass-outline text-off-white px-8 py-4 text-lg">
            <span className="relative z-10">Explore Creative Process</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
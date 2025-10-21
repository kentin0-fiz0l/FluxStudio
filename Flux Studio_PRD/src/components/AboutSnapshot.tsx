import { ImageWithFallback } from './figma/ImageWithFallback';
import kentinoHeadshot from 'figma:asset/77df102c051da8e4526d9646379eb0536120af9a.png';

export function AboutSnapshot() {
  return (
    <section className="py-20 bg-zinc-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Kentino wordmark and headshot */}
          <div className="text-center md:text-left">
            {/* Kentino Headshot */}
            <div className="flex justify-center md:justify-start mb-8">
              <div className="relative">
                {/* Gradient ring around headshot */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 via-cyan-400 to-green-500 p-1">
                  <div className="w-full h-full rounded-full bg-zinc-900/90 backdrop-blur-sm"></div>
                </div>
                
                {/* Headshot with circular frame */}
                <div className="relative w-32 h-32 md:w-40 md:h-40">
                  <ImageWithFallback
                    src={kentinoHeadshot}
                    alt="Kentino - Creative Director"
                    className="w-full h-full object-cover rounded-full border-4 border-white/10 shadow-2xl"
                  />
                  
                  {/* Subtle glassmorphic overlay */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/5 via-transparent to-transparent backdrop-blur-[1px]"></div>
                </div>
              </div>
            </div>
            
            <div className="inline-block">
              <h3 className="text-label text-off-white mb-4">
                Creative Direction By
              </h3>
              <div className="text-display text-4xl md:text-6xl gradient-text">
                KENTINO
              </div>
              <p className="text-sm text-off-white/60 mt-2 font-medium">
                Jason Ino, Founder
              </p>
            </div>
          </div>

          {/* Right side - Philosophy */}
          <div>
            <p className="text-technical text-xl md:text-2xl text-off-white/90 mb-6">
              We believe in design that moves—literally and emotionally. Every formation, every prop, every moment is crafted with intention.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <span className="text-label text-off-white">01</span>
                <span className="text-technical text-lg text-off-white">
                  <strong className="text-off-white">Form.</strong> The visual architecture that commands attention.
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-label text-off-white">02</span>
                <span className="text-technical text-lg text-off-white">
                  <strong className="text-off-white">Flow.</strong> The seamless movement that tells your story.
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-label text-off-white">03</span>
                <span className="text-technical text-lg text-off-white">
                  <strong className="text-off-white">Impact.</strong> The unforgettable moments that define greatness.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dotted divider */}
        <div className="mt-16 flex items-center justify-center">
          <div className="flex space-x-3">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i % 4 === 0 ? 'bg-yellow-400' :
                  i % 4 === 1 ? 'bg-pink-500' :
                  i % 4 === 2 ? 'bg-purple-600' :
                  'bg-cyan-400'
                }`}
                style={{
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
import { ImageWithFallback } from './figma/ImageWithFallback';
import kentinoHeadshot from 'figma:asset/77df102c051da8e4526d9646379eb0536120af9a.png';

export function AboutSnapshot() {
  return (
    <section id="about">
      <div>
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left side - Kentino wordmark and headshot */}
          <div className="text-center md:text-left px-4 md:px-0">
            {/* About header */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl mb-8 tracking-tight font-semibold text-off-white" style={{ fontFamily: 'var(--font-title)' }}>
              About Flux Studio
            </h2>

            {/* Kentino Headshot */}
            <div className="flex justify-center md:justify-start mb-8">
              <div className="w-48 h-64 md:w-56 md:h-72">
                <ImageWithFallback
                  src={kentinoHeadshot}
                  alt="Kentino - Creative Director"
                  className="w-full h-full object-cover rounded-lg shadow-2xl"
                />
              </div>
            </div>

            <div className="w-full max-w-full overflow-visible" style={{ minHeight: '4rem' }}>
              <div className="text-base sm:text-lg md:text-xl lg:text-xl xl:text-xl gradient-text rock-salt-text" style={{ lineHeight: '1.5', fontWeight: '600' }}>
                KENTINO
              </div>
              <p className="text-sm text-off-white/60 mt-2 font-medium">
                Founder & Creative Director
              </p>
            </div>
          </div>

          {/* Right side - Philosophy */}
          <div className="px-4 md:px-0">
            <div className="space-y-4">
              <p className="text-technical text-lg md:text-xl lg:text-2xl text-off-white/90">
                Flux Studio is a creative design studio for performing arts groups (e.g. marching band, color guard and percussion ensembles). Founded by <strong>Kentino</strong>, the Flux Studio is where vision meets movement. We shape visuals that aren't just seen — they're felt. Our ethos is simple: <strong className="text-off-white gradient-text">Design in Motion.</strong>
              </p>
              <p className="text-technical text-lg text-off-white/80">
                Our work embraces form, flow, contrast, and storytelling. Whether it's a concept sketch, a storyboard, or full staging design, every creative decision aims for clarity, impact, and emotional resonance. Flux Studio is built to evolve — guided by its vision and strengthened by collaborators united under a shared creative purpose.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
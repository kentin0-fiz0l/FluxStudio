import { forwardRef } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

// ForwardRef wrapper for anchor elements to fix Slot ref warnings
const ForwardedAnchor = forwardRef<HTMLAnchorElement, React.ComponentProps<'a'>>((props, ref) => (
  <a {...props} ref={ref} />
));
ForwardedAnchor.displayName = "ForwardedAnchor";

export function Services() {
  const services = [
    {
      image: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      title: 'Design Concepts',
      description: 'Two unique directions with mood boards, shape/color systems, and scene ideas to chart your creative path.',
      features: ['Mood boards', 'Shape/color systems', 'Scene ideas', 'Creative direction'],
      audience: 'Foundation Package'
    },
    {
      image: 'https://images.pexels.com/photos/7550312/pexels-photo-7550312.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      title: 'Storyboarding & Mockups',
      description: 'Key frames and mockups that help staff and performers align visually.',
      features: ['Key frame design', 'Visual mockups', 'Scene transitions', 'Show flow'],
      audience: 'Visual Alignment'
    },
    {
      image: 'https://images.pexels.com/photos/763412/pexels-photo-763412.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      title: 'Drill & Staging Design',
      description: 'Full or partial layouts: pathways, clusters, transitions designed for clarity and presence.',
      features: ['Movement pathways', 'Formation clusters', 'Transitions', 'Stage presence'],
      audience: 'Performance Design'
    },
    {
      image: 'https://images.pexels.com/photos/8837511/pexels-photo-8837511.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      title: 'Props & Scenic Concepts',
      description: 'Sketches, materials, staging maps — creative sparks for what your stage can become.',
      features: ['Concept sketches', 'Material specs', 'Staging maps', 'Visual integration'],
      audience: 'Visual Elements'
    },
    {
      image: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      title: 'Design Consultation',
      description: 'One-on-one sessions with Kentino to refine your show\'s identity, troubleshoot issues, and plan impact moments.',
      features: ['Show identity', 'Issue resolution', 'Impact planning', 'Creative guidance'],
      audience: 'Direct with Kentino'
    },
    {
      image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      title: 'Ongoing Visual Support',
      description: 'Monthly check-ins, mid-season rewrites, and video note feedback so your show stays sharp all season.',
      features: ['Monthly check-ins', 'Mid-season updates', 'Video feedback', 'Season-long support'],
      audience: 'Full Season Support'
    }
  ];

  return (
    <section id="services">
      <div>
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-7xl lg:text-8xl mb-6 tracking-tight font-black text-off-white" style={{ fontFamily: 'var(--font-title)' }}>
            WHAT WE CREATE
          </h2>
          <p className="text-xl text-off-white/70 max-w-3xl mx-auto">
            At Flux Studio, clients can choose founder-led services or studio-level packages. Everything we do is rooted in our belief: <strong className="text-off-white">Design in Motion.</strong>
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            return (
              <div key={index} className="group cursor-pointer">
                <div className="relative bg-black backdrop-blur-sm border border-white/20 rounded-2xl hover:border-white/40 transition-all duration-500 h-full overflow-hidden">
                  {/* Image container taking up top third with rectangular aspect ratio */}
                  <div className="w-full h-48 overflow-hidden">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Content container with padding */}
                  <div className="p-8">
                  
                  <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                    {service.title}
                  </h3>
                  
                  <p className="text-white/90 text-base mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <h4 className="text-sm mb-3 text-white/95 font-semibold uppercase tracking-wide">Includes:</h4>
                      <ul className="space-y-2">
                        {service.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="text-sm text-white/80 flex items-center">
                            <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mr-3"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Badge className="bg-black text-white text-xs border border-white/30">
                      {service.audience}
                    </Badge>
                  </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <p className="text-off-white/70 mb-6 text-lg">
            Ready to create visuals that move audiences? Whether you're starting from scratch or refining your design, Flux Studio is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button className="btn-glass-gradient text-white font-semibold px-8 py-4 text-lg" asChild>
              <ForwardedAnchor href="#contact" className="inline-flex items-center relative z-10">
                Book a Consult
                <ArrowRight className="ml-2 h-5 w-5" />
              </ForwardedAnchor>
            </Button>
            <Button variant="outline" className="btn-glass-outline text-off-white px-8 py-4 text-lg" asChild>
              <ForwardedAnchor href="#concepts" className="relative z-10">View Concepts</ForwardedAnchor>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
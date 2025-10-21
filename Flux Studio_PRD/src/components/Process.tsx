import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { MessageSquare, Palette, Users, CheckCircle } from 'lucide-react';

export function Process() {
  const steps = [
    {
      icon: MessageSquare,
      title: 'Discovery & Consultation',
      description: 'We start with a comprehensive consultation to understand your vision, goals, and constraints.',
      details: [
        'Initial program assessment',
        'Budget and timeline discussion',
        'Theme and concept development',
        'Technical requirements review'
      ],
      duration: '1-2 weeks'
    },
    {
      icon: Palette,
      title: 'Creative Development',
      description: 'Our team develops initial concepts, sketches, and design frameworks tailored to your program.',
      details: [
        'Concept sketches and mockups',
        'Drill formation studies',
        'Prop and staging concepts',
        'Visual style guide creation'
      ],
      duration: '2-3 weeks'
    },
    {
      icon: Users,
      title: 'Collaborative Refinement',
      description: 'Working closely with your staff, we refine and perfect every aspect of the design.',
      details: [
        'Staff feedback integration',
        'Design iteration and polish',
        'Technical specification finalization',
        'Performance logistics planning'
      ],
      duration: '2-4 weeks'
    },
    {
      icon: CheckCircle,
      title: 'Delivery & Support',
      description: 'Complete deliverables with ongoing support to ensure successful implementation.',
      details: [
        'Detailed charts and diagrams',
        'Construction guides and specs',
        'Training materials and videos',
        'Season-long consultation support'
      ],
      duration: 'Ongoing'
    }
  ];

  return (
    <section id="process" className="py-32 bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-display text-5xl md:text-7xl lg:text-8xl mb-6 text-off-white">
            PROCESS
          </h2>
          <p className="text-xl text-off-white/70 max-w-2xl mx-auto">
            A collaborative approach that ensures your vision comes to life with precision and impact
          </p>
        </div>

        {/* Horizontal process flow */}
        <div className="relative mb-16">
          {/* Animated connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-400 opacity-30"></div>
          
          <div className="grid lg:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="group text-center">
                  {/* Animated dot */}
                  <div className="relative mb-6">
                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${
                      index % 4 === 0 ? 'bg-gradient-to-br from-pink-500 to-pink-600' :
                      index % 4 === 1 ? 'bg-gradient-to-br from-purple-600 to-purple-700' :
                      index % 4 === 2 ? 'bg-gradient-to-br from-cyan-400 to-cyan-500' :
                      'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    } group-hover:scale-110 group-hover:shadow-lg`}>
                      <IconComponent className="w-10 h-10 text-black" />
                    </div>
                    
                    {/* Step number */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-xs font-bold text-off-white border border-white/20">
                      {index + 1}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-off-white group-hover:gradient-text transition-all duration-300" style={{ fontFamily: 'var(--font-heading)' }}>
                      {step.title}
                    </h3>
                    
                    <p className="text-technical text-sm text-off-white/70">
                      {step.description}
                    </p>
                    
                    <div className="text-label text-off-white/50">
                      {step.duration}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-12 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-off-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              Timeline & Scheduling
            </h3>
            <p className="text-off-white/70 mb-8 text-lg leading-relaxed">
              Most projects are completed within 6-10 weeks from initial consultation to final delivery. 
              We recommend starting 3-4 months before your season to allow adequate rehearsal time.
            </p>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-data text-4xl gradient-text">15+</div>
                <div className="text-label text-off-white/60">Programs Designed</div>
              </div>
              <div className="space-y-2">
                <div className="text-data text-4xl gradient-text">6-10</div>
                <div className="text-label text-off-white/60">Week Timeline</div>
              </div>
              <div className="space-y-2">
                <div className="text-data text-4xl gradient-text">100%</div>
                <div className="text-label text-off-white/60">Client Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
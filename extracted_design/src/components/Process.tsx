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
    <section id="process" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl mb-4 tracking-tight font-semibold" style={{ fontFamily: 'var(--font-title)' }}>
            Our Process
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A collaborative approach that ensures your vision comes to life with precision and impact
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <Card key={index} className="relative group">
                {/* Step connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/4 -right-4 w-8 h-0.5 bg-gradient-path opacity-30"></div>
                )}
                
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-2">
                    Step {index + 1}
                  </div>
                  
                  <CardTitle className="text-lg mb-2">
                    {step.title}
                  </CardTitle>
                  
                  <CardDescription>
                    {step.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-primary">
                      Timeline: {step.duration}
                    </div>
                    
                    <ul className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="text-sm text-gray-600 flex items-start">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-2 flex-shrink-0"></div>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 max-w-3xl mx-auto shadow-sm border border-gray-100">
            <h3 className="text-2xl mb-4">
              Timeline & Scheduling
            </h3>
            <p className="text-gray-600 mb-6">
              Most projects are completed within 6-10 weeks from initial consultation to final delivery. 
              We recommend starting 3-4 months before your season to allow adequate rehearsal time.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl mb-2 gradient-text">15+</div>
                <div className="text-sm text-gray-600">Programs Designed</div>
              </div>
              <div>
                <div className="text-2xl mb-2 gradient-text">6-10</div>
                <div className="text-sm text-gray-600">Week Timeline</div>
              </div>
              <div>
                <div className="text-2xl mb-2 gradient-text">100%</div>
                <div className="text-sm text-gray-600">Client Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
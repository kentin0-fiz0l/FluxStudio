import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ArrowRight, Users, Palette, MessageCircle } from 'lucide-react';

export function Services() {
  const services = [
    {
      icon: Users,
      title: 'Drill & Staging Packages',
      description: 'Complete visual programs with precision drill writing and dynamic staging that tells your story.',
      features: ['Custom drill charts', 'Movement coordination', 'Formation design', 'Staging maps'],
      price: 'Starting at $2,500',
      audience: 'High School • Independent • College'
    },
    {
      icon: Palette,
      title: 'Prop & Scenic Design',
      description: 'Innovative props and scenic elements that enhance your show\'s visual impact and support your theme.',
      features: ['3D prop design', 'CAD renderings', 'Construction guides', 'Visual integration'],
      price: 'Starting at $1,500',
      audience: 'All Levels • Custom Builds'
    },
    {
      icon: MessageCircle,
      title: 'Consulting & Clinics',
      description: 'Expert guidance and hands-on clinics to elevate your program\'s creative vision and execution.',
      features: ['Program consultation', 'Staff training', 'Design workshops', 'Season planning'],
      price: 'Starting at $500',
      audience: 'Directors • Staff • Students'
    }
  ];

  return (
    <section id="services" className="py-32 bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-7xl lg:text-8xl mb-6 tracking-tight font-black text-off-white" style={{ fontFamily: 'var(--font-title)' }}>
            SERVICES
          </h2>
          <p className="text-xl text-off-white/70 max-w-2xl mx-auto">
            Comprehensive design solutions tailored to your ensemble's needs and budget
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div key={index} className="group cursor-pointer">
                <div className="relative p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:border-white/20 transition-all duration-500 h-full">
                  <div className="w-16 h-16 bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-400 rounded-2xl flex items-center justify-center mb-6">
                    <IconComponent className="w-8 h-8 text-black" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-off-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                    {service.title}
                  </h3>
                  
                  <p className="text-off-white/70 text-base mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <h4 className="text-sm mb-3 text-off-white/80 font-semibold uppercase tracking-wide">Includes:</h4>
                      <ul className="space-y-2">
                        {service.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="text-sm text-off-white/60 flex items-center">
                            <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mr-3"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xl font-bold text-off-white">{service.price}</span>
                    </div>
                    <Badge className="bg-white/10 text-off-white/70 text-xs mb-4">
                      {service.audience}
                    </Badge>
                    
                    <Button className="w-full btn-glass-gradient text-white font-semibold" asChild>
                      <a href="#contact" className="inline-flex items-center justify-center relative z-10">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <p className="text-off-white/70 mb-6 text-lg">
            Need a custom package? We work with programs of all sizes and budgets.
          </p>
          <Button variant="outline" className="btn-glass-outline text-off-white px-8 py-4 text-lg" asChild>
            <a href="#contact" className="relative z-10">Discuss Custom Solutions</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
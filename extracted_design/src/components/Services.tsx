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
    <section id="services" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl mb-4 tracking-tight font-semibold" style={{ fontFamily: 'var(--font-title)' }}>
            Our Services
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive design solutions tailored to your ensemble's needs and budget
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card key={index} className="relative group hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                  <CardDescription className="text-base">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm mb-2 text-gray-600">Includes:</h4>
                      <ul className="space-y-1">
                        {service.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="text-sm text-gray-600 flex items-center">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{service.price}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {service.audience}
                      </Badge>
                    </div>
                    
                    <Button asChild className="w-full">
                      <a href="#contact" className="inline-flex items-center justify-center">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Need a custom package? We work with programs of all sizes and budgets.
          </p>
          <Button variant="outline" asChild>
            <a href="#contact">Discuss Custom Solutions</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
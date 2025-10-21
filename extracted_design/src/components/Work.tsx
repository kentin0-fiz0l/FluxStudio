import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ExternalLink, Calendar, MapPin } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function Work() {
  const projects = [
    {
      title: 'Lincoln High School Marching Band',
      subtitle: '"Metamorphosis"',
      year: '2025',
      type: 'Drill & Staging Package',
      location: 'California',
      image: 'https://images.unsplash.com/photo-1692783332531-2b9861af21f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJjaGluZyUyMGJhbmQlMjBwZXJmb3JtYW5jZSUyMHN0YWRpdW18ZW58MXx8fHwxNzU4MTI3OTQ0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      description: 'A transformative show exploring themes of change and growth through dynamic drill formations and innovative staging.',
      achievements: ['Regional Champions', 'Best Visual Design', '95+ Band Members'],
      featured: true
    },
    {
      title: 'Skyline Independent Guard',
      subtitle: '"Electric Dreams"',
      year: '2025',
      type: 'Prop & Scenic Design',
      location: 'Texas',
      image: 'https://images.unsplash.com/photo-1735835593857-7b8c43f223f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aW50ZXIlMjBndWFyZCUyMGNvbG9yZ3VhcmQlMjBwZXJmb3JtYW5jZXxlbnwxfHx8fDE3NTgxMjc5NDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      description: 'Futuristic LED-integrated props and architectural elements creating an immersive electronic landscape.',
      achievements: ['WGI Semi-Finals', 'Innovation Award', 'Viral Social Media'],
      featured: false
    },
    {
      title: 'Mountain View University Band',
      subtitle: '"Convergence"',
      year: '2024',
      type: 'Complete Visual Package',
      location: 'Colorado',
      image: 'https://images.unsplash.com/photo-1590844173529-8a303db29cd0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcnVtJTIwY29ycHMlMjBmb3JtYXRpb24lMjBmaWVsZHxlbnwxfHx8fDE3NTgxMjc5NDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      description: 'A complete visual overhaul combining precision drill, theatrical staging, and custom props for a collegiate powerhouse.',
      achievements: ['Conference Champions', '200+ Members', 'TV Featured'],
      featured: false
    },
    {
      title: 'Revolution Drum Corps',
      subtitle: '"Phoenix Rising"',
      year: '2024',
      type: 'Drill & Staging Package',
      location: 'Arizona',
      image: 'https://images.unsplash.com/photo-1716563718545-6d53f4cf4f53?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJjaGluZyUyMGJhbmQlMjBkcmlsbCUyMGZvcm1hdGlvbiUyMGFlcmlhbHxlbnwxfHx8fDE3NTgxMjc5NDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      description: 'High-energy drill design with complex formations and seamless transitions for an Open Class drum corps.',
      achievements: ['DCI Finals', 'Visual Excellence', '150+ Members'],
      featured: false
    }
  ];

  return (
    <section id="work" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl mb-4 tracking-tight font-semibold" style={{ fontFamily: 'var(--font-title)' }}>
            Our Work
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transforming ensembles through innovative design and creative vision
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <span className="gradient-text">Creative Direction by Kentino</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <Card key={index} className={`overflow-hidden group hover:shadow-xl transition-all duration-300 ${project.featured ? 'lg:col-span-2' : ''}`}>
              <div className={`${project.featured ? 'md:flex' : ''}`}>
                <div className={`relative overflow-hidden ${project.featured ? 'md:w-1/2' : ''}`}>
                  <ImageWithFallback
                    src={project.image}
                    alt={project.title}
                    className="w-full h-64 md:h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary">{project.type}</Badge>
                  </div>
                </div>
                
                <div className={`${project.featured ? 'md:w-1/2' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{project.year}</span>
                        <MapPin className="w-4 h-4 ml-2" />
                        <span>{project.location}</span>
                      </div>
                    </div>
                    
                    <CardTitle className="text-xl md:text-2xl">
                      {project.title}
                    </CardTitle>
                    <CardDescription className="text-lg italic text-primary">
                      {project.subtitle}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      {project.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.achievements.map((achievement, achievementIndex) => (
                        <Badge key={achievementIndex} variant="outline" className="text-xs">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Case Study
                    </Button>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Ready to create something extraordinary for your ensemble?
          </p>
          <Button asChild size="lg">
            <a href="#contact">Start Your Project</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
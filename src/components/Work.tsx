import { forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ExternalLink, Calendar, MapPin } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

// ForwardRef wrapper for anchor elements to fix Slot ref warnings
const ForwardedAnchor = forwardRef<HTMLAnchorElement, React.ComponentProps<'a'>>((props, ref) => (
  <a {...props} ref={ref} />
));
ForwardedAnchor.displayName = "ForwardedAnchor";

export function Work() {
  const projects = [
    {
      title: 'Lincoln High School Marching Band',
      subtitle: '"Metamorphosis"',
      year: '2025',
      type: 'Drill & Staging Package',
      location: 'California',
      image: '/placeholders/marching-band-stadium.jpg',
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
      image: '/placeholders/winter-guard-performance.jpg',
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
      image: '/placeholders/drum-corps-formation.jpg',
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
      image: '/placeholders/drill-formation-aerial.jpg',
      description: 'High-energy drill design with complex formations and seamless transitions for an Open Class drum corps.',
      achievements: ['DCI Finals', 'Visual Excellence', '150+ Members'],
      featured: false
    }
  ];

  return (
    <section id="work" className="py-32 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-7xl lg:text-8xl mb-6 tracking-tight font-black text-off-white" style={{ fontFamily: 'var(--font-title)' }}>
            OUR WORK
          </h2>
          <p className="text-xl text-off-white/70 max-w-2xl mx-auto">
            Transforming ensembles through innovative design and creative vision
          </p>
          <div className="mt-4 text-sm text-off-white/50">
            <span>Creative Direction by </span>
            <span className="gradient-text font-medium">Kentino</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <div key={index} className={`group cursor-pointer ${project.featured ? 'lg:col-span-2' : ''}`}>
              <div className={`relative overflow-hidden rounded-2xl bg-card-solid backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-500 ${project.featured ? 'md:flex md:h-96' : 'h-80'}`}>
                {/* Image */}
                <div className={`relative overflow-hidden ${project.featured ? 'md:w-3/5' : 'h-1/2'}`}>
                  <ImageWithFallback
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-primary-600 text-white font-semibold">
                      {project.type}
                    </Badge>
                  </div>
                </div>
                
                {/* Content */}
                <div className={`p-6 flex flex-col justify-center ${project.featured ? 'md:w-2/5' : 'h-1/2'}`}>
                  <div className="flex items-center space-x-4 text-sm text-off-white/60 mb-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{project.year}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{project.location}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-bold text-off-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    {project.title}
                  </h3>
                  <p className="text-lg italic mb-3">
                    <span className="gradient-text">{project.subtitle}</span>
                  </p>
                  
                  <p className="text-off-white/70 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {project.achievements.map((achievement, achievementIndex) => (
                      <Badge key={achievementIndex} variant="outline" className="text-xs border-white/20 text-off-white/60">
                        {achievement}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-off-white/70 mb-6 text-lg">
            Ready to create something extraordinary for your ensemble?
          </p>
          <Button className="btn-glass-gradient text-white font-semibold px-8 py-4 text-lg" asChild size="lg">
            <ForwardedAnchor href="#contact" className="relative z-10">Start Your Project</ForwardedAnchor>
          </Button>
        </div>
      </div>
    </section>
  );
}
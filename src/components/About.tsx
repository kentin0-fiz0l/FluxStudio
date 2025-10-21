import { Card, CardContent } from './ui/card';
import { Award, Users, Lightbulb, Heart } from 'lucide-react';
import kentinoHeadshot from 'figma:asset/77df102c051da8e4526d9646379eb0536120af9a.png';

export function About() {
  const values = [
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'Pushing creative boundaries while respecting marching arts traditions'
    },
    {
      icon: Users,
      title: 'Collaboration',
      description: 'Working hand-in-hand with directors and staff to realize their vision'
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'Delivering professional-quality designs that elevate performance'
    },
    {
      icon: Heart,
      title: 'Passion',
      description: 'Genuine love for the marching arts and the students who perform'
    }
  ];

  return (
    <section id="about" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left column - Image and basic info */}
          <div>
            <div className="relative">
              <img
                src={kentinoHeadshot}
                alt="Jason Ino - Kentino, Creative Director of Flux Studio"
                className="w-full h-[500px] object-cover rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-lg">
                <div className="text-2xl mb-1 gradient-text">Kentino</div>
                <div className="text-sm text-gray-600">Creative Director</div>
              </div>
            </div>
          </div>

          {/* Right column - Content */}
          <div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl mb-6 tracking-tight font-semibold" style={{ fontFamily: 'var(--font-title)' }}>
              About Flux Studio
            </h2>
            
            <div className="space-y-6 text-gray-600">
              <p>
                Flux Studio was founded on the belief that every marching ensemble, 
                regardless of size or budget, deserves access to professional-quality 
                visual design that elevates their performance and connects with audiences.
              </p>
              
              <p>
                Led by <span className="gradient-text">Jason Ino (Kentino)</span>, our studio 
                combines years of marching arts experience with a fresh, modern approach to 
                visual design. We specialize in creating cohesive visual programs that balance 
                artistic innovation with practical execution.
              </p>
              
              <p>
                From high school programs taking their first steps toward competitive excellence 
                to established ensembles seeking to push creative boundaries, we work collaboratively 
                to bring your vision to life through drill, staging, props, and scenic design.
              </p>
            </div>

            <div className="mt-8 p-6 border border-gray-200 dark:border-gray-700 rounded-2xl">
              <h3 className="text-xl mb-4">Meet Kentino</h3>
              <p className="text-gray-600 text-sm">
                Jason Ino, known artistically as Kentino, brings over a decade of experience 
                in marching arts design and performance. A former DCI performer and visual 
                instructor, Jason combines technical expertise with an eye for contemporary 
                design trends, creating programs that resonate with both judges and audiences.
              </p>
            </div>
          </div>
        </div>

        {/* Values section */}
        <div className="mt-20">
          <h3 className="text-2xl text-center mb-12">Our Values</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <Card key={index} className="text-center p-6 border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-lg mb-2">{value.title}</h4>
                    <p className="text-sm text-gray-600">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Mission statement */}
        <div className="mt-20 text-center">
          <div className="max-w-4xl mx-auto">
            <blockquote className="text-2xl md:text-3xl text-gray-700 italic leading-relaxed">
              "Our mission is to bring form, flow, and impact to ensembles through 
              modern, accessible, and visually striking design."
            </blockquote>
            <div className="mt-6 text-sm text-gray-500">
              <span className="gradient-text">— Flux Studio Mission Statement</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
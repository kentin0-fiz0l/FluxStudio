import { Card, CardContent } from './ui/card';
import { Star, Quote } from 'lucide-react';

export function Testimonials() {
  const testimonials = [
    {
      quote: "Working with Flux Studio transformed our program. The drill designs were innovative yet achievable, and our students have never been more excited about their show.",
      author: "Sarah Martinez",
      title: "Band Director",
      school: "Lincoln High School",
      rating: 5,
      year: "2025"
    },
    {
      quote: "Kentino's creative vision brought our 'Electric Dreams' concept to life in ways we never imagined. The prop designs were absolutely stunning and perfectly executable.",
      author: "Michael Chen",
      title: "Visual Coordinator",
      school: "Skyline Independent Guard",
      rating: 5,
      year: "2025"
    },
    {
      quote: "The attention to detail and collaborative approach made all the difference. Flux Studio didn't just design for us, they designed with us.",
      author: "Dr. Jennifer Rodriguez",
      title: "Director of Bands",
      school: "Mountain View University",
      rating: 5,
      year: "2024"
    },
    {
      quote: "Professional quality design at a price point that works for high school programs. The support throughout the season was exceptional.",
      author: "David Thompson",
      title: "Band Director",
      school: "Central Valley High School",
      rating: 5,
      year: "2024"
    },
    {
      quote: "The visual impact of our show increased dramatically. We went from middle-of-the-pack to finals contention in one season.",
      author: "Lisa Park",
      title: "Program Coordinator",
      school: "Revolution Drum Corps",
      rating: 5,
      year: "2024"
    },
    {
      quote: "Kentino understands both the artistic and practical sides of marching arts. The designs were beautiful and teachable.",
      author: "James Wilson",
      title: "Visual Caption Head",
      school: "Westside Indoor Winds",
      rating: 5,
      year: "2024"
    }
  ];

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl mb-4 tracking-tight font-semibold" style={{ fontFamily: 'var(--font-title)' }}>
            What Directors Say
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Trusted by programs across the country to deliver exceptional results
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative bg-white dark:bg-gray-800 border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Quote className="w-8 h-8 text-primary/20 mr-2" aria-hidden="true" />
                  <div className="flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                    ))}
                  </div>
                </div>
                
                <blockquote className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="pt-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {testimonial.author}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {testimonial.title}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {testimonial.school}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {testimonial.year} Season
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-3xl mx-auto shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-2xl mb-4">Join Our Growing Family</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              From first-time competitors to championship contenders, our programs consistently 
              achieve their goals and exceed expectations.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl mb-2 gradient-text">15+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Programs Designed</div>
              </div>
              <div>
                <div className="text-3xl mb-2 gradient-text">100%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Satisfied Clients</div>
              </div>
              <div>
                <div className="text-3xl mb-2 gradient-text">3</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Years in Business</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
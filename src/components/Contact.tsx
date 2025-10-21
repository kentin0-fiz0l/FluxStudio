import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Mail, Clock, MapPin, Send, CheckCircle } from 'lucide-react';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    ensemble: '',
    season: '',
    theme: '',
    challenges: '',
    timeline: '',
    email: '',
    newsletter: false
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormData = {
    name: '',
    ensemble: '',
    season: '',
    theme: '',
    challenges: '',
    timeline: '',
    email: '',
    newsletter: false
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In a real application, this would send the form data to a backend
    console.log('Form submitted:', formData);

    // Clear form and show success message
    setFormData(initialFormData);
    setIsSubmitting(false);
    setIsSubmitted(true);

    // Hide success message after 5 seconds
    setTimeout(() => {
      setIsSubmitted(false);
    }, 5000);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section id="contact">
      <div>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl mb-4 tracking-tight font-semibold text-off-white" style={{ fontFamily: 'var(--font-title)' }}>
            GET IN TOUCH
          </h2>
          <p className="text-xl text-off-white/70 max-w-3xl mx-auto mb-4">
            Ready to create visuals that move audiences? Whether you're starting from scratch or refining your design, Flux Studio is here to help.
          </p>
          <p className="text-lg text-off-white/60 max-w-2xl mx-auto">
            Every project begins with our guiding ethos: <strong className="text-off-white">Design in Motion.</strong>
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-off-white">Contact Information</CardTitle>
                <CardDescription className="text-off-white/70">
                  Let's start your design journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-pink-500" />
                  <div>
                    <div className="text-sm text-off-white/60">Email</div>
                    <div className="text-off-white">hello@fluxstudio.art</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="text-sm text-off-white/60">Response Time</div>
                    <div className="text-off-white">Within 24 hours</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="text-sm text-off-white/60">Serving</div>
                    <div className="text-off-white">Nationwide (Remote)</div>
                  </div>
                </div>
                
                <div className="pt-6">
                  <h4 className="text-sm mb-3 text-gray-600">Best Times to Contact</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Weekdays 9 AM - 6 PM PST</li>
                    <li>• Emergency: Anytime during season</li>
                    <li>• Off-season: Mon-Fri preferred</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-off-white">Contact Form</CardTitle>
                <CardDescription className="text-off-white/70">
                  Tell us about your project and let's start creating together.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Success notification */}
                {isSubmitted && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <h4 className="text-green-800 dark:text-green-200 font-medium">Message Sent Successfully!</h4>
                        <p className="text-green-700 dark:text-green-300 text-sm">Thank you for your inquiry. We'll get back to you within 24 hours.</p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-off-white">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                        className="bg-input-solid text-off-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-off-white">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        className="bg-input-solid text-off-white"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ensemble" className="text-off-white">Ensemble / School *</Label>
                      <Input
                        id="ensemble"
                        value={formData.ensemble}
                        onChange={(e) => handleInputChange('ensemble', e.target.value)}
                        required
                        className="bg-input-solid text-off-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="season" className="text-off-white">Season & Circuit</Label>
                      <Input
                        id="season"
                        value={formData.season}
                        onChange={(e) => handleInputChange('season', e.target.value)}
                        placeholder="e.g., 2025, DCI, WGI, BOA"
                        className="bg-input-solid text-off-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="theme" className="text-off-white">Theme or Style Ideas</Label>
                    <Input
                      id="theme"
                      value={formData.theme}
                      onChange={(e) => handleInputChange('theme', e.target.value)}
                      placeholder="Tell us about your show concept or theme"
                      className="bg-input-solid text-off-white"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="challenges" className="text-off-white">Visual Challenges</Label>
                      <Textarea
                        id="challenges"
                        value={formData.challenges}
                        onChange={(e) => handleInputChange('challenges', e.target.value)}
                        placeholder="What visual challenges are you facing?"
                        className="min-h-24 bg-input-solid text-off-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeline" className="text-off-white">Timeline</Label>
                      <Select value={formData.timeline} onValueChange={(value) => handleInputChange('timeline', value)}>
                        <SelectTrigger className="bg-input-solid text-off-white">
                          <SelectValue placeholder="When do you need this?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asap">ASAP (Rush)</SelectItem>
                          <SelectItem value="1-month">Within 1 month</SelectItem>
                          <SelectItem value="2-3-months">2-3 months</SelectItem>
                          <SelectItem value="next-season">Next season</SelectItem>
                          <SelectItem value="just-exploring">Just exploring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>


                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="newsletter"
                      checked={formData.newsletter}
                      onCheckedChange={(checked) => handleInputChange('newsletter', checked as boolean)}
                    />
                    <Label htmlFor="newsletter" className="text-sm">
                      Subscribe to our newsletter for design tips and industry updates
                    </Label>
                  </div>

                  <Button type="submit" size="lg" className="btn-glass-submit w-full text-white" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 relative z-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span className="relative z-10">Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4 relative z-10" />
                        <span className="relative z-10">Book a Consult</span>
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-off-white/50 text-center">
                    By submitting this form, you agree to our privacy policy.
                    We'll never share your information and only use it to respond to your inquiry.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="p-8 max-w-3xl mx-auto">
            <p className="text-off-white/60 mb-4">
              Flux Studio — Founded by Kentino
            </p>
            <p className="text-off-white/80">
              Creative Design Studio for Marching Arts | <strong className="gradient-text">Design in Motion</strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
import { Mail, Phone, Instagram, Twitter, Youtube } from 'lucide-react';
import fluxLogo from 'figma:asset/128e5611c12549cded97c5e071b8c30cbaf7c018.png';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    services: [
      { name: 'Drill & Staging', href: '#services' },
      { name: 'Prop Design', href: '#services' },
      { name: 'Consulting', href: '#services' },
      { name: 'Custom Packages', href: '#contact' }
    ],
    company: [
      { name: 'About Us', href: '#about' },
      { name: 'Our Work', href: '#work' },
      { name: 'Process', href: '#process' },
      { name: 'Contact', href: '#contact' }
    ],
    resources: [
      { name: 'Client Portal', href: '#' },
      { name: 'Design Guidelines', href: '#' },
      { name: 'Season Planning', href: '#' },
      { name: 'FAQ', href: '#' }
    ]
  };

  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <img src={fluxLogo} alt="Flux Studio" className="h-8 w-auto mb-4 brightness-0 invert" />
            <p className="text-gray-400 mb-6 text-sm">
              Marching arts creative design shop specializing in drill, staging, prop, and creative consulting services.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm">
                <Mail className="w-4 h-4 text-gray-500" />
                <a href="mailto:hello@fluxstudio.design" className="text-gray-400 hover:text-white transition-colors">
                  hello@fluxstudio.design
                </a>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Phone className="w-4 h-4 text-gray-500" />
                <a href="tel:+15551234567" className="text-gray-400 hover:text-white transition-colors">
                  (555) 123-4567
                </a>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <a href="#" className="text-gray-500 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="lg:col-span-3 grid md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-white text-sm mb-4">Services</h4>
              <ul className="space-y-2">
                {footerLinks.services.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white text-sm mb-4">Company</h4>
              <ul className="space-y-2">
                {footerLinks.company.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white text-sm mb-4">Resources</h4>
              <ul className="space-y-2">
                {footerLinks.resources.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © {currentYear} Flux Studio. All rights reserved.
            </div>
            
            <div className="text-gray-500 text-sm">
              <span className="gradient-text">Creative Direction by Kentino</span>
            </div>
            
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
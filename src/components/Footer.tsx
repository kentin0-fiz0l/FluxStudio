import { Mail, Instagram, Twitter, Youtube } from 'lucide-react';
import fluxLogo from '../assets/128e5611c12549cded97c5e071b8c30cbaf7c018.png';
import { LazyImage } from './LazyImage';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    services: [
      { name: 'Design Concepts', href: '#services' },
      { name: 'Storyboarding', href: '#services' },
      { name: 'Drill & Staging', href: '#services' },
      { name: 'Design Consultation', href: '#services' }
    ],
    company: [
      { name: 'About Flux Studio', href: '#about' },
      { name: 'Our Process', href: '#process' },
      { name: 'Concepts', href: '#concepts' },
      { name: 'Contact', href: '#contact' }
    ],
    resources: [
      { name: 'Design Portfolio', href: '#concepts' },
      { name: 'Season Planning', href: '#process' },
      { name: 'Visual Support', href: '#services' },
      { name: 'Book a Consult', href: '#contact' }
    ]
  };

  return (
    <footer className="text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <LazyImage
              src={fluxLogo}
              alt="Flux Studio"
              className="h-8 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-gray-400 mb-6 text-sm">
              Creative design studio for marching arts, founded by Kentino. We create visuals that move audiences through our ethos: Design in Motion.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm">
                <Mail className="w-4 h-4 text-gray-500" />
                <a href="mailto:hello@fluxstudio.art" className="text-gray-400 hover:text-white transition-colors">
                  hello@fluxstudio.art
                </a>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <span className="text-gray-500 opacity-50 cursor-not-allowed">
                <Instagram className="w-5 h-5" />
              </span>
              <span className="text-gray-500 opacity-50 cursor-not-allowed">
                <Twitter className="w-5 h-5" />
              </span>
              <span className="text-gray-500 opacity-50 cursor-not-allowed">
                <Youtube className="w-5 h-5" />
              </span>
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
        <div className="mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © {currentYear} Flux Studio. All rights reserved.
            </div>
            
            <div className="text-gray-500 text-sm">
              <span className="gradient-text">Flux Studio — Founded by Kentino</span>
              <br />
              <span className="text-gray-400">Creative Design Studio for Marching Arts | <strong className="gradient-text">Design in Motion</strong></span>
            </div>
            
            <div className="text-sm text-gray-500">
              Professional design services for marching arts
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
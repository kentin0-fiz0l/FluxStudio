import { useEffect, useState } from 'react';

export function ScrollTriggeredMotion() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {/* Parallax floating elements that respond to scroll */}
      <div 
        className="absolute w-full h-full opacity-20"
        style={{
          transform: `translateY(${scrollY * 0.1}px) rotate(${scrollY * 0.05}deg)`
        }}
      >
        {/* Large geometric shapes */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-yellow-400/30 rounded-full"></div>
        <div 
          className="absolute top-3/4 right-1/4 w-24 h-24"
          style={{
            transform: `rotate(${scrollY * 0.1}deg)`,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-pink-500/30 to-purple-600/30"></div>
        </div>
        <div 
          className="absolute top-1/2 left-3/4 w-28 h-28 bg-gradient-to-br from-cyan-400/20 to-blue-500/20"
          style={{
            transform: `rotate(${scrollY * -0.08}deg)`,
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%'
          }}
        ></div>
      </div>

      {/* Drill formation particles that shift with scroll */}
      <div className="absolute inset-0 opacity-15">
        {[...Array(12)].map((_, i) => (
          <div
            key={`scroll-particle-${i}`}
            className="absolute w-3 h-3 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full"
            style={{
              left: `${10 + i * 7}%`,
              top: `${30 + (i % 3) * 20}%`,
              transform: `translateY(${scrollY * (0.05 + i * 0.01)}px) scale(${1 + Math.sin(scrollY * 0.01 + i) * 0.2})`
            }}
          />
        ))}
      </div>

      {/* Connecting lines that stretch with scroll */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <path
          d={`M20,${40 + scrollY * 0.02} Q50,${20 + scrollY * 0.03} 80,${40 + scrollY * 0.02}`}
          stroke="url(#scrollGradient)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          strokeDashoffset={scrollY * 0.1}
        />
        <defs>
          <linearGradient id="scrollGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#FCD34D', stopOpacity: 0.6 }} />
            <stop offset="50%" style={{ stopColor: '#8B5CF6', stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: '#06B6D4', stopOpacity: 0.6 }} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
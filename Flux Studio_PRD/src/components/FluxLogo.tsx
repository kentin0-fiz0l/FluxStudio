export function FluxLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      {/* FLUX in white */}
      <div className="relative">
        <span 
          className="font-black text-2xl text-off-white tracking-tight relative z-10"
          style={{ 
            fontFamily: 'var(--font-title)',
            textShadow: `
              1px 1px 0 #1a1a1a,
              2px 2px 0 #1a1a1a,
              3px 3px 0 #1a1a1a,
              4px 4px 8px rgba(0, 0, 0, 0.5)
            `
          }}
        >
          FLUX
        </span>
      </div>
      
      {/* STUDIO in gradient pink */}
      <div className="relative">
        <span 
          className="font-black text-2xl tracking-tight relative z-10 gradient-text"
          style={{ 
            fontFamily: 'var(--font-title)',
            background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: `
              1px 1px 0 #8B5CF6,
              2px 2px 0 #8B5CF6,
              3px 3px 0 #8B5CF6,
              4px 4px 8px rgba(139, 92, 246, 0.3)
            `
          }}
        >
          STUDIO
        </span>
      </div>
    </div>
  );
}
// React import not needed with JSX transform

// SVG Logo Components for direct Figma import
export function FluxStudioLogoSVG({ 
  width = 400, 
  height = 120,
  variant = 'horizontal' 
}: { 
  width?: number; 
  height?: number; 
  variant?: 'horizontal' | 'stacked' 
}) {
  const viewBox = variant === 'horizontal' ? '0 0 400 120' : '0 0 300 180';
  
  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      style={{ fontFamily: '"PP Neue Machina", "Space Grotesk", sans-serif' }}
    >
      <defs>
        {/* Gradient for STUDIO */}
        <linearGradient id="studioGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        
        {/* Text shadows */}
        <filter id="fluxShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="0" floodColor="#1a1a1a" />
          <feDropShadow dx="4" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
        </filter>
        
        <filter id="studioShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="0" floodColor="#8B5CF6" />
          <feDropShadow dx="4" dy="4" stdDeviation="2" floodColor="#8B5CF6" floodOpacity="0.3" />
        </filter>
      </defs>
      
      {variant === 'horizontal' ? (
        <g>
          {/* FLUX */}
          <text
            x="20"
            y="80"
            fontSize="64"
            fontWeight="900"
            fill="#f8f8f8"
            filter="url(#fluxShadow)"
            letterSpacing="-1.28"
          >
            FLUX
          </text>
          
          {/* STUDIO */}
          <text
            x="220"
            y="80"
            fontSize="64"
            fontWeight="900"
            fill="url(#studioGradient)"
            filter="url(#studioShadow)"
            letterSpacing="-1.28"
          >
            STUDIO
          </text>
        </g>
      ) : (
        <g>
          {/* FLUX */}
          <text
            x="150"
            y="70"
            fontSize="56"
            fontWeight="900"
            fill="#f8f8f8"
            filter="url(#fluxShadow)"
            textAnchor="middle"
            letterSpacing="-1.12"
          >
            FLUX
          </text>
          
          {/* STUDIO */}
          <text
            x="150"
            y="140"
            fontSize="56"
            fontWeight="900"
            fill="url(#studioGradient)"
            filter="url(#studioShadow)"
            textAnchor="middle"
            letterSpacing="-1.12"
          >
            STUDIO
          </text>
        </g>
      )}
    </svg>
  );
}

// Logo mark only (simplified version)
export function FluxStudioMarkSVG({ 
  size = 120 
}: { 
  size?: number 
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="markGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="33%" stopColor="#8B5CF6" />
          <stop offset="66%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Geometric mark inspired by marching formations */}
      <g transform="translate(60,60)">
        {/* Outer ring */}
        <circle
          cx="0"
          cy="0"
          r="45"
          fill="none"
          stroke="url(#markGradient)"
          strokeWidth="3"
          opacity="0.6"
        />
        
        {/* Inner formation pattern */}
        <g fill="url(#markGradient)" filter="url(#glow)">
          {/* Center diamond */}
          <path d="M0,-20 L15,0 L0,20 L-15,0 Z" opacity="0.9" />
          
          {/* Formation dots */}
          <circle cx="0" cy="-30" r="3" />
          <circle cx="21" cy="-15" r="3" />
          <circle cx="21" cy="15" r="3" />
          <circle cx="0" cy="30" r="3" />
          <circle cx="-21" cy="15" r="3" />
          <circle cx="-21" cy="-15" r="3" />
        </g>
      </g>
    </svg>
  );
}

// Figma Export Instructions Component
export function FigmaExportGuide() {
  const downloadSVG = (svgElement: SVGElement, filename: string) => {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-ink text-off-white">
      <h1 className="text-3xl font-bold mb-8 gradient-text">Flux Studio Logo - Figma Export Guide</h1>
      
      {/* Logo Previews */}
      <div className="space-y-8 mb-12">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Logo Variations</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Horizontal Version */}
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Horizontal Layout</h3>
              <div className="bg-black/50 rounded p-4 mb-4">
                <FluxStudioLogoSVG variant="horizontal" width={300} height={90} />
              </div>
              <button
                onClick={() => {
                  const svg = document.querySelector('#horizontal-logo svg') as SVGElement;
                  if (svg) downloadSVG(svg, 'flux-studio-horizontal.svg');
                }}
                className="btn-glass-outline text-sm px-4 py-2"
              >
                Download SVG
              </button>
            </div>
            
            {/* Stacked Version */}
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Stacked Layout</h3>
              <div className="bg-black/50 rounded p-4 mb-4">
                <FluxStudioLogoSVG variant="stacked" width={200} height={120} />
              </div>
              <button
                onClick={() => {
                  const svg = document.querySelector('#stacked-logo svg') as SVGElement;
                  if (svg) downloadSVG(svg, 'flux-studio-stacked.svg');
                }}
                className="btn-glass-outline text-sm px-4 py-2"
              >
                Download SVG
              </button>
            </div>
          </div>
        </section>
        
        {/* Logo Mark */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Logo Mark</h2>
          <div className="bg-white/5 rounded-lg p-6 max-w-md">
            <div className="bg-black/50 rounded p-4 mb-4 flex justify-center">
              <FluxStudioMarkSVG size={100} />
            </div>
            <button
              onClick={() => {
                const svg = document.querySelector('#logo-mark svg') as SVGElement;
                if (svg) downloadSVG(svg, 'flux-studio-mark.svg');
              }}
              className="btn-glass-outline text-sm px-4 py-2"
            >
              Download SVG
            </button>
          </div>
        </section>
      </div>
      
      {/* Style Guide */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Design Specifications</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Colors */}
          <div className="bg-white/5 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Colors</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#f8f8f8' }}></div>
                <div>
                  <div className="text-sm font-medium">Off White</div>
                  <div className="text-xs opacity-70">#f8f8f8</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#EC4899' }}></div>
                <div>
                  <div className="text-sm font-medium">Pink</div>
                  <div className="text-xs opacity-70">#EC4899</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
                <div>
                  <div className="text-sm font-medium">Purple</div>
                  <div className="text-xs opacity-70">#8B5CF6</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#0a0a0a' }}></div>
                <div>
                  <div className="text-sm font-medium">Ink Black</div>
                  <div className="text-xs opacity-70">#0a0a0a</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Typography */}
          <div className="bg-white/5 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Typography</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium">Primary Font</div>
                <div className="text-xs opacity-70">PP Neue Machina</div>
              </div>
              <div>
                <div className="text-sm font-medium">Fallback</div>
                <div className="text-xs opacity-70">Space Grotesk</div>
              </div>
              <div>
                <div className="text-sm font-medium">Weight</div>
                <div className="text-xs opacity-70">900 (Black)</div>
              </div>
              <div>
                <div className="text-sm font-medium">Letter Spacing</div>
                <div className="text-xs opacity-70">-0.02em</div>
              </div>
            </div>
          </div>
          
          {/* Effects */}
          <div className="bg-white/5 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Effects</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium">FLUX Shadow</div>
                <div className="text-xs opacity-70">Drop shadow #1a1a1a</div>
              </div>
              <div>
                <div className="text-sm font-medium">STUDIO Gradient</div>
                <div className="text-xs opacity-70">135° Pink to Purple</div>
              </div>
              <div>
                <div className="text-sm font-medium">Glow Effect</div>
                <div className="text-xs opacity-70">0 0 20px current color</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Figma Instructions */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Figma Import Instructions</h2>
        
        <div className="bg-white/5 rounded-lg p-6">
          <ol className="list-decimal list-inside space-y-4 text-sm">
            <li>Download the SVG files above by clicking the download buttons</li>
            <li>In Figma, go to <strong>File → Import</strong> or drag the SVG files directly into your canvas</li>
            <li>The text will import as vector paths, maintaining the exact styling</li>
            <li>To make text editable:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Select the imported logo</li>
                <li>Right-click and choose <strong>Ungroup</strong></li>
                <li>Delete the vector text paths</li>
                <li>Use the Text tool (T) to recreate with fonts:</li>
                <li className="ml-4">• Font: PP Neue Machina or Space Grotesk</li>
                <li className="ml-4">• Weight: Black (900)</li>
                <li className="ml-4">• Colors: #f8f8f8 for FLUX, gradient #EC4899 → #8B5CF6 for STUDIO</li>
              </ul>
            </li>
            <li>Add effects:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Drop shadow: X: 2, Y: 2, Blur: 0, Color: #1a1a1a</li>
                <li>Secondary shadow: X: 4, Y: 4, Blur: 8, Color: #000000 at 50% opacity</li>
              </ul>
            </li>
            <li>Create components for reusability across your design system</li>
          </ol>
        </div>
      </section>
      
      {/* Hidden SVGs for download */}
      <div className="hidden">
        <div id="horizontal-logo">
          <FluxStudioLogoSVG variant="horizontal" />
        </div>
        <div id="stacked-logo">
          <FluxStudioLogoSVG variant="stacked" />
        </div>
        <div id="logo-mark">
          <FluxStudioMarkSVG />
        </div>
      </div>
    </div>
  );
}
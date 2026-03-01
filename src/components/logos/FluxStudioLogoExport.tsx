import { FluxStudioLogoExportProps, sizeConfig } from './logo-types';
import { Text3DLetter, FlatText } from './LogoHelpers';

export function FluxStudioLogoExport({
  size = 'md',
  variant = 'horizontal',
  showSubtitle = false,
  className = ''
}: FluxStudioLogoExportProps) {

  const config = sizeConfig[size];

  // Layout wrapper based on variant
  const layoutClasses = {
    horizontal: `inline-flex items-center`,
    stacked: `flex flex-col items-center`,
    '3d': `flex items-center justify-center`
  };

  return (
    <div className={`${layoutClasses[variant]} ${className}`}>
      {/* Logo Container */}
      <div
        className={`
          ${variant === 'stacked' ? 'flex flex-col items-center space-y-2' : 'flex items-center'}
          ${variant === 'horizontal' ? `space-x-4` : ''}
          ${variant === '3d' ? 'perspective-1000' : ''}
        `}
        style={{
          perspective: variant === '3d' ? '1200px' : 'none'
        }}
      >
        {/* FLUX */}
        <div className="relative">
          {variant === '3d' ? (
            <div className="flex" style={{ perspective: '1000px' }}>
              {'FLUX'.split('').map((letter, index) => (
                <Text3DLetter
                  key={index}
                  letter={letter}
                  color="#f8f8f8"
                  shadowColor="#1a1a1a"
                  fontSize={config.fontSize}
                  depth={config.depth}
                />
              ))}
            </div>
          ) : (
            <FlatText text="FLUX" color="#f8f8f8" fontSize={config.fontSize} />
          )}
        </div>

        {/* STUDIO */}
        <div className="relative">
          {variant === '3d' ? (
            <div className="flex" style={{ perspective: '1000px' }}>
              {'STUDIO'.split('').map((letter, index) => (
                <Text3DLetter
                  key={index}
                  letter={letter}
                  color="#EC4899"
                  shadowColor="#8B5CF6"
                  fontSize={config.fontSize}
                  depth={config.depth}
                />
              ))}
            </div>
          ) : (
            <FlatText text="STUDIO" color="#EC4899" isGradient fontSize={config.fontSize} />
          )}
        </div>
      </div>

      {/* Subtitle */}
      {showSubtitle && (
        <div
          className={`
            text-center mt-4
            ${variant === 'horizontal' ? 'ml-6' : ''}
          `}
        >
          <p
            className="font-medium tracking-widest uppercase opacity-80"
            style={{
              fontSize: config.subtitleSize,
              fontFamily: '"PP Neue Machina", "Space Grotesk", sans-serif',
              color: '#f8f8f8',
              letterSpacing: '0.2em'
            }}
          >
            Marching Arts Creative Design Shop
          </p>
          <p
            className="font-normal mt-1 opacity-60"
            style={{
              fontSize: `calc(${config.subtitleSize} * 0.8)`,
              fontFamily: 'Inter, sans-serif',
              color: '#f8f8f8'
            }}
          >
            Creative Direction by Kentino
          </p>
        </div>
      )}
    </div>
  );
}

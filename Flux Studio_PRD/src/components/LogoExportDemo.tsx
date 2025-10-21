import { FluxStudioLogoExport, LogoShowcase } from './FluxStudioLogoExport';
import { FigmaExportGuide } from './LogoFigmaExport';

export function LogoExportDemo() {
  return (
    <div className="min-h-screen bg-ink">
      {/* Hero Logo */}
      <section className="relative py-20 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8 text-off-white">
            Flux Studio Logo Export
          </h1>
          <p className="text-xl text-off-white/70 mb-12">
            Professional logo variations ready for Figma import
          </p>
          
          {/* Featured Logo */}
          <div className="mb-16">
            <FluxStudioLogoExport 
              size="hero" 
              variant="3d" 
              showSubtitle={true} 
            />
          </div>
        </div>
      </section>

      {/* Logo Showcase */}
      <section className="py-16 border-t border-white/10">
        <LogoShowcase />
      </section>

      {/* Figma Export Guide */}
      <section className="py-16 border-t border-white/10">
        <FigmaExportGuide />
      </section>

      {/* Usage Guidelines */}
      <section className="py-16 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="text-3xl font-bold mb-8 text-off-white">Usage Guidelines</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Do's */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-green-400">✓ Do</h3>
              <ul className="space-y-2 text-off-white/80">
                <li>• Use the logo on dark backgrounds (#0a0a0a or darker)</li>
                <li>• Maintain the FLUX/STUDIO color relationship</li>
                <li>• Keep adequate clear space around the logo</li>
                <li>• Use the horizontal version for wide layouts</li>
                <li>• Use the stacked version for square/tall layouts</li>
                <li>• Scale proportionally to maintain legibility</li>
                <li>• Use the 3D version for hero sections</li>
              </ul>
            </div>
            
            {/* Don'ts */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-red-400">✗ Don't</h3>
              <ul className="space-y-2 text-off-white/80">
                <li>• Use on light backgrounds without contrast</li>
                <li>• Change the gradient colors or direction</li>
                <li>• Separate FLUX and STUDIO as individual elements</li>
                <li>• Stretch or distort the proportions</li>
                <li>• Use drop shadows on light backgrounds</li>
                <li>• Scale below 100px width for legibility</li>
                <li>• Modify the letterforms or spacing</li>
              </ul>
            </div>
          </div>
          
          {/* Minimum Sizes */}
          <div className="mt-12 bg-white/5 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-off-white">Minimum Sizes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2 text-off-white/90">Digital</h4>
                <p className="text-off-white/70">• Horizontal: 200px width</p>
                <p className="text-off-white/70">• Stacked: 120px width</p>
                <p className="text-off-white/70">• Logo mark: 32px</p>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-off-white/90">Print</h4>
                <p className="text-off-white/70">• Horizontal: 2 inches width</p>
                <p className="text-off-white/70">• Stacked: 1.5 inches width</p>
                <p className="text-off-white/70">• Logo mark: 0.5 inches</p>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-off-white/90">Large Format</h4>
                <p className="text-off-white/70">• Horizontal: 12 inches width</p>
                <p className="text-off-white/70">• Stacked: 8 inches width</p>
                <p className="text-off-white/70">• 3D version recommended</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
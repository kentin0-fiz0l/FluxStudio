import { FluxStudioLogoSVG } from './FluxStudioLogoSVG';
import { FluxStudioMarkSVG } from './FluxStudioMarkSVG';

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
                <div className="text-xs opacity-70">135deg Pink to Purple</div>
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
            <li>In Figma, go to <strong>File &rarr; Import</strong> or drag the SVG files directly into your canvas</li>
            <li>The text will import as vector paths, maintaining the exact styling</li>
            <li>To make text editable:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Select the imported logo</li>
                <li>Right-click and choose <strong>Ungroup</strong></li>
                <li>Delete the vector text paths</li>
                <li>Use the Text tool (T) to recreate with fonts:</li>
                <li className="ml-4">&#8226; Font: PP Neue Machina or Space Grotesk</li>
                <li className="ml-4">&#8226; Weight: Black (900)</li>
                <li className="ml-4">&#8226; Colors: #f8f8f8 for FLUX, gradient #EC4899 &rarr; #8B5CF6 for STUDIO</li>
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

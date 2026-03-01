export interface FluxStudioLogoExportProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  variant?: 'horizontal' | 'stacked' | '3d';
  showSubtitle?: boolean;
  className?: string;
}

export const sizeConfig = {
  sm: { fontSize: '1.5rem', spacing: '0.25rem', subtitleSize: '0.75rem', depth: 4 },
  md: { fontSize: '2rem', spacing: '0.5rem', subtitleSize: '0.875rem', depth: 6 },
  lg: { fontSize: '3rem', spacing: '0.75rem', subtitleSize: '1rem', depth: 8 },
  xl: { fontSize: '4rem', spacing: '1rem', subtitleSize: '1.25rem', depth: 10 },
  hero: { fontSize: '6rem', spacing: '1.5rem', subtitleSize: '1.5rem', depth: 12 },
};

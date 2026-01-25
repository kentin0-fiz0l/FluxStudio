/**
 * Portfolio Components Index
 * Export all portfolio-related components
 */

// Main component
export { default as PortfolioShowcase, PortfolioShowcase as NamedPortfolioShowcase } from './PortfolioShowcase';

// Extracted components (Phase 2 refactoring)
export { PortfolioHeader } from './PortfolioHeader';
export { PortfolioFilters } from './PortfolioFilters';
export { PortfolioItemCard } from './PortfolioItemCard';
export { PortfolioItemDetail } from './PortfolioItemDetail';
export { PortfolioEditForm } from './PortfolioEditForm';
export { PortfolioItemForm } from './PortfolioItemForm';
export { MediaGallery } from './MediaGallery';

// Types
export type { Portfolio, PortfolioItem } from './types';
export { categories, ensembleTypes, serviceCategories } from './types';

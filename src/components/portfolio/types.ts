/**
 * Portfolio Types
 * Shared type definitions for portfolio components
 */

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  media: {
    type: 'image' | 'video' | 'document';
    url: string;
    thumbnail_url?: string;
    duration?: number;
  }[];
  project_details: {
    client: string;
    year: number;
    ensemble_type: string;
    service_category: string;
    location?: string;
    awards?: string[];
  };
  metrics: {
    views: number;
    likes: number;
    shares: number;
  };
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  title: string;
  description: string;
  owner: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    bio?: string;
  };
  cover_image_url?: string;
  items: PortfolioItem[];
  stats: {
    total_items: number;
    total_views: number;
    featured_items: number;
  };
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const categories = [
  'All',
  'Uniform Design',
  'Show Concepts',
  'Props & Scenic',
  'Drill Design',
  'Complete Productions',
  'Competition Results',
  'Behind the Scenes'
];

export const ensembleTypes = [
  'Marching Band',
  'Indoor Winds',
  'Winter Guard',
  'Indoor Percussion',
  'Drum Corps',
  'Parade Band'
];

export const serviceCategories = [
  'Design Concepts',
  'Visual Production',
  'Performance Design',
  'Full Season Support'
];

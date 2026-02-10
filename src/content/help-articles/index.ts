/**
 * Help Articles Content System
 *
 * Central index for all help center articles with full content,
 * metadata, and search capabilities.
 */

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  categoryId: string;
  content: string;
  keywords: string[];
  relatedArticles?: string[];
  lastUpdated: string;
  readingTime: number; // in minutes
}

// Import individual article content
import { gettingStarted } from './getting-started';
import { creatingFirstProject } from './creating-first-project';
import { collaborationFeatures } from './collaboration-features';
import { fileManagement } from './file-management';
import { messagingGuide } from './messaging-guide';
import { settingsPreferences } from './settings-preferences';
import { keyboardShortcuts } from './keyboard-shortcuts';
import { troubleshooting } from './troubleshooting';
import { accountManagement } from './account-management';
import { billingPayments } from './billing-payments';
import { integrationsFigma } from './integrations-figma';
import { integrationsSlack } from './integrations-slack';
import { securityPrivacy } from './security-privacy';

// Export all articles
export const helpArticles: HelpArticle[] = [
  gettingStarted,
  creatingFirstProject,
  collaborationFeatures,
  fileManagement,
  messagingGuide,
  settingsPreferences,
  keyboardShortcuts,
  troubleshooting,
  accountManagement,
  billingPayments,
  integrationsFigma,
  integrationsSlack,
  securityPrivacy,
];

// Get article by ID or slug
export function getArticleById(id: string): HelpArticle | undefined {
  return helpArticles.find((a) => a.id === id || a.slug === id);
}

// Get articles by category
export function getArticlesByCategory(categoryId: string): HelpArticle[] {
  return helpArticles.filter((a) => a.categoryId === categoryId);
}

// Search articles by query
export function searchArticles(query: string): HelpArticle[] {
  if (!query.trim()) return [];

  const normalizedQuery = query.toLowerCase();
  const words = normalizedQuery.split(/\s+/);

  return helpArticles
    .map((article) => {
      let score = 0;

      // Title match (highest weight)
      if (article.title.toLowerCase().includes(normalizedQuery)) {
        score += 10;
      }

      // Keyword exact match
      article.keywords.forEach((keyword) => {
        if (keyword.toLowerCase() === normalizedQuery) {
          score += 8;
        } else if (keyword.toLowerCase().includes(normalizedQuery)) {
          score += 4;
        }
      });

      // Summary match
      if (article.summary.toLowerCase().includes(normalizedQuery)) {
        score += 5;
      }

      // Content match
      const contentLower = article.content.toLowerCase();
      words.forEach((word) => {
        if (contentLower.includes(word)) {
          score += 2;
        }
      });

      return { article, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ article }) => article);
}

// Get related articles
export function getRelatedArticles(articleId: string, limit = 3): HelpArticle[] {
  const article = getArticleById(articleId);
  if (!article) return [];

  // Get explicitly related articles first
  const related: HelpArticle[] = [];
  if (article.relatedArticles) {
    article.relatedArticles.forEach((id) => {
      const relatedArticle = getArticleById(id);
      if (relatedArticle) {
        related.push(relatedArticle);
      }
    });
  }

  // Fill remaining slots with articles from same category
  if (related.length < limit) {
    const categoryArticles = getArticlesByCategory(article.categoryId)
      .filter((a) => a.id !== articleId && !related.find((r) => r.id === a.id))
      .slice(0, limit - related.length);
    related.push(...categoryArticles);
  }

  return related.slice(0, limit);
}

export default helpArticles;

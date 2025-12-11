/**
 * Tools Page - External Tools & Applications
 * Zero external dependencies - inline styles only
 */
import React from 'react';

// Inline SVG icons
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
  </svg>
);

const MapIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/>
    <line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 24px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0 0 32px 0',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '32px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'relative' as const,
  },
  newBadge: {
    position: 'absolute' as const,
    top: '-12px',
    right: '-12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '700',
  },
  cardContent: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap' as const,
  },
  iconBox: {
    width: '80px',
    height: '80px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: '280px',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  cardCategory: {
    display: 'inline-block',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    marginBottom: '12px',
  },
  cardDescription: {
    color: '#475569',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
  },
  featureList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '20px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#334155',
  },
  featureIcon: {
    color: '#3b82f6',
  },
  buttonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  linkText: {
    color: '#64748b',
    fontSize: '14px',
    textDecoration: 'none',
  },
  comingSoonCard: {
    background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
    borderRadius: '16px',
    border: '1px solid #bfdbfe',
    padding: '24px',
    display: 'flex',
    gap: '16px',
  },
  comingSoonIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#2563eb',
    flexShrink: 0,
  },
  comingSoonTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e3a8a',
    margin: '0 0 8px 0',
  },
  comingSoonText: {
    fontSize: '14px',
    color: '#1d4ed8',
    margin: '0 0 12px 0',
  },
  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    color: '#1d4ed8',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '500',
  },
};

export default function Tools() {
  const handleLaunch = () => {
    window.open('https://metmap.art', '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <a href="/" style={styles.backLink}>
          <ArrowLeftIcon />
          Back to FluxStudio
        </a>
      </div>

      {/* Main Content */}
      <div style={styles.container}>
        <h1 style={styles.title}>Tools</h1>
        <p style={styles.subtitle}>
          Extend your FluxStudio workflow with powerful external tools and applications.
        </p>

        {/* Featured Tools Section */}
        <h2 style={styles.sectionTitle}>
          <span style={{ color: '#3b82f6' }}>★</span>
          Featured Tools
        </h2>

        {/* MetMap Card */}
        <div style={styles.card}>
          <div style={styles.newBadge}>NEW</div>
          <div style={styles.cardContent}>
            <div style={styles.iconBox}>
              <MapIcon />
            </div>
            <div style={styles.cardBody}>
              <h3 style={styles.cardTitle}>MetMap</h3>
              <span style={styles.cardCategory}>Productivity</span>
              <p style={styles.cardDescription}>
                Transform your meetings with AI-driven transcription, smart summaries,
                and actionable insights. MetMap helps teams capture every important
                detail and turn conversations into organized, searchable knowledge.
              </p>
              <div style={styles.featureList}>
                <div style={styles.featureItem}>
                  <span style={styles.featureIcon}><ZapIcon /></span>
                  AI Meeting Transcription
                </div>
                <div style={styles.featureItem}>
                  <span style={styles.featureIcon}><ZapIcon /></span>
                  Smart Summaries
                </div>
                <div style={styles.featureItem}>
                  <span style={styles.featureIcon}><ZapIcon /></span>
                  Action Item Extraction
                </div>
                <div style={styles.featureItem}>
                  <span style={styles.featureIcon}><ZapIcon /></span>
                  Searchable Archives
                </div>
              </div>
              <div style={styles.buttonRow}>
                <button style={styles.primaryButton} onClick={handleLaunch}>
                  <ExternalLinkIcon />
                  Launch MetMap
                </button>
                <a href="https://metmap.art" target="_blank" rel="noreferrer" style={styles.linkText}>
                  metmap.art
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div style={styles.comingSoonCard}>
          <div style={styles.comingSoonIcon}>
            <ZapIcon />
          </div>
          <div>
            <h3 style={styles.comingSoonTitle}>More tools coming soon</h3>
            <p style={styles.comingSoonText}>
              We're working on integrating more powerful tools to enhance your creative workflow.
            </p>
            <div style={styles.tagContainer}>
              <span style={styles.tag}>AI Design Assistant</span>
              <span style={styles.tag}>Asset Library</span>
              <span style={styles.tag}>Analytics Dashboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

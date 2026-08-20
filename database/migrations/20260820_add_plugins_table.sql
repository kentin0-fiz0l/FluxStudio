-- Migration: Add plugins table for AudioForge plugin marketplace
-- Date: 2026-08-20

CREATE TABLE IF NOT EXISTS plugins (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'effect', 'instrument', 'utility'

    -- File information
    file_url TEXT,
    file_size_bytes BIGINT,
    file_hash VARCHAR(64), -- SHA-256 hash for integrity

    -- Metadata
    features JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    screenshots JSONB DEFAULT '[]'::jsonb,

    -- Pricing
    is_free BOOLEAN DEFAULT true,
    price_cents INTEGER DEFAULT 0,

    -- Analytics
    download_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,

    -- Status
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for plugin versions (supporting multiple versions)
CREATE TABLE IF NOT EXISTS plugin_versions (
    id SERIAL PRIMARY KEY,
    plugin_id INTEGER REFERENCES plugins(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    release_notes TEXT,

    -- Platform-specific downloads
    download_url_mac TEXT,
    download_url_windows TEXT,
    download_url_linux TEXT,

    file_size_mac BIGINT,
    file_size_windows BIGINT,
    file_size_linux BIGINT,

    is_latest BOOLEAN DEFAULT false,
    released_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(plugin_id, version)
);

-- Table for plugin downloads tracking
CREATE TABLE IF NOT EXISTS plugin_downloads (
    id SERIAL PRIMARY KEY,
    plugin_id INTEGER REFERENCES plugins(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    platform VARCHAR(20), -- 'mac', 'windows', 'linux'
    ip_address VARCHAR(45),
    user_agent TEXT,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for plugin ratings/reviews
CREATE TABLE IF NOT EXISTS plugin_reviews (
    id SERIAL PRIMARY KEY,
    plugin_id INTEGER REFERENCES plugins(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(plugin_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins(category);
CREATE INDEX IF NOT EXISTS idx_plugins_is_published ON plugins(is_published);
CREATE INDEX IF NOT EXISTS idx_plugins_slug ON plugins(slug);
CREATE INDEX IF NOT EXISTS idx_plugin_downloads_plugin_id ON plugin_downloads(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_reviews_plugin_id ON plugin_reviews(plugin_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON plugins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plugin_reviews_updated_at BEFORE UPDATE ON plugin_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial AudioForge plugins
INSERT INTO plugins (slug, name, description, version, category, is_free, is_published, published_at, features, tags)
VALUES
(
    'simplegain',
    'SimpleGain',
    'Clean gain/volume control with real-time level metering. Perfect for learning DSP basics and essential gain staging.',
    '1.0.0',
    'utility',
    true,
    true,
    CURRENT_TIMESTAMP,
    '["Gain control (-60 to +12 dB)", "Real-time level meter", "Smooth parameter changes", "Zero latency"]'::jsonb,
    '["utility", "gain", "volume", "meter", "beginner"]'::jsonb
),
(
    'panutil',
    'PanUtil',
    'Stereo panning and width control utility. Features constant-power panning, M/S processing, and dual-channel metering.',
    '1.0.0',
    'utility',
    true,
    true,
    CURRENT_TIMESTAMP,
    '["Pan control (-100% L to +100% R)", "Width control (0% to 200%)", "Pan and Balance modes", "M/S processing", "Dual L/R meters", "Visual stereo field"]'::jsonb,
    '["utility", "panning", "stereo", "width", "m/s"]'::jsonb
);

COMMENT ON TABLE plugins IS 'AudioForge plugin catalog';
COMMENT ON TABLE plugin_versions IS 'Version history for each plugin';
COMMENT ON TABLE plugin_downloads IS 'Download analytics and tracking';
COMMENT ON TABLE plugin_reviews IS 'User ratings and reviews';

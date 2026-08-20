/**
 * AudioForge DAW Plugin Marketplace API
 * Routes for VST3/AU plugin catalog, downloads, and reviews
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/config');

/**
 * GET /api/audioforge/plugins
 * List all published AudioForge DAW plugins
 */
router.get('/plugins', async (req, res) => {
    try {
        const { category, tag, search } = req.query;

        let sql = `
            SELECT
                p.*
            FROM plugins p
            WHERE p.is_published = true
        `;

        const params = [];
        let paramIndex = 1;

        if (category) {
            sql += ` AND p.category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (tag) {
            sql += ` AND p.tags @> $${paramIndex}::jsonb`;
            params.push(JSON.stringify([tag]));
            paramIndex++;
        }

        if (search) {
            sql += ` AND (
                p.name ILIKE $${paramIndex} OR
                p.description ILIKE $${paramIndex}
            )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        sql += ` ORDER BY p.download_count DESC, p.created_at DESC`;

        const result = await query(sql, params);

        res.json({
            success: true,
            data: result.rows.map(row => ({
                ...row,
                features: row.features || [],
                tags: row.tags || [],
                screenshots: row.screenshots || [],
                versions: row.versions || []
            }))
        });
    } catch (error) {
        console.error('Error fetching plugins:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch plugins'
        });
    }
});

/**
 * GET /api/audioforge/plugins/:slug
 * Get detailed information about a specific plugin
 */
router.get('/plugins/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const result = await query(
            `SELECT
                p.*,
                (SELECT json_agg(json_build_object(
                    'version', pv.version,
                    'releaseNotes', pv.release_notes,
                    'downloadUrlMac', pv.download_url_mac,
                    'downloadUrlWindows', pv.download_url_windows,
                    'downloadUrlLinux', pv.download_url_linux,
                    'fileSizeMac', pv.file_size_mac,
                    'fileSizeWindows', pv.file_size_windows,
                    'fileSizeLinux', pv.file_size_linux,
                    'isLatest', pv.is_latest,
                    'releasedAt', pv.released_at
                ) ORDER BY pv.released_at DESC)
                FROM plugin_versions pv
                WHERE pv.plugin_id = p.id) as versions,
                (SELECT json_agg(json_build_object(
                    'id', pr.id,
                    'rating', pr.rating,
                    'reviewText', pr.review_text,
                    'createdAt', pr.created_at
                ) ORDER BY pr.created_at DESC)
                FROM plugin_reviews pr
                WHERE pr.plugin_id = p.id
                LIMIT 10) as recent_reviews
            FROM plugins p
            WHERE p.slug = $1 AND p.is_published = true`,
            [slug]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Plugin not found'
            });
        }

        const plugin = {
            ...result.rows[0],
            features: result.rows[0].features || [],
            tags: result.rows[0].tags || [],
            screenshots: result.rows[0].screenshots || [],
            versions: result.rows[0].versions || [],
            recent_reviews: result.rows[0].recent_reviews || []
        };

        res.json({
            success: true,
            data: plugin
        });
    } catch (error) {
        console.error('Error fetching plugin:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch plugin details'
        });
    }
});

/**
 * POST /api/audioforge/plugins/:slug/download
 * Track a plugin download
 */
router.post('/plugins/:slug/download', async (req, res) => {
    try {
        const { slug } = req.params;
        const { platform } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.get('user-agent');

        const pluginResult = await query(
            'SELECT id FROM plugins WHERE slug = $1',
            [slug]
        );

        if (pluginResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Plugin not found'
            });
        }

        const pluginId = pluginResult.rows[0].id;

        await query(
            `INSERT INTO plugin_downloads
            (plugin_id, user_id, platform, ip_address, user_agent)
            VALUES ($1, NULL, $2, $3, $4)`,
            [pluginId, platform, ipAddress, userAgent]
        );

        await query(
            'UPDATE plugins SET download_count = download_count + 1 WHERE id = $1',
            [pluginId]
        );

        res.json({
            success: true,
            message: 'Download tracked successfully'
        });
    } catch (error) {
        console.error('Error tracking download:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track download'
        });
    }
});

/**
 * GET /api/audioforge/stats
 * Get overall AudioForge statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const result = await query(
            `SELECT
                COUNT(*) as total_plugins,
                SUM(download_count) as total_downloads,
                AVG(rating_average) as average_rating
            FROM plugins
            WHERE is_published = true`
        );

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

module.exports = router;

/**
 * Channels & Organizations Routes
 *
 * Provides endpoints for:
 * - Channel creation and listing
 * - Organization CRUD (legacy)
 *
 * Extracted from server-unified.js during Sprint 18 decomposition.
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../lib/auth/middleware');
const { validateInput } = require('../middleware/security');
const { zodValidate } = require('../middleware/zodValidate');
const { createChannelSchema, createOrganizationSchema } = require('../lib/schemas');
const { createLogger } = require('../lib/logger');
const log = createLogger('Channels');

const router = express.Router();

const CHANNELS_FILE = path.join(__dirname, '..', 'channels.json');
const TEAMS_FILE = path.join(__dirname, '..', 'teams.json');

async function getChannels() {
  if (!fs.existsSync(CHANNELS_FILE)) {
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify({ channels: [] }));
  }
  const data = fs.readFileSync(CHANNELS_FILE, 'utf8');
  return JSON.parse(data).channels;
}

async function saveChannels(channels) {
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify({ channels }, null, 2));
}

// Create channel
router.post('/channels', authenticateToken, validateInput.sanitizeInput, zodValidate(createChannelSchema), async (req, res) => {
  const { name, teamId, description } = req.body;

  if (!name || !teamId) {
    return res.status(400).json({ success: false, error: 'Name and team ID are required', code: 'MISSING_FIELDS' });
  }

  const channels = await getChannels();
  const newChannel = {
    id: crypto.randomUUID(),
    name,
    teamId,
    description: description || '',
    createdAt: new Date().toISOString(),
    createdBy: req.user.id
  };

  channels.push(newChannel);
  await saveChannels(channels);

  res.json(newChannel);
});

// Get channels by team
router.get('/channels/:teamId', authenticateToken, async (req, res) => {
  const channels = await getChannels();
  const teamChannels = channels.filter(c => c.teamId === req.params.teamId);
  res.json(teamChannels);
});

// GET /organizations - List user's organizations
router.get('/organizations', authenticateToken, async (req, res) => {
  try {
    const teams = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8')).teams || [];
    const userTeams = teams.filter(team =>
      team.members && team.members.some(member => member.userId === req.user.id)
    );

    const organizations = userTeams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      role: team.members.find(m => m.userId === req.user.id)?.role || 'member',
      createdAt: team.createdAt,
      memberCount: team.members.length
    }));

    res.json({ organizations });
  } catch (error) {
    log.error('Error fetching organizations', error);
    res.status(500).json({ success: false, error: 'Failed to fetch organizations', code: 'FETCH_ORGANIZATIONS_ERROR' });
  }
});

// POST /organizations - Create organization
router.post('/organizations', authenticateToken, zodValidate(createOrganizationSchema), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Organization name is required', code: 'MISSING_FIELDS' });
    }

    const teams = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8')).teams || [];
    const newOrg = {
      id: crypto.randomUUID(),
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      createdBy: req.user.id,
      members: [
        { userId: req.user.id, role: 'owner', joinedAt: new Date().toISOString() }
      ]
    };

    teams.push(newOrg);
    fs.writeFileSync(TEAMS_FILE, JSON.stringify({ teams }, null, 2));

    res.json(newOrg);
  } catch (error) {
    log.error('Error creating organization', error);
    res.status(500).json({ success: false, error: 'Failed to create organization', code: 'CREATE_ORGANIZATION_ERROR' });
  }
});

module.exports = router;

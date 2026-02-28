/**
 * Teams Routes - Team Management API
 *
 * Provides endpoints for:
 * - Team CRUD operations
 * - Team membership management
 * - Team invitations
 * - Role management
 *
 * All endpoints require authentication.
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../lib/logger');
const log = createLogger('Teams');
const { authenticateToken } = require('../lib/auth/middleware');
const { zodValidate } = require('../middleware/zodValidate');
const { createTeamSchema, updateTeamSchema, inviteTeamMemberSchema, updateTeamMemberRoleSchema } = require('../lib/schemas/teams');

// Try to load activity logger for audit trails
let activityLogger = null;
try {
  activityLogger = require('../lib/activityLogger');
} catch (error) {
  log.warn('Activity logger not available for teams');
}

const router = express.Router();

// File-based storage paths
const TEAMS_FILE = path.join(__dirname, '..', 'teams.json');
const USERS_FILE = path.join(__dirname, '..', 'users.json');

// Helper functions
function uuidv4() {
  return crypto.randomUUID();
}

async function getTeams() {
  try {
    const data = fs.readFileSync(TEAMS_FILE, 'utf8');
    return JSON.parse(data).teams || [];
  } catch (error) {
    return [];
  }
}

async function saveTeams(teams) {
  fs.writeFileSync(TEAMS_FILE, JSON.stringify({ teams }, null, 2));
}

async function getUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data).users || [];
  } catch (error) {
    return [];
  }
}

/**
 * POST /teams
 * Create a new team
 */
router.post('/', authenticateToken, zodValidate(createTeamSchema), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const teams = await getTeams();

    const newTeam = {
      id: uuidv4(),
      name,
      description: description || '',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      members: [
        {
          userId: req.user.id,
          role: 'owner',
          joinedAt: new Date().toISOString()
        }
      ],
      invites: []
    };

    teams.push(newTeam);
    await saveTeams(teams);

    res.json({
      message: 'Team created successfully',
      team: newTeam
    });
  } catch (error) {
    log.error('Create team error', error);
    res.status(500).json({ message: 'Error creating team' });
  }
});

/**
 * GET /teams
 * Get user's teams
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const userTeams = teams.filter(team =>
      team.members.some(member => member.userId === req.user.id)
    );

    res.json({ teams: userTeams });
  } catch (error) {
    log.error('Get teams error', error);
    res.status(500).json({ message: 'Error retrieving teams' });
  }
});

/**
 * GET /teams/:id
 * Get team by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const team = teams.find(t => t.id === req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    const isMember = team.members.some(member => member.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(team);
  } catch (error) {
    log.error('Get team error', error);
    res.status(500).json({ message: 'Error retrieving team' });
  }
});

/**
 * PUT /teams/:id
 * Update team
 */
router.put('/:id', authenticateToken, zodValidate(updateTeamSchema), async (req, res) => {
  try {
    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is owner or admin
    const member = teams[teamIndex].members.find(m => m.userId === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { name, description } = req.body;

    teams[teamIndex] = {
      ...teams[teamIndex],
      name: name || teams[teamIndex].name,
      description: description !== undefined ? description : teams[teamIndex].description,
      updatedAt: new Date().toISOString()
    };

    await saveTeams(teams);
    res.json(teams[teamIndex]);
  } catch (error) {
    log.error('Update team error', error);
    res.status(500).json({ message: 'Error updating team' });
  }
});

/**
 * DELETE /teams/:id
 * Delete team
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is owner
    const member = teams[teamIndex].members.find(m => m.userId === req.user.id);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Only team owner can delete the team' });
    }

    teams.splice(teamIndex, 1);
    await saveTeams(teams);

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    log.error('Delete team error', error);
    res.status(500).json({ message: 'Error deleting team' });
  }
});

/**
 * POST /teams/:id/invite
 * Invite member to team
 */
router.post('/:id/invite', authenticateToken, zodValidate(inviteTeamMemberSchema), async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has permission to invite
    const member = teams[teamIndex].members.find(m => m.userId === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Check if user is already a member or invited
    const users = await getUsers();
    const invitedUser = users.find(u => u.email === email);

    if (invitedUser) {
      const existingMember = teams[teamIndex].members.find(m => m.userId === invitedUser.id);
      if (existingMember) {
        return res.status(400).json({ message: 'User is already a team member' });
      }
    }

    // Create invitation
    const invite = {
      id: uuidv4(),
      email,
      role,
      invitedBy: req.user.id,
      invitedAt: new Date().toISOString(),
      status: 'pending'
    };

    if (!teams[teamIndex].invites) {
      teams[teamIndex].invites = [];
    }
    teams[teamIndex].invites.push(invite);

    await saveTeams(teams);

    res.json({
      message: 'Invitation sent successfully',
      invite
    });
  } catch (error) {
    log.error('Invite member error', error);
    res.status(500).json({ message: 'Error sending invitation' });
  }
});

/**
 * POST /teams/:id/accept-invite
 * Accept team invitation
 */
router.post('/:id/accept-invite', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Find invitation for user's email
    const users = await getUsers();
    const user = users.find(u => u.id === req.user.id);
    const inviteIndex = teams[teamIndex].invites?.findIndex(
      i => i.email === user.email && i.status === 'pending'
    );

    if (inviteIndex === -1 || inviteIndex === undefined) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    const invite = teams[teamIndex].invites[inviteIndex];

    // Add user as member
    teams[teamIndex].members.push({
      userId: req.user.id,
      role: invite.role,
      joinedAt: new Date().toISOString()
    });

    // Update invitation status
    teams[teamIndex].invites[inviteIndex].status = 'accepted';

    await saveTeams(teams);

    // Log activity for member join
    if (activityLogger) {
      await activityLogger.memberJoined(req.user.id, null, {
        userId: req.user.id,
        name: user?.name || user?.email || 'User'
      });
    }

    res.json({
      message: 'Successfully joined the team',
      team: teams[teamIndex]
    });
  } catch (error) {
    log.error('Accept invitation error', error);
    res.status(500).json({ message: 'Error accepting invitation' });
  }
});

/**
 * DELETE /teams/:id/members/:userId
 * Remove member from team
 */
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has permission to remove members
    const member = teams[teamIndex].members.find(m => m.userId === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      // Allow users to remove themselves
      if (req.params.userId !== req.user.id) {
        return res.status(403).json({ message: 'Permission denied' });
      }
    }

    // Cannot remove the owner
    const targetMember = teams[teamIndex].members.find(m => m.userId === req.params.userId);
    if (targetMember && targetMember.role === 'owner' && req.params.userId !== req.user.id) {
      return res.status(400).json({ message: 'Cannot remove team owner' });
    }

    // Get member info before removal for activity logging
    const removedMemberInfo = targetMember;

    // Remove member
    teams[teamIndex].members = teams[teamIndex].members.filter(
      m => m.userId !== req.params.userId
    );

    await saveTeams(teams);

    // Log activity for member leave
    if (activityLogger && removedMemberInfo) {
      await activityLogger.memberLeft(req.user.id, null, {
        userId: req.params.userId,
        name: removedMemberInfo.name || 'Member'
      });
    }

    res.json({
      message: 'Member removed successfully'
    });
  } catch (error) {
    log.error('Remove member error', error);
    res.status(500).json({ message: 'Error removing member' });
  }
});

/**
 * PUT /teams/:id/members/:userId
 * Update member role
 */
router.put('/:id/members/:userId', authenticateToken, zodValidate(updateTeamMemberRoleSchema), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['owner', 'admin', 'member'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Valid role is required' });
    }

    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has permission
    const member = teams[teamIndex].members.find(m => m.userId === req.user.id);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Only team owner can change roles' });
    }

    // Find target member
    const targetMemberIndex = teams[teamIndex].members.findIndex(
      m => m.userId === req.params.userId
    );

    if (targetMemberIndex === -1) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Update role
    teams[teamIndex].members[targetMemberIndex].role = role;
    await saveTeams(teams);

    res.json({
      message: 'Role updated successfully',
      member: teams[teamIndex].members[targetMemberIndex]
    });
  } catch (error) {
    log.error('Update role error', error);
    res.status(500).json({ message: 'Error updating role' });
  }
});

/**
 * GET /teams/:id/invites
 * Get team invitations
 */
router.get('/:id/invites', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const team = teams.find(t => t.id === req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is admin or owner
    const member = team.members.find(m => m.userId === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    res.json({
      invites: team.invites || []
    });
  } catch (error) {
    log.error('Get invites error', error);
    res.status(500).json({ message: 'Error retrieving invitations' });
  }
});

/**
 * DELETE /teams/:id/invites/:inviteId
 * Cancel team invitation
 */
router.delete('/:id/invites/:inviteId', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is admin or owner
    const member = teams[teamIndex].members.find(m => m.userId === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Remove invitation
    teams[teamIndex].invites = teams[teamIndex].invites.filter(
      i => i.id !== req.params.inviteId
    );

    await saveTeams(teams);

    res.json({ message: 'Invitation cancelled' });
  } catch (error) {
    log.error('Cancel invitation error', error);
    res.status(500).json({ message: 'Error cancelling invitation' });
  }
});

module.exports = router;

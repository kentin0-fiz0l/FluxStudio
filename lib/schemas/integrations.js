const { z } = require('zod');

const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

const slackMessageSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  text: z.string().min(1, 'Message text is required'),
});

const slackProjectUpdateSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  projectName: z.string().min(1, 'Project name is required'),
  updateType: z.string().min(1, 'Update type is required'),
});

const githubCreateIssueSchema = z.object({
  title: z.string().min(1, 'Issue title is required'),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
});

const githubLinkRepoSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

module.exports = {
  oauthCallbackSchema,
  slackMessageSchema,
  slackProjectUpdateSchema,
  githubCreateIssueSchema,
  githubLinkRepoSchema,
};

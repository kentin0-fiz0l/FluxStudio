-- Performance Optimization Migration
-- Adds missing indexes for frequently queried fields
-- Sprint 11 - Database Optimization
-- Created: October 12, 2025

-- Drop existing indexes if they exist (for idempotency)
DROP INDEX IF EXISTS idx_users_oauth_provider;
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_users_last_login;

DROP INDEX IF EXISTS idx_organizations_created_by;
DROP INDEX IF EXISTS idx_organizations_subscription_tier;
DROP INDEX IF EXISTS idx_organizations_subscription_status;
DROP INDEX IF EXISTS idx_organizations_stripe_customer_id;

DROP INDEX IF EXISTS idx_organization_members_user_id;
DROP INDEX IF EXISTS idx_organization_members_role;
DROP INDEX IF EXISTS idx_organization_members_is_active;

DROP INDEX IF EXISTS idx_teams_organization_id;
DROP INDEX IF EXISTS idx_teams_lead_id;
DROP INDEX IF EXISTS idx_teams_slug;

DROP INDEX IF EXISTS idx_team_members_user_id;
DROP INDEX IF EXISTS idx_team_members_role;
DROP INDEX IF EXISTS idx_team_members_is_active;

DROP INDEX IF EXISTS idx_projects_team_id;
DROP INDEX IF EXISTS idx_projects_manager_id;
DROP INDEX IF EXISTS idx_projects_client_id;
DROP INDEX IF EXISTS idx_projects_priority;
DROP INDEX IF EXISTS idx_projects_due_date;
DROP INDEX IF EXISTS idx_projects_created_at;
DROP INDEX IF EXISTS idx_projects_tags;
DROP INDEX IF EXISTS idx_projects_composite_org_status;

DROP INDEX IF EXISTS idx_project_members_user_id;
DROP INDEX IF EXISTS idx_project_members_role;
DROP INDEX IF EXISTS idx_project_members_is_active;

DROP INDEX IF EXISTS idx_project_milestones_project_id;
DROP INDEX IF EXISTS idx_project_milestones_due_date;
DROP INDEX IF EXISTS idx_project_milestones_completed_at;

DROP INDEX IF EXISTS idx_files_uploaded_by;
DROP INDEX IF EXISTS idx_files_category;
DROP INDEX IF EXISTS idx_files_status;
DROP INDEX IF EXISTS idx_files_parent_file_id;
DROP INDEX IF EXISTS idx_files_version;
DROP INDEX IF EXISTS idx_files_is_latest;
DROP INDEX IF EXISTS idx_files_created_at;
DROP INDEX IF EXISTS idx_files_mime_type;
DROP INDEX IF EXISTS idx_files_composite_org_project;
DROP INDEX IF EXISTS idx_files_composite_project_category;

DROP INDEX IF EXISTS idx_file_permissions_user_id;
DROP INDEX IF EXISTS idx_file_permissions_team_id;
DROP INDEX IF EXISTS idx_file_permissions_permission_type;

DROP INDEX IF EXISTS idx_conversations_organization_id;
DROP INDEX IF EXISTS idx_conversations_project_id;
DROP INDEX IF EXISTS idx_conversations_team_id;
DROP INDEX IF EXISTS idx_conversations_created_by;
DROP INDEX IF EXISTS idx_conversations_type;
DROP INDEX IF EXISTS idx_conversations_is_archived;
DROP INDEX IF EXISTS idx_conversations_last_message_at;

DROP INDEX IF EXISTS idx_conversation_participants_user_id;
DROP INDEX IF EXISTS idx_conversation_participants_role;
DROP INDEX IF EXISTS idx_conversation_participants_last_read_at;

DROP INDEX IF EXISTS idx_messages_author_id;
DROP INDEX IF EXISTS idx_messages_message_type;
DROP INDEX IF EXISTS idx_messages_reply_to_id;
DROP INDEX IF EXISTS idx_messages_thread_id;
DROP INDEX IF EXISTS idx_messages_status;
DROP INDEX IF EXISTS idx_messages_deleted_at;
DROP INDEX IF EXISTS idx_messages_composite_conv_created;

DROP INDEX IF EXISTS idx_message_reactions_user_id;

DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_priority;
DROP INDEX IF EXISTS idx_notifications_read_at;
DROP INDEX IF EXISTS idx_notifications_expires_at;
DROP INDEX IF EXISTS idx_notifications_created_at;

DROP INDEX IF EXISTS idx_invoices_organization_id;
DROP INDEX IF EXISTS idx_invoices_client_id;
DROP INDEX IF EXISTS idx_invoices_project_id;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_invoices_due_date;
DROP INDEX IF EXISTS idx_invoices_stripe_customer_id;

DROP INDEX IF EXISTS idx_time_entries_user_id;
DROP INDEX IF EXISTS idx_time_entries_project_id;
DROP INDEX IF EXISTS idx_time_entries_date;
DROP INDEX IF EXISTS idx_time_entries_billable;

DROP INDEX IF EXISTS idx_service_packages_service_category;
DROP INDEX IF EXISTS idx_service_packages_service_tier;
DROP INDEX IF EXISTS idx_service_packages_is_active;

DROP INDEX IF EXISTS idx_client_requests_status;
DROP INDEX IF EXISTS idx_client_requests_assigned_to;
DROP INDEX IF EXISTS idx_client_requests_ensemble_type;
DROP INDEX IF EXISTS idx_client_requests_created_at;

DROP INDEX IF EXISTS idx_portfolios_user_id;
DROP INDEX IF EXISTS idx_portfolios_is_public;

DROP INDEX IF EXISTS idx_portfolio_items_portfolio_id;
DROP INDEX IF EXISTS idx_portfolio_items_project_id;
DROP INDEX IF EXISTS idx_portfolio_items_is_featured;

-- =================
-- USERS TABLE INDEXES
-- =================

-- OAuth lookups (already have partial idx_users_oauth, but improve it)
CREATE INDEX idx_users_oauth_provider ON users(oauth_provider) WHERE oauth_provider IS NOT NULL;

-- Active user queries
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;

-- User analytics and reporting
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_last_login ON users(last_login DESC NULLS LAST);

-- =================
-- ORGANIZATIONS TABLE INDEXES
-- =================

-- Organization ownership lookups
CREATE INDEX idx_organizations_created_by ON organizations(created_by);

-- Subscription and billing queries
CREATE INDEX idx_organizations_subscription_tier ON organizations(subscription_tier);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX idx_organizations_stripe_customer_id ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- =================
-- ORGANIZATION MEMBERS TABLE INDEXES
-- =================

-- Find user's organizations
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);

-- Role-based access control
CREATE INDEX idx_organization_members_role ON organization_members(role);

-- Active members only
CREATE INDEX idx_organization_members_is_active ON organization_members(is_active) WHERE is_active = TRUE;

-- =================
-- TEAMS TABLE INDEXES
-- =================

-- Organization team lookups
CREATE INDEX idx_teams_organization_id ON teams(organization_id);

-- Team lead queries
CREATE INDEX idx_teams_lead_id ON teams(lead_id) WHERE lead_id IS NOT NULL;

-- Slug lookups for routing
CREATE INDEX idx_teams_slug ON teams(slug);

-- =================
-- TEAM MEMBERS TABLE INDEXES
-- =================

-- Find user's teams
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Role-based queries
CREATE INDEX idx_team_members_role ON team_members(role);

-- Active members filtering
CREATE INDEX idx_team_members_is_active ON team_members(is_active) WHERE is_active = TRUE;

-- =================
-- PROJECTS TABLE INDEXES
-- =================

-- Team project queries
CREATE INDEX idx_projects_team_id ON projects(team_id) WHERE team_id IS NOT NULL;

-- Project manager lookups
CREATE INDEX idx_projects_manager_id ON projects(manager_id);

-- Client project lookups
CREATE INDEX idx_projects_client_id ON projects(client_id) WHERE client_id IS NOT NULL;

-- Priority filtering
CREATE INDEX idx_projects_priority ON projects(priority);

-- Due date sorting and filtering
CREATE INDEX idx_projects_due_date ON projects(due_date NULLS LAST);

-- Recent projects
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Tag searches (GIN index for array operations)
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);

-- Composite index for common dashboard query (org + status)
CREATE INDEX idx_projects_composite_org_status ON projects(organization_id, status, due_date);

-- =================
-- PROJECT MEMBERS TABLE INDEXES
-- =================

-- User's projects
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- Role-based access
CREATE INDEX idx_project_members_role ON project_members(role);

-- Active members
CREATE INDEX idx_project_members_is_active ON project_members(is_active) WHERE is_active = TRUE;

-- =================
-- PROJECT MILESTONES TABLE INDEXES
-- =================

-- Project milestones lookup
CREATE INDEX idx_project_milestones_project_id ON project_milestones(project_id);

-- Due date sorting
CREATE INDEX idx_project_milestones_due_date ON project_milestones(due_date NULLS LAST);

-- Completed milestones
CREATE INDEX idx_project_milestones_completed_at ON project_milestones(completed_at NULLS LAST);

-- =================
-- FILES TABLE INDEXES
-- =================

-- Uploader lookups
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);

-- Category filtering
CREATE INDEX idx_files_category ON files(category);

-- Status filtering
CREATE INDEX idx_files_status ON files(status);

-- Version control
CREATE INDEX idx_files_parent_file_id ON files(parent_file_id) WHERE parent_file_id IS NOT NULL;
CREATE INDEX idx_files_version ON files(version);
CREATE INDEX idx_files_is_latest ON files(is_latest) WHERE is_latest = TRUE;

-- Recent files
CREATE INDEX idx_files_created_at ON files(created_at DESC);

-- File type filtering
CREATE INDEX idx_files_mime_type ON files(mime_type);

-- Composite index for common file queries
CREATE INDEX idx_files_composite_org_project ON files(organization_id, project_id, created_at DESC) WHERE project_id IS NOT NULL;
CREATE INDEX idx_files_composite_project_category ON files(project_id, category, status) WHERE project_id IS NOT NULL;

-- =================
-- FILE PERMISSIONS TABLE INDEXES
-- =================

-- Permission lookups
CREATE INDEX idx_file_permissions_user_id ON file_permissions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_file_permissions_team_id ON file_permissions(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_file_permissions_permission_type ON file_permissions(permission_type);

-- =================
-- CONVERSATIONS TABLE INDEXES
-- =================

-- Organization conversations
CREATE INDEX idx_conversations_organization_id ON conversations(organization_id) WHERE organization_id IS NOT NULL;

-- Project conversations
CREATE INDEX idx_conversations_project_id ON conversations(project_id) WHERE project_id IS NOT NULL;

-- Team conversations
CREATE INDEX idx_conversations_team_id ON conversations(team_id) WHERE team_id IS NOT NULL;

-- Creator lookups
CREATE INDEX idx_conversations_created_by ON conversations(created_by);

-- Conversation type filtering
CREATE INDEX idx_conversations_type ON conversations(type);

-- Archived conversations
CREATE INDEX idx_conversations_is_archived ON conversations(is_archived) WHERE is_archived = FALSE;

-- Last activity sorting
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC NULLS LAST);

-- =================
-- CONVERSATION PARTICIPANTS TABLE INDEXES
-- =================

-- User's conversations
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);

-- Role filtering
CREATE INDEX idx_conversation_participants_role ON conversation_participants(role);

-- Unread message tracking
CREATE INDEX idx_conversation_participants_last_read_at ON conversation_participants(last_read_at NULLS LAST);

-- =================
-- MESSAGES TABLE INDEXES
-- =================

-- Author lookups
CREATE INDEX idx_messages_author_id ON messages(author_id);

-- Message type filtering
CREATE INDEX idx_messages_message_type ON messages(message_type);

-- Reply thread navigation
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_messages_thread_id ON messages(thread_id) WHERE thread_id IS NOT NULL;

-- Message status tracking
CREATE INDEX idx_messages_status ON messages(status);

-- Soft delete support
CREATE INDEX idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;

-- Composite index for conversation message queries (most common)
CREATE INDEX idx_messages_composite_conv_created ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

-- Full-text search on message content (if not exists)
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING GIN(to_tsvector('english', content));

-- =================
-- MESSAGE REACTIONS TABLE INDEXES
-- =================

-- User reactions
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- =================
-- NOTIFICATIONS TABLE INDEXES
-- =================

-- Notification type filtering
CREATE INDEX idx_notifications_type ON notifications(type);

-- Priority filtering
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- Read status
CREATE INDEX idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;

-- Expiration cleanup
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Recent notifications
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =================
-- INVOICES TABLE INDEXES
-- =================

-- Organization invoices
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);

-- Client invoices
CREATE INDEX idx_invoices_client_id ON invoices(client_id);

-- Project invoices
CREATE INDEX idx_invoices_project_id ON invoices(project_id) WHERE project_id IS NOT NULL;

-- Invoice status
CREATE INDEX idx_invoices_status ON invoices(status);

-- Due date sorting
CREATE INDEX idx_invoices_due_date ON invoices(due_date NULLS LAST);

-- Stripe integration
CREATE INDEX idx_invoices_stripe_customer_id ON invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- =================
-- TIME ENTRIES TABLE INDEXES
-- =================

-- User time entries
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);

-- Project time tracking
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);

-- Date range queries
CREATE INDEX idx_time_entries_date ON time_entries(date DESC);

-- Billable filtering
CREATE INDEX idx_time_entries_billable ON time_entries(billable);

-- =================
-- SERVICE PACKAGES TABLE INDEXES
-- =================

-- Service category filtering
CREATE INDEX idx_service_packages_service_category ON service_packages(service_category);

-- Service tier filtering
CREATE INDEX idx_service_packages_service_tier ON service_packages(service_tier);

-- Active packages only
CREATE INDEX idx_service_packages_is_active ON service_packages(is_active) WHERE is_active = TRUE;

-- =================
-- CLIENT REQUESTS TABLE INDEXES
-- =================

-- Status filtering
CREATE INDEX idx_client_requests_status ON client_requests(status);

-- Assignment lookups
CREATE INDEX idx_client_requests_assigned_to ON client_requests(assigned_to) WHERE assigned_to IS NOT NULL;

-- Ensemble type filtering
CREATE INDEX idx_client_requests_ensemble_type ON client_requests(ensemble_type);

-- Recent requests
CREATE INDEX idx_client_requests_created_at ON client_requests(created_at DESC);

-- =================
-- PORTFOLIOS TABLE INDEXES
-- =================

-- User portfolios
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);

-- Public portfolios
CREATE INDEX idx_portfolios_is_public ON portfolios(is_public) WHERE is_public = TRUE;

-- =================
-- PORTFOLIO ITEMS TABLE INDEXES
-- =================

-- Portfolio items lookup
CREATE INDEX idx_portfolio_items_portfolio_id ON portfolio_items(portfolio_id);

-- Project portfolio items
CREATE INDEX idx_portfolio_items_project_id ON portfolio_items(project_id) WHERE project_id IS NOT NULL;

-- Featured items
CREATE INDEX idx_portfolio_items_is_featured ON portfolio_items(is_featured) WHERE is_featured = TRUE;

-- =================
-- ANALYZE TABLES
-- =================

-- Update statistics for query planner
ANALYZE users;
ANALYZE organizations;
ANALYZE organization_members;
ANALYZE teams;
ANALYZE team_members;
ANALYZE projects;
ANALYZE project_members;
ANALYZE project_milestones;
ANALYZE files;
ANALYZE file_permissions;
ANALYZE conversations;
ANALYZE conversation_participants;
ANALYZE messages;
ANALYZE message_reactions;
ANALYZE notifications;
ANALYZE invoices;
ANALYZE time_entries;
ANALYZE service_packages;
ANALYZE client_requests;
ANALYZE portfolios;
ANALYZE portfolio_items;

-- Migration completed
SELECT 'Performance optimization indexes created successfully' AS status;

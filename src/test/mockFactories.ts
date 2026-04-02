/**
 * Mock Data Factories for Tests
 *
 * Provides factory functions for creating realistic test data.
 * All factories return data with sensible defaults that can be overridden.
 */

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface MockUser {
  id: string;
  email: string;
  name: string;
  displayName: string;
  avatar: string | null;
  role: string;
  userType: string;
  organizationId: string | null;
  createdAt: string;
}

let userCounter = 0;

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  userCounter++;
  return {
    id: `user-${userCounter}`,
    email: `user${userCounter}@fluxstudio.test`,
    name: `Test User ${userCounter}`,
    displayName: `Test User ${userCounter}`,
    avatar: null,
    role: 'member',
    userType: 'designer',
    organizationId: 'org-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface MockProject {
  id: string;
  name: string;
  description: string;
  slug: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  organizationId: string;
  members: string[];
  tags: string[];
}

let projectCounter = 0;

export function createMockProject(overrides: Partial<MockProject> = {}): MockProject {
  projectCounter++;
  return {
    id: `proj-${projectCounter}`,
    name: `Test Project ${projectCounter}`,
    description: 'A test project for unit testing',
    slug: `test-project-${projectCounter}`,
    status: 'in_progress',
    priority: 'medium',
    progress: 50,
    startDate: '2025-01-01',
    dueDate: '2025-06-01',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ownerId: 'user-1',
    organizationId: 'org-1',
    members: ['user-1'],
    tags: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export interface MockOrganization {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  ownerId: string;
  createdAt: string;
}

let orgCounter = 0;

export function createMockOrganization(overrides: Partial<MockOrganization> = {}): MockOrganization {
  orgCounter++;
  return {
    id: `org-${orgCounter}`,
    name: `Test Org ${orgCounter}`,
    slug: `test-org-${orgCounter}`,
    description: 'A test organization',
    logo: null,
    ownerId: 'user-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Formation
// ---------------------------------------------------------------------------

export interface MockFormation {
  id: string;
  name: string;
  description: string;
  projectId: string;
  stageWidth: number;
  stageHeight: number;
  gridSize: number;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

let formationCounter = 0;

export function createMockFormation(overrides: Partial<MockFormation> = {}): MockFormation {
  formationCounter++;
  return {
    id: `formation-${formationCounter}`,
    name: `Test Formation ${formationCounter}`,
    description: '',
    projectId: 'proj-1',
    stageWidth: 1000,
    stageHeight: 600,
    gridSize: 20,
    isArchived: false,
    createdBy: 'user-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export interface MockMessage {
  id: string;
  conversationId: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  createdAt: string;
  editedAt: string | null;
  replyToMessageId: string | null;
  isSystemMessage: boolean;
}

let messageCounter = 0;

export function createMockMessage(overrides: Partial<MockMessage> = {}): MockMessage {
  messageCounter++;
  return {
    id: `msg-${messageCounter}`,
    conversationId: 'conv-1',
    text: `Test message ${messageCounter}`,
    userId: 'user-1',
    userName: 'Test User',
    userAvatar: null,
    createdAt: new Date(Date.now() - messageCounter * 60000).toISOString(),
    editedAt: null,
    replyToMessageId: null,
    isSystemMessage: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export interface MockConversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  projectId: string | null;
  organizationId: string | null;
  memberCount: number;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

let convCounter = 0;

export function createMockConversation(overrides: Partial<MockConversation> = {}): MockConversation {
  convCounter++;
  return {
    id: `conv-${convCounter}`,
    name: `Test Conversation ${convCounter}`,
    isGroup: false,
    projectId: null,
    organizationId: 'org-1',
    memberCount: 2,
    unreadCount: 0,
    lastMessage: null,
    lastMessageAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export interface MockTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string | null;
  dueDate: string | null;
  projectId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

let taskCounter = 0;

export function createMockTask(overrides: Partial<MockTask> = {}): MockTask {
  taskCounter++;
  return {
    id: `task-${taskCounter}`,
    title: `Test Task ${taskCounter}`,
    description: 'A test task',
    status: 'todo',
    priority: 'medium',
    assignedTo: null,
    dueDate: null,
    projectId: 'proj-1',
    createdBy: 'user-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// API Response helpers
// ---------------------------------------------------------------------------

export function wrapApiResponse<T>(data: T, success = true) {
  return {
    success,
    data,
  };
}

export function wrapApiError(error: string, code?: string) {
  return {
    success: false,
    error,
    code,
  };
}

// ---------------------------------------------------------------------------
// Counter reset (call in beforeEach if needed)
// ---------------------------------------------------------------------------

export function resetFactoryCounters() {
  userCounter = 0;
  projectCounter = 0;
  orgCounter = 0;
  formationCounter = 0;
  messageCounter = 0;
  convCounter = 0;
  taskCounter = 0;
}

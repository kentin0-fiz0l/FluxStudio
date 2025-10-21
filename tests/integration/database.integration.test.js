/**
 * Database Integration Tests
 * Tests the database adapters, connections, and data operations
 */

const { createDatabaseConnection, query, transaction } = require('../../database/config');
const authAdapter = require('../../database/auth-adapter');
const messagingAdapter = require('../../database/messaging-adapter');
const { authHealthChecks, messagingHealthChecks } = require('../../health-check');

describe('Database Integration Tests', () => {
  let testUser, testConversation, testMessage;

  beforeAll(async () => {
    // Set up test environment variables
    process.env.USE_DATABASE = 'true';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'fluxstudio';
    process.env.DB_USER = 'postgres';
    process.env.DB_PASSWORD = 'postgres';
  });

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await query('DELETE FROM message_reactions WHERE 1=1');
      await query('DELETE FROM messages WHERE author_id LIKE $1', ['test-%']);
      await query('DELETE FROM conversation_participants WHERE user_id LIKE $1', ['test-%']);
      await query('DELETE FROM conversations WHERE created_by LIKE $1', ['test-%']);
      await query('DELETE FROM users WHERE id LIKE $1', ['test-%']);
    } catch (error) {
      console.warn('Cleanup failed (expected for first run):', error.message);
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    try {
      await query('DELETE FROM message_reactions WHERE 1=1');
      await query('DELETE FROM messages WHERE author_id LIKE $1', ['test-%']);
      await query('DELETE FROM conversation_participants WHERE user_id LIKE $1', ['test-%']);
      await query('DELETE FROM conversations WHERE created_by LIKE $1', ['test-%']);
      await query('DELETE FROM users WHERE id LIKE $1', ['test-%']);
    } catch (error) {
      console.warn('Test cleanup failed:', error.message);
    }
  });

  describe('Database Connection', () => {
    test('should establish database connection successfully', async () => {
      const result = await query('SELECT NOW() as timestamp');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].timestamp).toBeDefined();
    });

    test('should support transactions', async () => {
      const result = await transaction(async (client) => {
        const insertResult = await client.query(
          'INSERT INTO users (id, name, email) VALUES ($1, $2, $3) RETURNING *',
          ['test-transaction-user', 'Transaction Test', 'transaction@test.com']
        );
        return insertResult.rows[0];
      });

      expect(result.id).toBe('test-transaction-user');
      expect(result.name).toBe('Transaction Test');

      // Verify the transaction was committed
      const verifyResult = await query('SELECT * FROM users WHERE id = $1', ['test-transaction-user']);
      expect(verifyResult.rows).toHaveLength(1);
    });

    test('should rollback failed transactions', async () => {
      let errorThrown = false;

      try {
        await transaction(async (client) => {
          await client.query(
            'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)',
            ['test-rollback-user', 'Rollback Test', 'rollback@test.com']
          );
          // Force an error to trigger rollback
          throw new Error('Intentional rollback');
        });
      } catch (error) {
        errorThrown = true;
        expect(error.message).toBe('Intentional rollback');
      }

      expect(errorThrown).toBe(true);

      // Verify the transaction was rolled back
      const verifyResult = await query('SELECT * FROM users WHERE id = $1', ['test-rollback-user']);
      expect(verifyResult.rows).toHaveLength(0);
    });
  });

  describe('Auth Adapter Integration', () => {
    test('should create and retrieve users', async () => {
      const userData = {
        id: 'test-user-1',
        name: 'Test User',
        email: 'test@example.com',
        googleId: 'google-123',
        avatarUrl: 'https://example.com/avatar.jpg'
      };

      // Create user
      const createdUser = await authAdapter.createUser(userData);
      expect(createdUser.id).toBe(userData.id);
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.email).toBe(userData.email);

      testUser = createdUser;

      // Retrieve user
      const retrievedUser = await authAdapter.getUserById(userData.id);
      expect(retrievedUser).toBeTruthy();
      expect(retrievedUser.id).toBe(userData.id);
      expect(retrievedUser.name).toBe(userData.name);
    });

    test('should handle user authentication', async () => {
      if (!testUser) {
        testUser = await authAdapter.createUser({
          id: 'test-auth-user',
          name: 'Auth Test',
          email: 'auth@test.com'
        });
      }

      const userByEmail = await authAdapter.getUserByEmail('auth@test.com');
      expect(userByEmail).toBeTruthy();
      expect(userByEmail.id).toBe(testUser.id);
    });

    test('should manage organizations', async () => {
      if (!testUser) {
        testUser = await authAdapter.createUser({
          id: 'test-org-user',
          name: 'Org Test',
          email: 'org@test.com'
        });
      }

      const orgData = {
        name: 'Test Organization',
        description: 'A test organization',
        ownerId: testUser.id
      };

      const organization = await authAdapter.createOrganization(orgData);
      expect(organization.name).toBe(orgData.name);
      expect(organization.ownerId).toBe(testUser.id);

      const userOrgs = await authAdapter.getUserOrganizations(testUser.id);
      expect(userOrgs).toHaveLength(1);
      expect(userOrgs[0].name).toBe(orgData.name);
    });

    test('should pass health checks', async () => {
      const healthResult = await authHealthChecks();
      expect(healthResult.database).toBe('ok');
      expect(healthResult.storageType).toBe('postgresql');
    });
  });

  describe('Messaging Adapter Integration', () => {
    beforeEach(async () => {
      if (!testUser) {
        testUser = await authAdapter.createUser({
          id: 'test-msg-user',
          name: 'Message Test',
          email: 'message@test.com'
        });
      }
    });

    test('should create and retrieve conversations', async () => {
      const conversationData = {
        name: 'Test Conversation',
        description: 'A test conversation',
        type: 'group',
        createdBy: testUser.id
      };

      const conversation = await messagingAdapter.createConversation(conversationData);
      expect(conversation.name).toBe(conversationData.name);
      expect(conversation.createdBy).toBe(testUser.id);

      testConversation = conversation;

      const conversations = await messagingAdapter.getConversations();
      expect(conversations.length).toBeGreaterThan(0);

      const foundConversation = conversations.find(c => c.id === conversation.id);
      expect(foundConversation).toBeTruthy();
    });

    test('should manage conversation participants', async () => {
      if (!testConversation) {
        testConversation = await messagingAdapter.createConversation({
          name: 'Participant Test',
          createdBy: testUser.id
        });
      }

      // The creator should already be a participant
      const participants = await messagingAdapter.getParticipants(testConversation.id);
      expect(participants.length).toBeGreaterThan(0);
      expect(participants[0].user_id).toBe(testUser.id);

      // Add another participant
      const newUser = await authAdapter.createUser({
        id: 'test-participant-user',
        name: 'Participant',
        email: 'participant@test.com'
      });

      const added = await messagingAdapter.addParticipant(testConversation.id, newUser.id, 'member');
      expect(added).toBe(true);

      const updatedParticipants = await messagingAdapter.getParticipants(testConversation.id);
      expect(updatedParticipants.length).toBe(2);
    });

    test('should create and retrieve messages', async () => {
      if (!testConversation) {
        testConversation = await messagingAdapter.createConversation({
          name: 'Message Test',
          createdBy: testUser.id
        });
      }

      const messageData = {
        conversationId: testConversation.id,
        authorId: testUser.id,
        content: 'Test message content',
        messageType: 'text',
        priority: 'normal'
      };

      const message = await messagingAdapter.createMessage(messageData);
      expect(message.content).toBe(messageData.content);
      expect(message.authorId).toBe(testUser.id);
      expect(message.conversationId).toBe(testConversation.id);

      testMessage = message;

      const messages = await messagingAdapter.getMessages(testConversation.id);
      expect(messages.length).toBeGreaterThan(0);

      const foundMessage = messages.find(m => m.id === message.id);
      expect(foundMessage).toBeTruthy();
    });

    test('should handle message reactions', async () => {
      if (!testMessage) {
        if (!testConversation) {
          testConversation = await messagingAdapter.createConversation({
            name: 'Reaction Test',
            createdBy: testUser.id
          });
        }

        testMessage = await messagingAdapter.createMessage({
          conversationId: testConversation.id,
          authorId: testUser.id,
          content: 'Reaction test message'
        });
      }

      // Add reaction
      const reactionAdded = await messagingAdapter.addReaction(testMessage.id, testUser.id, '👍');
      expect(reactionAdded).toBe(true);

      // Get reactions
      const reactions = await messagingAdapter.getReactions(testMessage.id);
      expect(reactions.length).toBe(1);
      expect(reactions[0].reaction).toBe('👍');
      expect(reactions[0].user_id).toBe(testUser.id);

      // Remove reaction
      const reactionRemoved = await messagingAdapter.removeReaction(testMessage.id, testUser.id, '👍');
      expect(reactionRemoved).toBe(true);

      // Verify removal
      const updatedReactions = await messagingAdapter.getReactions(testMessage.id);
      expect(updatedReactions.length).toBe(0);
    });

    test('should update user presence', async () => {
      const presenceUpdated = await messagingAdapter.updateUserPresence(testUser.id, 'online');
      expect(presenceUpdated).toBe(true);

      const presence = await messagingAdapter.getUserPresence(testUser.id);
      expect(presence).toBeTruthy();
      expect(presence.status).toBe('online');
    });

    test('should pass health checks', async () => {
      const healthResult = await messagingHealthChecks();
      expect(healthResult.database).toBe('ok');
      expect(healthResult.storageType).toBe('postgresql');
      expect(typeof healthResult.messageCount).toBe('number');
      expect(typeof healthResult.conversationCount).toBe('number');
    });
  });

  describe('Cross-Service Integration', () => {
    test('should maintain data consistency across services', async () => {
      // Create user through auth service
      const user = await authAdapter.createUser({
        id: 'test-cross-user',
        name: 'Cross Service Test',
        email: 'cross@test.com'
      });

      // Use user in messaging service
      const conversation = await messagingAdapter.createConversation({
        name: 'Cross Service Conversation',
        createdBy: user.id
      });

      const message = await messagingAdapter.createMessage({
        conversationId: conversation.id,
        authorId: user.id,
        content: 'Cross service message'
      });

      // Verify relationships are maintained
      expect(message.authorId).toBe(user.id);
      expect(conversation.createdBy).toBe(user.id);

      // Check that user data is accessible from both services
      const authUser = await authAdapter.getUserById(user.id);
      expect(authUser.id).toBe(user.id);

      const messages = await messagingAdapter.getMessages(conversation.id);
      const foundMessage = messages.find(m => m.id === message.id);
      expect(foundMessage.authorId).toBe(user.id);
    });

    test('should handle concurrent operations safely', async () => {
      const user = await authAdapter.createUser({
        id: 'test-concurrent-user',
        name: 'Concurrent Test',
        email: 'concurrent@test.com'
      });

      const conversation = await messagingAdapter.createConversation({
        name: 'Concurrent Test Conversation',
        createdBy: user.id
      });

      // Create multiple messages concurrently
      const messagePromises = Array.from({ length: 10 }, (_, i) =>
        messagingAdapter.createMessage({
          conversationId: conversation.id,
          authorId: user.id,
          content: `Concurrent message ${i}`
        })
      );

      const messages = await Promise.all(messagePromises);
      expect(messages).toHaveLength(10);

      // Verify all messages were created
      const retrievedMessages = await messagingAdapter.getMessages(conversation.id);
      expect(retrievedMessages.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large datasets efficiently', async () => {
      const user = await authAdapter.createUser({
        id: 'test-perf-user',
        name: 'Performance Test',
        email: 'perf@test.com'
      });

      const conversation = await messagingAdapter.createConversation({
        name: 'Performance Test Conversation',
        createdBy: user.id
      });

      const startTime = Date.now();

      // Create 100 messages
      const messagePromises = Array.from({ length: 100 }, (_, i) =>
        messagingAdapter.createMessage({
          conversationId: conversation.id,
          authorId: user.id,
          content: `Performance test message ${i}`
        })
      );

      await Promise.all(messagePromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Created 100 messages in ${duration}ms`);

      // Should complete in reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds

      // Verify all messages are retrievable
      const messages = await messagingAdapter.getMessages(conversation.id);
      expect(messages.length).toBeGreaterThanOrEqual(100);
    });

    test('should efficiently query with pagination', async () => {
      const user = await authAdapter.createUser({
        id: 'test-pagination-user',
        name: 'Pagination Test',
        email: 'pagination@test.com'
      });

      const conversation = await messagingAdapter.createConversation({
        name: 'Pagination Test Conversation',
        createdBy: user.id
      });

      // Create 50 messages
      for (let i = 0; i < 50; i++) {
        await messagingAdapter.createMessage({
          conversationId: conversation.id,
          authorId: user.id,
          content: `Pagination message ${i}`
        });
      }

      const startTime = Date.now();

      // Test pagination
      const page1 = await messagingAdapter.getMessages(conversation.id, 10);
      const page2 = await messagingAdapter.getMessages(conversation.id, 10);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Paginated queries completed in ${duration}ms`);

      expect(page1.length).toBeLessThanOrEqual(10);
      expect(page2.length).toBeLessThanOrEqual(10);
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Error Handling', () => {
    test('should handle missing foreign key references gracefully', async () => {
      // Try to create a message with non-existent conversation
      await expect(
        messagingAdapter.createMessage({
          conversationId: 'non-existent-conversation',
          authorId: 'non-existent-user',
          content: 'This should fail'
        })
      ).rejects.toThrow();
    });

    test('should handle duplicate user creation gracefully', async () => {
      const userData = {
        id: 'test-duplicate-user',
        name: 'Duplicate Test',
        email: 'duplicate@test.com'
      };

      // Create user first time
      await authAdapter.createUser(userData);

      // Try to create same user again
      await expect(authAdapter.createUser(userData)).rejects.toThrow();
    });

    test('should handle invalid data gracefully', async () => {
      // Try to create user with invalid email
      await expect(
        authAdapter.createUser({
          id: 'test-invalid-user',
          name: 'Invalid Test',
          email: 'invalid-email'
        })
      ).rejects.toThrow();
    });
  });
});
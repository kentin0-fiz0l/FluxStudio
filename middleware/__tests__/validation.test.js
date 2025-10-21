/**
 * Comprehensive test suite for validation middleware
 *
 * Tests cover:
 * - XSS protection
 * - Length validation
 * - Whitelist validation
 * - UUID validation
 * - Date format validation
 * - Required field validation
 * - Error message clarity
 * - Custom validators
 * - Async validators
 */

const {
  validateProjectData,
  validateTaskData,
  validateMilestoneData,
  createValidator,
  createCustomValidator,
  createAsyncValidator,
  validateRequired,
  validateLength,
  validateWhitelist,
  validateUUID,
  validateISO8601,
  validateEmail,
  validateURL,
  sanitizeString,
  validateField,
  ValidationError,
  createValidationError,
  VALIDATION_RULES
} = require('../validation');

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Creates a mock Express request object
 */
function createMockRequest(body = {}) {
  return {
    body,
    params: {},
    query: {},
    headers: {}
  };
}

/**
 * Creates a mock Express response object
 */
function createMockResponse() {
  const res = {
    statusCode: null,
    jsonData: null
  };

  res.status = function(code) {
    res.statusCode = code;
    return res;
  };

  res.json = function(data) {
    res.jsonData = data;
    return res;
  };

  return res;
}

/**
 * Creates a mock next function
 */
function createMockNext() {
  let called = false;
  const mockFn = function() {
    called = true;
  };
  mockFn.mock = {
    get calls() { return called ? [[]]: []; }
  };
  return mockFn;
}

/**
 * Helper to test validation middleware
 */
async function testValidator(validator, body, expectError = false) {
  const req = createMockRequest(body);
  const res = createMockResponse();
  const next = createMockNext();

  await validator(req, res, next);

  if (expectError) {
    expect(res.statusCode).toBe(400);
    expect(res.jsonData.success).toBe(false);
    expect(res.jsonData.error).toBeDefined();
    expect(next.mock.calls.length).toBe(0);
    return res.jsonData;
  } else {
    expect(next.mock.calls.length).toBeGreaterThan(0);
    expect(res.statusCode).toBeNull();
    return req.body;
  }
}

// ============================================================================
// CORE VALIDATOR TESTS
// ============================================================================

describe('Core Validators', () => {
  describe('validateRequired', () => {
    test('should pass for valid string', () => {
      expect(() => validateRequired('test', 'Field')).not.toThrow();
    });

    test('should fail for empty string', () => {
      expect(() => validateRequired('', 'Field')).toThrow(ValidationError);
    });

    test('should fail for whitespace only', () => {
      expect(() => validateRequired('   ', 'Field')).toThrow(ValidationError);
    });

    test('should fail for null', () => {
      expect(() => validateRequired(null, 'Field')).toThrow(ValidationError);
    });

    test('should fail for undefined', () => {
      expect(() => validateRequired(undefined, 'Field')).toThrow(ValidationError);
    });

    test('should fail for non-string types', () => {
      expect(() => validateRequired(123, 'Field')).toThrow(ValidationError);
      expect(() => validateRequired({}, 'Field')).toThrow(ValidationError);
      expect(() => validateRequired([], 'Field')).toThrow(ValidationError);
    });

    test('should include field name in error message', () => {
      try {
        validateRequired('', 'Username');
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('Username');
        expect(error.field).toBe('Username');
      }
    });
  });

  describe('validateLength', () => {
    test('should pass for string within limit', () => {
      expect(() => validateLength('test', 10, 'Field')).not.toThrow();
    });

    test('should pass for empty string', () => {
      expect(() => validateLength('', 10, 'Field')).not.toThrow();
    });

    test('should pass for null/undefined', () => {
      expect(() => validateLength(null, 10, 'Field')).not.toThrow();
      expect(() => validateLength(undefined, 10, 'Field')).not.toThrow();
    });

    test('should fail for string exceeding limit', () => {
      expect(() => validateLength('12345678901', 10, 'Field')).toThrow(ValidationError);
    });

    test('should include limit in error message', () => {
      try {
        validateLength('too long', 5, 'Description');
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('5 characters');
        expect(error.message).toContain('Description');
      }
    });
  });

  describe('validateWhitelist', () => {
    const whitelist = ['option1', 'option2', 'option3'];

    test('should pass for whitelisted value', () => {
      expect(() => validateWhitelist('option1', whitelist, 'Field')).not.toThrow();
    });

    test('should pass for null/undefined', () => {
      expect(() => validateWhitelist(null, whitelist, 'Field')).not.toThrow();
      expect(() => validateWhitelist(undefined, whitelist, 'Field')).not.toThrow();
    });

    test('should fail for non-whitelisted value', () => {
      expect(() => validateWhitelist('option4', whitelist, 'Field')).toThrow(ValidationError);
    });

    test('should be case-sensitive', () => {
      expect(() => validateWhitelist('Option1', whitelist, 'Field')).toThrow(ValidationError);
    });

    test('should include allowed values in error message', () => {
      try {
        validateWhitelist('invalid', whitelist, 'Status');
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('option1, option2, option3');
        expect(error.message).toContain('Status');
      }
    });
  });

  describe('validateUUID', () => {
    test('should pass for valid UUID v4', () => {
      expect(() => validateUUID('550e8400-e29b-41d4-a716-446655440000', 'Field')).not.toThrow();
    });

    test('should pass for null/undefined', () => {
      expect(() => validateUUID(null, 'Field')).not.toThrow();
      expect(() => validateUUID(undefined, 'Field')).not.toThrow();
    });

    test('should fail for invalid UUID', () => {
      expect(() => validateUUID('not-a-uuid', 'Field')).toThrow(ValidationError);
      expect(() => validateUUID('12345', 'Field')).toThrow(ValidationError);
    });

    test('should include field name in error message', () => {
      try {
        validateUUID('invalid', 'User ID');
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('User ID');
        expect(error.message).toContain('UUID');
      }
    });
  });

  describe('validateISO8601', () => {
    test('should pass for valid ISO 8601 date', () => {
      expect(() => validateISO8601('2025-10-30T00:00:00Z', 'Field')).not.toThrow();
      expect(() => validateISO8601('2025-10-30T12:30:45.123Z', 'Field')).not.toThrow();
    });

    test('should pass for null/undefined', () => {
      expect(() => validateISO8601(null, 'Field')).not.toThrow();
      expect(() => validateISO8601(undefined, 'Field')).not.toThrow();
    });

    test('should fail for invalid date format', () => {
      // Note: validator.isISO8601 accepts some dates without time
      expect(() => validateISO8601('10/30/2025', 'Field')).toThrow(ValidationError);
      expect(() => validateISO8601('not-a-date', 'Field')).toThrow(ValidationError);
    });

    test('should include format example in error message', () => {
      try {
        validateISO8601('invalid', 'Due Date');
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('ISO 8601');
        expect(error.message).toContain('Due Date');
      }
    });
  });

  describe('validateEmail', () => {
    test('should pass for valid email', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow();
      expect(() => validateEmail('user+tag@domain.co.uk')).not.toThrow();
    });

    test('should pass for null/undefined', () => {
      expect(() => validateEmail(null)).not.toThrow();
      expect(() => validateEmail(undefined)).not.toThrow();
    });

    test('should fail for invalid email', () => {
      expect(() => validateEmail('not-an-email')).toThrow(ValidationError);
      expect(() => validateEmail('missing@domain')).toThrow(ValidationError);
      expect(() => validateEmail('@example.com')).toThrow(ValidationError);
    });
  });

  describe('validateURL', () => {
    test('should pass for valid URL', () => {
      expect(() => validateURL('https://example.com')).not.toThrow();
      expect(() => validateURL('http://subdomain.example.com/path')).not.toThrow();
    });

    test('should pass for null/undefined', () => {
      expect(() => validateURL(null)).not.toThrow();
      expect(() => validateURL(undefined)).not.toThrow();
    });

    test('should fail for invalid URL', () => {
      expect(() => validateURL('not a url')).toThrow(ValidationError);
      // Note: validator may accept some URLs without protocol in certain modes
    });
  });
});

// ============================================================================
// SANITIZATION TESTS
// ============================================================================

describe('Sanitization', () => {
  describe('sanitizeString', () => {
    test('should escape HTML entities', () => {
      expect(sanitizeString('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    test('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });

    test('should handle combined XSS and whitespace', () => {
      expect(sanitizeString('  <b>text</b>  ')).toBe('&lt;b&gt;text&lt;&#x2F;b&gt;');
    });

    test('should handle special characters', () => {
      expect(sanitizeString('Test & "quotes" <tag>')).toContain('&amp;');
      expect(sanitizeString('Test & "quotes" <tag>')).toContain('&quot;');
    });

    test('should return non-strings unchanged', () => {
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(undefined);
    });
  });
});

// ============================================================================
// PROJECT VALIDATOR TESTS
// ============================================================================

describe('validateProjectData', () => {
  test('should accept valid project data', async () => {
    const body = await testValidator(validateProjectData, {
      name: 'Test Project',
      description: 'A test project',
      status: 'planning',
      priority: 'high',
      teamId: '550e8400-e29b-41d4-a716-446655440000'
    });

    expect(body.name).toBe('Test Project');
    expect(body.description).toBe('A test project');
  });

  test('should sanitize XSS in name', async () => {
    const body = await testValidator(validateProjectData, {
      name: '<script>alert("xss")</script>Project'
    });

    expect(body.name).not.toContain('<script>');
    expect(body.name).toContain('&lt;script&gt;');
  });

  test('should reject missing name', async () => {
    const error = await testValidator(
      validateProjectData,
      { description: 'Test' },
      true
    );

    expect(error.error).toContain('Project name');
    expect(error.error).toContain('required');
  });

  test('should reject name exceeding length', async () => {
    const longName = 'A'.repeat(201);
    const error = await testValidator(
      validateProjectData,
      { name: longName },
      true
    );

    expect(error.error).toContain('200 characters');
  });

  test('should reject invalid status', async () => {
    const error = await testValidator(
      validateProjectData,
      { name: 'Test', status: 'invalid_status' },
      true
    );

    expect(error.error).toContain('Status');
    expect(error.error).toContain('planning, in_progress, on_hold, completed, cancelled');
  });

  test('should reject invalid priority', async () => {
    const error = await testValidator(
      validateProjectData,
      { name: 'Test', priority: 'invalid_priority' },
      true
    );

    expect(error.error).toContain('Priority');
    expect(error.error).toContain('low, medium, high, urgent');
  });

  test('should reject invalid teamId UUID', async () => {
    const error = await testValidator(
      validateProjectData,
      { name: 'Test', teamId: 'not-a-uuid' },
      true
    );

    expect(error.error).toContain('Team ID');
    expect(error.error).toContain('UUID');
  });

  test('should handle optional fields', async () => {
    const body = await testValidator(validateProjectData, {
      name: 'Minimal Project'
    });

    expect(body.name).toBe('Minimal Project');
    expect(body.description).toBeUndefined();
  });
});

// ============================================================================
// TASK VALIDATOR TESTS
// ============================================================================

describe('validateTaskData', () => {
  test('should accept valid task data', async () => {
    const body = await testValidator(validateTaskData, {
      title: 'Test Task',
      description: 'Task description',
      status: 'todo',
      priority: 'high',
      dueDate: '2025-10-30T00:00:00Z',
      assignedTo: '550e8400-e29b-41d4-a716-446655440000'
    });

    expect(body.title).toBe('Test Task');
  });

  test('should sanitize XSS in title and description', async () => {
    const body = await testValidator(validateTaskData, {
      title: '<img src=x onerror=alert(1)>',
      description: '<script>malicious</script>'
    });

    expect(body.title).not.toContain('<img');
    expect(body.description).not.toContain('<script>');
  });

  test('should reject missing title', async () => {
    const error = await testValidator(
      validateTaskData,
      { description: 'Test' },
      true
    );

    expect(error.error).toContain('Task title');
    expect(error.error).toContain('required');
  });

  test('should reject invalid status', async () => {
    const error = await testValidator(
      validateTaskData,
      { title: 'Test', status: 'invalid' },
      true
    );

    expect(error.error).toContain('Task status');
    expect(error.error).toContain('todo, in_progress, completed');
  });

  test('should reject invalid dueDate format', async () => {
    const error = await testValidator(
      validateTaskData,
      { title: 'Test', dueDate: '10/30/2025' },
      true
    );

    expect(error.error).toContain('Due date');
    expect(error.error).toContain('ISO 8601');
  });
});

// ============================================================================
// MILESTONE VALIDATOR TESTS
// ============================================================================

describe('validateMilestoneData', () => {
  test('should accept valid milestone data', async () => {
    const body = await testValidator(validateMilestoneData, {
      title: 'Release v1.0',
      description: 'First major release',
      dueDate: '2025-12-31T23:59:59Z'
    });

    expect(body.title).toBe('Release v1.0');
  });

  test('should reject missing title', async () => {
    const error = await testValidator(
      validateMilestoneData,
      { description: 'Test' },
      true
    );

    expect(error.error).toContain('Milestone title');
  });
});

// ============================================================================
// CUSTOM VALIDATOR TESTS
// ============================================================================

describe('createCustomValidator', () => {
  test('should create working validator from custom rules', async () => {
    const customValidator = createCustomValidator({
      username: { required: true, maxLength: 20, fieldName: 'Username' },
      bio: { maxLength: 100, fieldName: 'Bio' }
    });

    const body = await testValidator(customValidator, {
      username: 'testuser',
      bio: 'This is my bio'
    });

    expect(body.username).toBe('testuser');
  });

  test('should enforce custom rules', async () => {
    const customValidator = createCustomValidator({
      username: { required: true, maxLength: 5, fieldName: 'Username' }
    });

    const error = await testValidator(
      customValidator,
      { username: 'toolongusername' },
      true
    );

    expect(error.error).toContain('Username');
    expect(error.error).toContain('5 characters');
  });
});

// ============================================================================
// ASYNC VALIDATOR TESTS
// ============================================================================

describe('createAsyncValidator', () => {
  test('should support async validation logic', async () => {
    const asyncValidator = createAsyncValidator(async (req, res, next) => {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      if (req.body.username === 'taken') {
        throw new ValidationError('Username already exists', 'username');
      }
      next();
    });

    // Should pass for available username
    await testValidator(asyncValidator, { username: 'available' });

    // Should fail for taken username
    const error = await testValidator(
      asyncValidator,
      { username: 'taken' },
      true
    );

    expect(error.error).toContain('Username already exists');
    expect(error.field).toBe('username');
  });

  test('should handle async errors', async () => {
    const asyncValidator = createAsyncValidator(async (req, res, next) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      throw new ValidationError('Async validation failed');
    });

    const error = await testValidator(
      asyncValidator,
      { test: 'data' },
      true
    );

    expect(error.error).toBe('Async validation failed');
  });
});

// ============================================================================
// VALIDATION ERROR TESTS
// ============================================================================

describe('ValidationError', () => {
  test('should create error with message', () => {
    const error = new ValidationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ValidationError');
    expect(error.statusCode).toBe(400);
    expect(error.field).toBeNull();
  });

  test('should create error with field', () => {
    const error = new ValidationError('Test error', 'fieldName');
    expect(error.field).toBe('fieldName');
  });

  test('should be instance of Error', () => {
    const error = new ValidationError('Test error');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof ValidationError).toBe(true);
  });
});

describe('createValidationError', () => {
  test('should create standardized error response', () => {
    const error = createValidationError('Test error');
    expect(error.success).toBe(false);
    expect(error.error).toBe('Test error');
  });

  test('should include field when provided', () => {
    const error = createValidationError('Test error', 'username');
    expect(error.field).toBe('username');
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  test('should handle multiple validation errors gracefully', async () => {
    // Test that first error is returned
    const error = await testValidator(
      validateProjectData,
      {
        // Missing name (should fail first)
        status: 'invalid_status',
        priority: 'invalid_priority'
      },
      true
    );

    expect(error.error).toContain('Project name');
  });

  test('should sanitize all string fields', async () => {
    const body = await testValidator(validateProjectData, {
      name: '<script>name</script>',
      description: '<img src=x onerror=alert(1)>'
    });

    expect(body.name).not.toContain('<script>');
    expect(body.description).not.toContain('<img');
    expect(body.name).toContain('&lt;');
    expect(body.description).toContain('&lt;');
  });

  test('should preserve valid data unchanged', async () => {
    const validData = {
      name: 'Valid Project Name',
      description: 'This is a valid description with no HTML',
      status: 'planning',
      priority: 'high'
    };

    const body = await testValidator(validateProjectData, validData);

    expect(body.name).toBe(validData.name);
    expect(body.description).toBe(validData.description);
    expect(body.status).toBe(validData.status);
    expect(body.priority).toBe(validData.priority);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  test('should handle empty request body', async () => {
    const error = await testValidator(validateProjectData, {}, true);
    expect(error.error).toContain('required');
  });

  test('should handle null values in optional fields', async () => {
    const body = await testValidator(validateProjectData, {
      name: 'Test',
      description: null,
      status: null,
      priority: null
    });

    expect(body.name).toBe('Test');
  });

  test('should handle extreme length strings', async () => {
    const extremeString = 'A'.repeat(10000);
    const error = await testValidator(
      validateProjectData,
      { name: extremeString },
      true
    );

    expect(error.error).toContain('200 characters');
  });

  test('should handle unicode characters', async () => {
    const body = await testValidator(validateProjectData, {
      name: 'Test 测试 тест テスト',
      description: 'Emoji test: 🚀 ✨ 💻'
    });

    expect(body.name).toContain('Test');
    expect(body.description).toContain('Emoji test');
  });

  test('should handle special SQL injection attempts', async () => {
    const body = await testValidator(validateProjectData, {
      name: "'; DROP TABLE projects; --"
    });

    // Should escape special characters
    expect(body.name).not.toContain("'");
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance', () => {
  test('should validate large batches efficiently', async () => {
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await testValidator(validateProjectData, {
        name: `Project ${i}`,
        description: `Description for project ${i}`,
        status: 'planning',
        priority: 'medium'
      });
    }

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });
});

// ============================================================================
// VALIDATION RULES EXPORT TEST
// ============================================================================

describe('VALIDATION_RULES export', () => {
  test('should export validation rules configuration', () => {
    expect(VALIDATION_RULES).toBeDefined();
    expect(VALIDATION_RULES.project).toBeDefined();
    expect(VALIDATION_RULES.task).toBeDefined();
    expect(VALIDATION_RULES.milestone).toBeDefined();
  });

  test('should have correct project rules', () => {
    expect(VALIDATION_RULES.project.name.required).toBe(true);
    expect(VALIDATION_RULES.project.name.maxLength).toBe(200);
    expect(VALIDATION_RULES.project.status.whitelist).toContain('planning');
  });
});

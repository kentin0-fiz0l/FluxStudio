# Validation Middleware Guide

Comprehensive guide for FluxStudio's validation middleware system.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Ready-to-Use Validators](#ready-to-use-validators)
- [Creating Custom Validators](#creating-custom-validators)
- [Async Validation](#async-validation)
- [Validation Functions](#validation-functions)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [API Reference](#api-reference)

---

## Overview

The validation middleware provides:

- **XSS Protection**: Automatic HTML entity escaping to prevent cross-site scripting attacks
- **Length Validation**: Enforce maximum character limits on text fields
- **Whitelist Validation**: Ensure values match predefined allowed options
- **Format Validation**: Validate UUIDs, ISO 8601 dates, emails, and URLs
- **Required Field Validation**: Ensure critical fields are present and non-empty
- **Composable Design**: Build complex validators from simple, reusable functions
- **Type Safety**: Full TypeScript definitions included
- **Clear Error Messages**: User-friendly error messages with field-specific details

### Security Features

- All string inputs are automatically sanitized using `validator.escape()`
- HTML entities are escaped: `<script>` becomes `&lt;script&gt;`
- Whitespace is trimmed before validation
- SQL injection attempts are neutralized through escaping

---

## Quick Start

### Installation

The required dependencies are already installed in FluxStudio:

```bash
npm install validator  # Already installed
```

### Basic Usage

```javascript
const express = require('express');
const { validateProjectData } = require('./middleware/validation');

const app = express();

// Apply validation middleware to route
app.post('/api/projects',
  authenticateToken,
  validateProjectData,  // <-- Validates and sanitizes req.body
  async (req, res) => {
    // req.body is now validated and safe to use
    const project = await createProject(req.body);
    res.json({ success: true, project });
  }
);
```

That's it! The middleware automatically:
1. Validates all required fields
2. Enforces length limits
3. Sanitizes against XSS attacks
4. Returns clear error messages if validation fails
5. Passes control to your handler if validation succeeds

---

## Core Concepts

### Validation Flow

```
Request → Validator Middleware → Validation → Handler
                                     ↓
                                  Error? → 400 Response
```

1. **Request arrives** with data in `req.body`
2. **Validator runs** and checks each field against rules
3. **Sanitization** happens automatically for string fields
4. **Validation errors** return 400 status with clear message
5. **Valid data** passes through to your route handler

### Validation Rules

Each field can have multiple validation rules:

```javascript
{
  name: {
    required: true,          // Must be present and non-empty
    maxLength: 200,          // Cannot exceed 200 characters
    fieldName: 'Project name' // Used in error messages
  },
  status: {
    whitelist: ['active', 'inactive'], // Must be one of these values
    fieldName: 'Status'
  }
}
```

### Automatic Sanitization

All string fields are automatically sanitized:

```javascript
// Input
{ name: '<script>alert("xss")</script>' }

// After validation
{ name: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;' }
```

---

## Ready-to-Use Validators

Three validators are ready to use out of the box:

### 1. `validateProjectData`

Validates project creation and update requests.

**Protected Fields:**
- `name` - Required, max 200 chars, sanitized
- `description` - Optional, max 2000 chars, sanitized
- `status` - Optional, must be: planning, in_progress, on_hold, completed, cancelled
- `priority` - Optional, must be: low, medium, high, urgent
- `teamId` - Optional, must be valid UUID

**Usage:**

```javascript
app.post('/api/projects',
  authenticateToken,
  validateProjectData,
  async (req, res) => {
    // Safe to use req.body
    const project = await Project.create(req.body);
    res.json({ success: true, project });
  }
);
```

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Project",
    "description": "Project description",
    "status": "planning",
    "priority": "high",
    "teamId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### 2. `validateTaskData`

Validates task creation and update requests.

**Protected Fields:**
- `title` - Required, max 500 chars, sanitized
- `description` - Optional, max 5000 chars, sanitized
- `status` - Optional, must be: todo, in_progress, completed
- `priority` - Optional, must be: low, medium, high
- `dueDate` - Optional, must be ISO 8601 format
- `assignedTo` - Optional, must be valid UUID

**Usage:**

```javascript
app.post('/api/projects/:projectId/tasks',
  authenticateToken,
  validateTaskData,
  async (req, res) => {
    const task = await Task.create({
      ...req.body,
      projectId: req.params.projectId
    });
    res.json({ success: true, task });
  }
);
```

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/projects/$PROJECT_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement authentication",
    "description": "Add JWT authentication",
    "status": "todo",
    "priority": "high",
    "dueDate": "2025-10-30T00:00:00Z",
    "assignedTo": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### 3. `validateMilestoneData`

Validates milestone creation and update requests.

**Protected Fields:**
- `title` - Required, max 300 chars, sanitized
- `description` - Optional, max 3000 chars, sanitized
- `dueDate` - Optional, must be ISO 8601 format

**Usage:**

```javascript
app.post('/api/projects/:projectId/milestones',
  authenticateToken,
  validateMilestoneData,
  async (req, res) => {
    const milestone = await Milestone.create({
      ...req.body,
      projectId: req.params.projectId
    });
    res.json({ success: true, milestone });
  }
);
```

---

## Creating Custom Validators

### Using `createCustomValidator`

For one-off validation needs, create custom validators easily:

```javascript
const { createCustomValidator } = require('./middleware/validation');

const validateUserProfile = createCustomValidator({
  username: {
    required: true,
    maxLength: 50,
    fieldName: 'Username'
  },
  bio: {
    maxLength: 500,
    fieldName: 'Bio'
  },
  website: {
    fieldName: 'Website URL'
  },
  email: {
    required: true,
    fieldName: 'Email address'
  }
});

app.put('/api/profile',
  authenticateToken,
  validateUserProfile,
  async (req, res) => {
    await updateProfile(req.user.id, req.body);
    res.json({ success: true });
  }
);
```

### Using `createValidator`

For reusable validators, define a schema and use `createValidator`:

```javascript
const { createValidator } = require('./middleware/validation');

// Define schema
const commentSchema = {
  content: {
    required: true,
    maxLength: 1000,
    fieldName: 'Comment content'
  },
  parentId: {
    uuid: true,
    fieldName: 'Parent comment ID'
  }
};

// Create validator
const validateComment = createValidator(commentSchema);

// Use in route
app.post('/api/comments',
  authenticateToken,
  validateComment,
  async (req, res) => {
    const comment = await Comment.create({
      ...req.body,
      userId: req.user.id
    });
    res.json({ success: true, comment });
  }
);
```

### Available Rule Options

```javascript
{
  fieldName: 'Human-readable field name',  // Required - used in error messages
  required: true,                          // Field must be present and non-empty string
  maxLength: 200,                          // Maximum string length
  whitelist: ['option1', 'option2'],       // Allowed values (exact match)
  uuid: true,                              // Must be valid UUID format
  iso8601: true                            // Must be valid ISO 8601 date
}
```

---

## Async Validation

For validation that requires database queries or API calls, use async validators:

### Example: Unique Username Validation

```javascript
const { createAsyncValidator, ValidationError } = require('./middleware/validation');

const validateUniqueUsername = createAsyncValidator(async (req, res, next) => {
  const { username } = req.body;

  // Query database
  const existingUser = await User.findOne({ username });

  if (existingUser) {
    throw new ValidationError('Username already taken', 'username');
  }

  next();
});

// Apply multiple validators
app.post('/api/register',
  validateUserProfile,      // Sync validation first
  validateUniqueUsername,   // Then async validation
  async (req, res) => {
    const user = await User.create(req.body);
    res.json({ success: true, user });
  }
);
```

### Example: Authorization Check

```javascript
const validateProjectAccess = createAsyncValidator(async (req, res, next) => {
  const { projectId } = req.params;
  const userId = req.user.id;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ValidationError('Project not found', 'projectId');
  }

  const hasAccess = project.members.some(m => m.userId === userId);

  if (!hasAccess) {
    throw new ValidationError('You do not have access to this project', 'projectId');
  }

  // Store project in request for handler
  req.project = project;
  next();
});

app.put('/api/projects/:projectId/tasks/:taskId',
  authenticateToken,
  validateProjectAccess,
  validateTaskData,
  async (req, res) => {
    // req.project is available from async validator
    const task = await updateTask(req.params.taskId, req.body);
    res.json({ success: true, task });
  }
);
```

---

## Validation Functions

Use validation functions directly in your code (not as middleware):

### Available Functions

```javascript
const {
  validateRequired,
  validateLength,
  validateWhitelist,
  validateUUID,
  validateISO8601,
  validateEmail,
  validateURL,
  sanitizeString
} = require('./middleware/validation');
```

### Example: Service Layer Validation

```javascript
const { validateEmail, ValidationError } = require('./middleware/validation');

async function inviteTeamMember(teamId, email) {
  try {
    // Validate email before processing
    validateEmail(email, 'Team member email');

    // Continue with business logic
    const invitation = await createInvitation(teamId, email);
    return invitation;

  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error(`Invalid invitation: ${error.message}`);
    }
    throw error;
  }
}
```

### Example: Manual Sanitization

```javascript
const { sanitizeString } = require('./middleware/validation');

function processUserInput(input) {
  // Sanitize before storing or displaying
  const safe = sanitizeString(input);

  // Store safely
  await saveToDatabase(safe);

  return safe;
}
```

---

## Error Handling

### Error Response Format

All validation errors return a consistent format:

```json
{
  "success": false,
  "error": "Project name must be 200 characters or less",
  "field": "Project name"
}
```

### HTTP Status Codes

- **400 Bad Request** - Validation failed (all validation errors)
- **Next middleware** - Validation passed

### Custom Error Handling

Add a global error handler for validation errors:

```javascript
const { validationErrorHandler } = require('./middleware/validation');

// Apply after all routes
app.use(validationErrorHandler);

// Then your general error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});
```

### Frontend Error Handling

```typescript
async function createProject(data: ProjectData) {
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      // Validation error
      if (result.field) {
        // Show error on specific field
        showFieldError(result.field, result.error);
      } else {
        // Show general error
        showGeneralError(result.error);
      }
      return;
    }

    // Success
    return result.project;

  } catch (error) {
    // Network or server error
    showGeneralError('Unable to create project. Please try again.');
  }
}
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run validation tests specifically
npm test -- middleware/__tests__/validation.test.js

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Writing Tests

Use the provided test utilities:

```javascript
const { validateProjectData } = require('../middleware/validation');

describe('Custom Validator Tests', () => {
  test('should validate custom data', async () => {
    const req = { body: { name: 'Test' } };
    const res = {
      statusCode: null,
      jsonData: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    const next = jest.fn();

    await validateProjectData(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.name).toBe('Test');
  });
});
```

### Test Coverage

The test suite covers:
- XSS protection
- Length validation
- Whitelist validation
- UUID validation
- Date format validation
- Required field validation
- Custom validators
- Async validators
- Error handling
- Edge cases
- Performance

---

## Best Practices

### 1. Always Use Validators on Public Endpoints

```javascript
// GOOD
app.post('/api/projects', authenticateToken, validateProjectData, handler);

// BAD - No validation!
app.post('/api/projects', authenticateToken, handler);
```

### 2. Order Middleware Correctly

```javascript
// Correct order: Auth → Validation → Handler
app.post('/api/projects',
  authenticateToken,      // 1. Authenticate first
  validateProjectData,    // 2. Validate input
  async (req, res) => {   // 3. Handle request
    // ...
  }
);
```

### 3. Validate Early, Return Fast

```javascript
// Validation happens before expensive operations
app.post('/api/projects',
  authenticateToken,
  validateProjectData,    // Fails fast if invalid
  async (req, res) => {
    // Only runs if validation passed
    await expensiveDatabaseOperation(req.body);
  }
);
```

### 4. Use Async Validators for Database Checks

```javascript
// Sync validator for basic checks
const validateBasicUserData = createValidator({
  email: { required: true, fieldName: 'Email' }
});

// Async validator for database checks
const validateUniqueEmail = createAsyncValidator(async (req, res, next) => {
  const exists = await User.exists({ email: req.body.email });
  if (exists) throw new ValidationError('Email already registered');
  next();
});

app.post('/api/register',
  validateBasicUserData,   // Fast sync validation first
  validateUniqueEmail,     // Then async database check
  handler
);
```

### 5. Reuse Validation Logic

```javascript
// Define once
const teamIdValidation = {
  teamId: { uuid: true, required: true, fieldName: 'Team ID' }
};

// Use in multiple validators
const validateProject = createValidator({
  name: { required: true, maxLength: 200, fieldName: 'Project name' },
  ...teamIdValidation
});

const validateTask = createValidator({
  title: { required: true, maxLength: 500, fieldName: 'Task title' },
  ...teamIdValidation
});
```

### 6. Provide Clear Field Names

```javascript
// GOOD - Clear, user-friendly names
const schema = {
  name: { fieldName: 'Project name' },
  desc: { fieldName: 'Project description' }
};

// BAD - Technical field names
const schema = {
  name: { fieldName: 'name' },
  desc: { fieldName: 'desc' }
};
```

### 7. Sanitize User-Generated Content

```javascript
const { sanitizeString } = require('./middleware/validation');

// Always sanitize before storing or displaying
async function saveComment(content) {
  const safe = sanitizeString(content);
  await Comment.create({ content: safe });
}
```

### 8. Handle Validation Errors in Frontend

```typescript
// Show field-specific errors to users
if (error.field) {
  setFieldError(error.field, error.error);
} else {
  setGeneralError(error.error);
}
```

---

## Examples

### Example 1: Complete CRUD with Validation

```javascript
const express = require('express');
const {
  validateProjectData,
  createCustomValidator,
  ValidationError
} = require('./middleware/validation');

const router = express.Router();

// List projects (no validation needed for GET)
router.get('/', authenticateToken, async (req, res) => {
  const projects = await Project.find({ userId: req.user.id });
  res.json({ success: true, projects });
});

// Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, project });
});

// Create project (with validation)
router.post('/',
  authenticateToken,
  validateProjectData,
  async (req, res) => {
    const project = await Project.create({
      ...req.body,
      userId: req.user.id
    });
    res.json({ success: true, project });
  }
);

// Update project (with validation)
router.put('/:id',
  authenticateToken,
  validateProjectData,
  async (req, res) => {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, project });
  }
);

// Delete project (no validation needed)
router.delete('/:id', authenticateToken, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
```

### Example 2: Multi-Step Validation

```javascript
const {
  createValidator,
  createAsyncValidator,
  validateEmail,
  ValidationError
} = require('./middleware/validation');

// Step 1: Basic field validation
const validateRegistrationData = createValidator({
  username: { required: true, maxLength: 50, fieldName: 'Username' },
  email: { required: true, fieldName: 'Email' },
  password: { required: true, fieldName: 'Password' }
});

// Step 2: Email format validation
const validateEmailFormat = (req, res, next) => {
  try {
    validateEmail(req.body.email, 'Email address');
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      field: error.field
    });
  }
};

// Step 3: Password strength validation
const validatePasswordStrength = (req, res, next) => {
  const { password } = req.body;

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters',
      field: 'Password'
    });
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({
      success: false,
      error: 'Password must contain uppercase, lowercase, and numbers',
      field: 'Password'
    });
  }

  next();
};

// Step 4: Uniqueness validation
const validateUniqueUser = createAsyncValidator(async (req, res, next) => {
  const { username, email } = req.body;

  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (existingUser) {
    if (existingUser.username === username) {
      throw new ValidationError('Username already taken', 'Username');
    }
    if (existingUser.email === email) {
      throw new ValidationError('Email already registered', 'Email');
    }
  }

  next();
});

// Apply all validation steps
app.post('/api/register',
  validateRegistrationData,   // 1. Basic validation
  validateEmailFormat,        // 2. Email format
  validatePasswordStrength,   // 3. Password strength
  validateUniqueUser,         // 4. Uniqueness check
  async (req, res) => {
    // All validation passed - create user
    const user = await User.create(req.body);
    res.json({ success: true, user });
  }
);
```

### Example 3: Conditional Validation

```javascript
const { createAsyncValidator, ValidationError } = require('./middleware/validation');

const conditionalValidator = createAsyncValidator(async (req, res, next) => {
  const { type, ...data } = req.body;

  // Different validation based on type
  if (type === 'personal') {
    if (!data.firstName || !data.lastName) {
      throw new ValidationError('First and last name required for personal accounts');
    }
  } else if (type === 'business') {
    if (!data.companyName || !data.taxId) {
      throw new ValidationError('Company name and tax ID required for business accounts');
    }
  } else {
    throw new ValidationError('Account type must be "personal" or "business"');
  }

  next();
});

app.post('/api/accounts',
  authenticateToken,
  conditionalValidator,
  async (req, res) => {
    const account = await Account.create(req.body);
    res.json({ success: true, account });
  }
);
```

---

## API Reference

### Validators

#### `validateProjectData: RequestHandler`
Ready-to-use validator for project data.

#### `validateTaskData: RequestHandler`
Ready-to-use validator for task data.

#### `validateMilestoneData: RequestHandler`
Ready-to-use validator for milestone data.

---

### Validator Creators

#### `createValidator(schema: ValidationSchema): RequestHandler`
Creates a validator from a schema definition.

**Parameters:**
- `schema` - Object mapping field names to validation rules

**Returns:** Express middleware function

---

#### `createCustomValidator(rules: ValidationSchema): RequestHandler`
Alias for `createValidator`. Use for one-off validators.

**Parameters:**
- `rules` - Object mapping field names to validation rules

**Returns:** Express middleware function

---

#### `createAsyncValidator(fn: AsyncValidatorFunction): RequestHandler`
Creates an async validator for database queries or API calls.

**Parameters:**
- `fn` - Async function `(req, res, next) => Promise<void>`

**Returns:** Express middleware function

**Throws:** `ValidationError` to indicate validation failure

---

### Validation Functions

#### `validateRequired(value: any, fieldName: string): void`
Validates that a value is a non-empty string.

**Throws:** `ValidationError` if validation fails

---

#### `validateLength(value: string, maxLength: number, fieldName: string): void`
Validates string length.

**Throws:** `ValidationError` if string exceeds maxLength

---

#### `validateWhitelist(value: any, whitelist: string[], fieldName: string): void`
Validates value against whitelist.

**Throws:** `ValidationError` if value not in whitelist

---

#### `validateUUID(value: string, fieldName: string): void`
Validates UUID format.

**Throws:** `ValidationError` if not a valid UUID

---

#### `validateISO8601(value: string, fieldName: string): void`
Validates ISO 8601 date format.

**Throws:** `ValidationError` if not a valid ISO 8601 date

---

#### `validateEmail(email: string, fieldName?: string): void`
Validates email format.

**Throws:** `ValidationError` if not a valid email

---

#### `validateURL(url: string, fieldName?: string): void`
Validates URL format.

**Throws:** `ValidationError` if not a valid URL

---

### Utility Functions

#### `sanitizeString(value: string): string`
Sanitizes string input to prevent XSS attacks.

**Returns:** Sanitized string with HTML entities escaped

---

#### `validateField(value: any, rules: ValidationRule, fieldKey: string): any`
Validates and sanitizes a single field based on rules.

**Returns:** Sanitized value

**Throws:** `ValidationError` if validation fails

---

### Error Handling

#### `class ValidationError extends Error`
Custom error class for validation failures.

**Properties:**
- `message: string` - Error message
- `name: 'ValidationError'` - Error name
- `field: string | null` - Field that failed validation
- `statusCode: 400` - HTTP status code

---

#### `createValidationError(message: string, field?: string): ValidationErrorResponse`
Creates a standardized validation error response.

**Returns:** Object with `success: false`, `error`, and optional `field`

---

#### `validationErrorHandler(err, req, res, next): void`
Express error handler for validation errors.

---

### Constants

#### `VALIDATION_RULES: ValidationRulesConfig`
Centralized validation rules configuration.

**Structure:**
```javascript
{
  project: { /* field rules */ },
  task: { /* field rules */ },
  milestone: { /* field rules */ }
}
```

---

## Troubleshooting

### Issue: Validation passes but data still unsafe

**Solution:** Ensure you're using the validator middleware before your handler:

```javascript
// Correct
app.post('/api/projects', validateProjectData, handler);

// Incorrect - handler runs first!
app.post('/api/projects', handler, validateProjectData);
```

---

### Issue: Custom validator not working

**Solution:** Make sure to throw `ValidationError` for failures:

```javascript
// Correct
if (invalid) {
  throw new ValidationError('Invalid data', 'fieldName');
}

// Incorrect - doesn't stop request
if (invalid) {
  console.error('Invalid data');
}
```

---

### Issue: Async validator not awaited

**Solution:** Use `createAsyncValidator` wrapper:

```javascript
// Correct
const validator = createAsyncValidator(async (req, res, next) => {
  await checkDatabase();
  next();
});

// Incorrect - errors not handled
const validator = async (req, res, next) => {
  await checkDatabase();
  next();
};
```

---

## Support

For questions or issues:

1. Check this guide thoroughly
2. Review test examples in `/middleware/__tests__/validation.test.js`
3. Check TypeScript definitions in `/middleware/validation.d.ts`
4. Contact the FluxStudio team

---

## Changelog

### Version 1.0.0 (Sprint 1)
- Initial release
- Project, task, and milestone validators
- Custom and async validator support
- Comprehensive test suite
- Full TypeScript definitions
- XSS protection via sanitization
- Length, whitelist, UUID, and date validation

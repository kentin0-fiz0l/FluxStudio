# Scaffold Route

Generate an Express route file that follows FluxStudio backend conventions.

## Usage

```
/scaffold-route <route-name> [--resource <resource>] [--methods GET,POST,PUT,DELETE]
```

## Instructions

When the user invokes this skill, generate a new Express route file at `routes/<route-name>.js` following these exact patterns from the FluxStudio codebase:

### Required Imports

Every route file MUST start with these imports:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, rateLimitByUser } = require('../lib/auth/middleware');
const { createLogger } = require('../lib/logger');
const log = createLogger('<RouteName>');
const { zodValidate } = require('../middleware/zodValidate');
const { asyncHandler } = require('../middleware/errorHandler');
const { createCircuitBreaker } = require('../lib/circuitBreaker');
```

### Zod Schema

Create a corresponding Zod schema file at `lib/schemas/<route-name>.js` and export it from `lib/schemas/index.js`. Schema pattern:

```javascript
const { z } = require('zod');

const create<Resource>Schema = z.object({
  // fields based on the resource
});

module.exports = { create<Resource>Schema };
```

### Route Handler Pattern

Every handler MUST use `asyncHandler` and follow this response format:

```javascript
router.post('/',
  authenticateToken,
  zodValidate(create<Resource>Schema),
  asyncHandler(async (req, res) => {
    const { userId } = req.user;
    // ... handler logic
    res.json({ success: true, data: result });
  })
);
```

### Error Response Format

```javascript
res.status(400).json({ success: false, error: 'Error message', code: 'ERROR_CODE' });
```

### Circuit Breaker

If the route calls external services, wrap those calls in a circuit breaker:

```javascript
const externalBreaker = createCircuitBreaker({
  name: '<service-name>',
  failureThreshold: 5,
  recoveryTimeout: 30000,
});

// Usage inside handler:
const result = await externalBreaker.fire(async () => {
  return await externalService.call();
});
```

### Route Registration

Remind the user to register the new route in `server-unified.js`:

```javascript
const <routeName>Routes = require('./routes/<route-name>');
app.use('/api/<route-name>', <routeName>Routes);
```

## Output

1. The route file at `routes/<route-name>.js`
2. The Zod schema file at `lib/schemas/<route-name>.js`
3. Instructions to update `lib/schemas/index.js` and `server-unified.js`

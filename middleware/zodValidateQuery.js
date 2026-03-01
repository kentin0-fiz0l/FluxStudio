/**
 * Zod Query Validation Middleware
 * Parses req.query against a Zod schema. Returns 400 with structured error on failure.
 */
function zodValidateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return res.status(400).json({
        success: false,
        error: firstIssue.message,
        field: firstIssue.path.join('.') || undefined,
        errors: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    // Override req.query with parsed (and coerced/defaulted) data
    // Express 5 uses a getter for req.query, so we need defineProperty to replace it
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      configurable: true,
    });
    next();
  };
}

module.exports = { zodValidateQuery };

/**
 * Zod Params Validation Middleware
 * Parses req.params against a Zod schema. Returns 400 with structured error on failure.
 */
function zodValidateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
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
    next();
  };
}

module.exports = { zodValidateParams };

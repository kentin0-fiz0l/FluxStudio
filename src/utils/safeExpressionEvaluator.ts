/**
 * Safe Expression Evaluator
 *
 * A secure alternative to eval() for evaluating simple expressions.
 * Supports comparisons, logical operators, and variable substitution.
 *
 * Supported operators:
 * - Comparison: ==, ===, !=, !==, <, >, <=, >=
 * - Logical: &&, ||, !
 * - Arithmetic: +, -, *, /, %
 * - Parentheses for grouping
 *
 * Security: Does not execute arbitrary code, only evaluates predefined operations.
 */

export type ExpressionValue = string | number | boolean | null | undefined;
export type Variables = Record<string, ExpressionValue>;

interface Token {
  type: 'number' | 'string' | 'boolean' | 'null' | 'identifier' | 'operator' | 'paren' | 'comparison' | 'logical';
  value: string | number | boolean | null;
}

const OPERATORS = ['+', '-', '*', '/', '%'];
const COMPARISONS = ['===', '!==', '==', '!=', '<=', '>=', '<', '>'];
const LOGICAL = ['&&', '||', '!'];

/**
 * Tokenize an expression string into tokens
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  const expr = expression.trim();

  while (pos < expr.length) {
    // Skip whitespace
    while (pos < expr.length && /\s/.test(expr[pos])) {
      pos++;
    }

    if (pos >= expr.length) break;

    const char = expr[pos];

    // Parentheses
    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      pos++;
      continue;
    }

    // Try to match multi-char operators first (===, !==, <=, >=, &&, ||)
    let matched = false;
    for (const op of [...COMPARISONS, ...LOGICAL]) {
      if (expr.slice(pos, pos + op.length) === op) {
        if (COMPARISONS.includes(op)) {
          tokens.push({ type: 'comparison', value: op });
        } else {
          tokens.push({ type: 'logical', value: op });
        }
        pos += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Single char operators
    if (OPERATORS.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      pos++;
      continue;
    }

    // Numbers
    if (/\d/.test(char) || (char === '-' && /\d/.test(expr[pos + 1]))) {
      let numStr = '';
      if (char === '-') {
        numStr += char;
        pos++;
      }
      while (pos < expr.length && /[\d.]/.test(expr[pos])) {
        numStr += expr[pos];
        pos++;
      }
      tokens.push({ type: 'number', value: parseFloat(numStr) });
      continue;
    }

    // Strings (single or double quoted)
    if (char === '"' || char === "'") {
      const quote = char;
      pos++;
      let str = '';
      while (pos < expr.length && expr[pos] !== quote) {
        if (expr[pos] === '\\' && pos + 1 < expr.length) {
          pos++;
          str += expr[pos];
        } else {
          str += expr[pos];
        }
        pos++;
      }
      pos++; // Skip closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Boolean literals and null
    const remaining = expr.slice(pos);
    if (remaining.startsWith('true') && !/\w/.test(remaining[4] || '')) {
      tokens.push({ type: 'boolean', value: true });
      pos += 4;
      continue;
    }
    if (remaining.startsWith('false') && !/\w/.test(remaining[5] || '')) {
      tokens.push({ type: 'boolean', value: false });
      pos += 5;
      continue;
    }
    if (remaining.startsWith('null') && !/\w/.test(remaining[4] || '')) {
      tokens.push({ type: 'null', value: null });
      pos += 4;
      continue;
    }

    // Identifiers (variable names)
    if (/[a-zA-Z_$]/.test(char)) {
      let identifier = '';
      while (pos < expr.length && /[\w$.]/.test(expr[pos])) {
        identifier += expr[pos];
        pos++;
      }
      tokens.push({ type: 'identifier', value: identifier });
      continue;
    }

    // Unknown character - skip
    pos++;
  }

  return tokens;
}

/**
 * Get value from nested object path (e.g., "user.name")
 */
function getNestedValue(obj: Variables, path: string): ExpressionValue {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current as ExpressionValue;
}

/**
 * Evaluate parsed tokens
 */
function evaluateTokens(tokens: Token[], variables: Variables): ExpressionValue {
  if (tokens.length === 0) return false;

  // Handle simple single-value expressions
  if (tokens.length === 1) {
    const token = tokens[0];
    switch (token.type) {
      case 'number':
      case 'string':
      case 'boolean':
      case 'null':
        return token.value as ExpressionValue;
      case 'identifier':
        return getNestedValue(variables, token.value as string);
      default:
        return false;
    }
  }

  // Find lowest precedence operator (process left to right)
  // Precedence (lowest to highest): || < && < comparison < arithmetic
  let lowestPrecedence = -1;
  let lowestIndex = -1;
  let parenDepth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'paren') {
      if (token.value === '(') parenDepth++;
      else parenDepth--;
      continue;
    }

    if (parenDepth > 0) continue;

    let precedence = -1;
    if (token.type === 'logical' && token.value === '||') precedence = 1;
    else if (token.type === 'logical' && token.value === '&&') precedence = 2;
    else if (token.type === 'comparison') precedence = 3;
    else if (token.type === 'operator' && (token.value === '+' || token.value === '-')) precedence = 4;
    else if (token.type === 'operator' && (token.value === '*' || token.value === '/' || token.value === '%')) precedence = 5;

    if (precedence > 0 && (lowestPrecedence === -1 || precedence <= lowestPrecedence)) {
      lowestPrecedence = precedence;
      lowestIndex = i;
    }
  }

  // Handle unary NOT
  if (tokens[0].type === 'logical' && tokens[0].value === '!') {
    const rest = evaluateTokens(tokens.slice(1), variables);
    return !rest;
  }

  // Handle parentheses
  if (tokens[0].type === 'paren' && tokens[0].value === '(') {
    let depth = 1;
    let endIndex = 1;
    while (endIndex < tokens.length && depth > 0) {
      if (tokens[endIndex].type === 'paren') {
        if (tokens[endIndex].value === '(') depth++;
        else depth--;
      }
      if (depth > 0) endIndex++;
    }

    if (endIndex === tokens.length - 1 || (endIndex < tokens.length - 1 && lowestIndex === -1)) {
      return evaluateTokens(tokens.slice(1, endIndex), variables);
    }
  }

  // No operator found - try to evaluate as single value
  if (lowestIndex === -1) {
    if (tokens.length === 1) {
      return evaluateTokens([tokens[0]], variables);
    }
    // Try stripping outer parentheses
    if (tokens[0].type === 'paren' && tokens[0].value === '(' &&
        tokens[tokens.length - 1].type === 'paren' && tokens[tokens.length - 1].value === ')') {
      return evaluateTokens(tokens.slice(1, -1), variables);
    }
    return false;
  }

  // Binary operation
  const left = evaluateTokens(tokens.slice(0, lowestIndex), variables);
  const right = evaluateTokens(tokens.slice(lowestIndex + 1), variables);
  const op = tokens[lowestIndex].value;

  // Logical operators
  if (op === '&&') return Boolean(left) && Boolean(right);
  if (op === '||') return Boolean(left) || Boolean(right);

  // Comparison operators
  if (op === '===') return left === right;
  if (op === '!==') return left !== right;
  if (op === '==') return left == right;
  if (op === '!=') return left != right;
  if (op === '<') return (left as number) < (right as number);
  if (op === '>') return (left as number) > (right as number);
  if (op === '<=') return (left as number) <= (right as number);
  if (op === '>=') return (left as number) >= (right as number);

  // Arithmetic operators
  const leftNum = Number(left);
  const rightNum = Number(right);
  if (op === '+') {
    // String concatenation or numeric addition
    if (typeof left === 'string' || typeof right === 'string') {
      return String(left) + String(right);
    }
    return leftNum + rightNum;
  }
  if (op === '-') return leftNum - rightNum;
  if (op === '*') return leftNum * rightNum;
  if (op === '/') return rightNum !== 0 ? leftNum / rightNum : 0;
  if (op === '%') return rightNum !== 0 ? leftNum % rightNum : 0;

  return false;
}

/**
 * Safely evaluate an expression string with given variables
 *
 * @param expression - The expression to evaluate (e.g., "status === 'active' && count > 5")
 * @param variables - Variables available for substitution
 * @returns The result of the expression evaluation
 *
 * @example
 * safeEvaluate("status === 'active'", { status: 'active' }) // true
 * safeEvaluate("count > 5 && enabled", { count: 10, enabled: true }) // true
 * safeEvaluate("user.role === 'admin'", { user: { role: 'admin' } }) // true
 */
export function safeEvaluate(expression: string, variables: Variables = {}): ExpressionValue {
  try {
    const tokens = tokenize(expression);
    return evaluateTokens(tokens, variables);
  } catch (error) {
    console.warn('Expression evaluation failed:', error);
    return false;
  }
}

/**
 * Evaluate an expression and coerce result to boolean
 */
export function safeEvaluateBoolean(expression: string, variables: Variables = {}): boolean {
  const result = safeEvaluate(expression, variables);
  return Boolean(result);
}

/**
 * Validate that an expression is safe to evaluate (syntax check)
 */
export function validateExpression(expression: string): { valid: boolean; error?: string } {
  try {
    const tokens = tokenize(expression);

    // Check for balanced parentheses
    let parenCount = 0;
    for (const token of tokens) {
      if (token.type === 'paren') {
        if (token.value === '(') parenCount++;
        else parenCount--;
        if (parenCount < 0) {
          return { valid: false, error: 'Unbalanced parentheses' };
        }
      }
    }
    if (parenCount !== 0) {
      return { valid: false, error: 'Unbalanced parentheses' };
    }

    // Basic syntax validation
    if (tokens.length === 0) {
      return { valid: false, error: 'Empty expression' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: String(error) };
  }
}

export default safeEvaluate;

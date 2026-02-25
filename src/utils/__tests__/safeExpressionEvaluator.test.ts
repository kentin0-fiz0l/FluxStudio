/**
 * Safe Expression Evaluator Tests
 *
 * Tests for arithmetic, comparisons, logical operators, variable substitution,
 * malicious input rejection, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  safeEvaluate,
  safeEvaluateBoolean,
  validateExpression,
} from '../safeExpressionEvaluator';

// ============================================================================
// BASIC ARITHMETIC
// ============================================================================

describe('basic arithmetic', () => {
  it('should evaluate addition', () => {
    expect(safeEvaluate('2 + 3')).toBe(5);
  });

  it('should evaluate subtraction', () => {
    expect(safeEvaluate('10 - 4')).toBe(6);
  });

  it('should evaluate multiplication', () => {
    expect(safeEvaluate('3 * 7')).toBe(21);
  });

  it('should evaluate division', () => {
    expect(safeEvaluate('20 / 4')).toBe(5);
  });

  it('should evaluate modulo', () => {
    expect(safeEvaluate('10 % 3')).toBe(1);
  });

  it('should handle decimal numbers', () => {
    expect(safeEvaluate('1.5 + 2.5')).toBe(4);
  });

  it('should handle negative numbers', () => {
    expect(safeEvaluate('-5 + 10')).toBe(5);
  });

  it('should evaluate a single number', () => {
    expect(safeEvaluate('42')).toBe(42);
  });
});

// ============================================================================
// OPERATOR PRECEDENCE
// ============================================================================

describe('operator precedence', () => {
  it('should evaluate multiplication before addition', () => {
    expect(safeEvaluate('2 + 3 * 4')).toBe(14);
  });

  it('should evaluate division before subtraction', () => {
    expect(safeEvaluate('10 - 6 / 2')).toBe(7);
  });

  it('should respect parentheses', () => {
    expect(safeEvaluate('(2 + 3) * 4')).toBe(20);
  });

  it('should handle nested parentheses', () => {
    expect(safeEvaluate('((2 + 3) * (4 - 1))')).toBe(15);
  });

  it('should evaluate comparison after arithmetic', () => {
    expect(safeEvaluate('2 + 3 > 4')).toBe(true);
  });

  it('should evaluate logical after comparison', () => {
    expect(safeEvaluate('1 > 0 && 2 > 1')).toBe(true);
  });

  it('should evaluate || with lower precedence than &&', () => {
    expect(safeEvaluate('false || true && true')).toBe(true);
  });
});

// ============================================================================
// COMPARISON OPERATORS
// ============================================================================

describe('comparison operators', () => {
  it('should evaluate strict equality (===)', () => {
    expect(safeEvaluate('5 === 5')).toBe(true);
    expect(safeEvaluate('5 === 6')).toBe(false);
  });

  it('should evaluate strict inequality (!==)', () => {
    expect(safeEvaluate('5 !== 6')).toBe(true);
    expect(safeEvaluate('5 !== 5')).toBe(false);
  });

  it('should evaluate loose equality (==)', () => {
    expect(safeEvaluate('5 == 5')).toBe(true);
  });

  it('should evaluate loose inequality (!=)', () => {
    expect(safeEvaluate('5 != 6')).toBe(true);
  });

  it('should evaluate less than (<)', () => {
    expect(safeEvaluate('3 < 5')).toBe(true);
    expect(safeEvaluate('5 < 3')).toBe(false);
  });

  it('should evaluate greater than (>)', () => {
    expect(safeEvaluate('5 > 3')).toBe(true);
    expect(safeEvaluate('3 > 5')).toBe(false);
  });

  it('should evaluate less than or equal (<=)', () => {
    expect(safeEvaluate('3 <= 5')).toBe(true);
    expect(safeEvaluate('5 <= 5')).toBe(true);
    expect(safeEvaluate('6 <= 5')).toBe(false);
  });

  it('should evaluate greater than or equal (>=)', () => {
    expect(safeEvaluate('5 >= 3')).toBe(true);
    expect(safeEvaluate('5 >= 5')).toBe(true);
    expect(safeEvaluate('3 >= 5')).toBe(false);
  });

  it('should compare strings with ===', () => {
    expect(safeEvaluate("'hello' === 'hello'")).toBe(true);
    expect(safeEvaluate("'hello' === 'world'")).toBe(false);
  });
});

// ============================================================================
// LOGICAL OPERATORS
// ============================================================================

describe('logical operators', () => {
  it('should evaluate && (both true)', () => {
    expect(safeEvaluate('true && true')).toBe(true);
  });

  it('should evaluate && (one false)', () => {
    expect(safeEvaluate('true && false')).toBe(false);
  });

  it('should evaluate || (one true)', () => {
    expect(safeEvaluate('false || true')).toBe(true);
  });

  it('should evaluate || (both false)', () => {
    expect(safeEvaluate('false || false')).toBe(false);
  });

  it('should evaluate ! (not)', () => {
    expect(safeEvaluate('!true')).toBe(false);
    expect(safeEvaluate('!false')).toBe(true);
  });

  it('should handle complex logical expressions', () => {
    expect(safeEvaluate('(true && false) || (true && true)')).toBe(true);
  });
});

// ============================================================================
// VARIABLE SUBSTITUTION
// ============================================================================

describe('variable substitution', () => {
  it('should substitute simple variables', () => {
    expect(safeEvaluate('x + 1', { x: 5 })).toBe(6);
  });

  it('should substitute string variables', () => {
    expect(safeEvaluate("status === 'active'", { status: 'active' })).toBe(true);
  });

  it('should substitute boolean variables', () => {
    expect(safeEvaluate('enabled && visible', { enabled: true, visible: true })).toBe(true);
  });

  it('should handle nested variable paths', () => {
    expect(safeEvaluate("user.role === 'admin'", { user: { role: 'admin' } } as any)).toBe(true);
  });

  it('should return undefined for missing variables', () => {
    expect(safeEvaluate('x')).toBeUndefined();
  });

  it('should handle null variables', () => {
    expect(safeEvaluate('x === null', { x: null })).toBe(true);
  });

  it('should handle comparisons with undefined variables', () => {
    expect(safeEvaluate('missing === undefined', {})).toBe(true);
  });

  it('should substitute multiple variables', () => {
    expect(safeEvaluate('a + b + c', { a: 1, b: 2, c: 3 })).toBe(6);
  });

  it('should handle deeply nested paths returning undefined', () => {
    expect(safeEvaluate('a.b.c.d', { a: { b: null } } as any)).toBeUndefined();
  });
});

// ============================================================================
// STRING OPERATIONS
// ============================================================================

describe('string operations', () => {
  it('should handle single-quoted strings', () => {
    expect(safeEvaluate("'hello'")).toBe('hello');
  });

  it('should handle double-quoted strings', () => {
    expect(safeEvaluate('"world"')).toBe('world');
  });

  it('should concatenate strings with +', () => {
    expect(safeEvaluate("'hello' + ' ' + 'world'")).toBe('hello world');
  });

  it('should concatenate string and number', () => {
    expect(safeEvaluate("'count: ' + 5")).toBe('count: 5');
  });

  it('should handle escaped characters in strings', () => {
    expect(safeEvaluate("'it\\'s'")).toBe("it's");
  });

  it('should compare strings with !==', () => {
    expect(safeEvaluate("'a' !== 'b'")).toBe(true);
  });
});

// ============================================================================
// BOOLEAN AND NULL LITERALS
// ============================================================================

describe('boolean and null literals', () => {
  it('should handle true literal', () => {
    expect(safeEvaluate('true')).toBe(true);
  });

  it('should handle false literal', () => {
    expect(safeEvaluate('false')).toBe(false);
  });

  it('should handle null literal', () => {
    expect(safeEvaluate('null')).toBe(null);
  });

  it('should compare booleans', () => {
    expect(safeEvaluate('true === true')).toBe(true);
    expect(safeEvaluate('true === false')).toBe(false);
  });

  it('should compare null with ===', () => {
    expect(safeEvaluate('null === null')).toBe(true);
  });
});

// ============================================================================
// MALICIOUS INPUT REJECTION
// ============================================================================

describe('malicious input rejection', () => {
  it('should not execute eval injection', () => {
    const result = safeEvaluate('eval("alert(1)")');
    // Should not throw, just produce a non-executable result
    expect(result).not.toBe('alert(1)');
  });

  it('should not execute constructor access', () => {
    const result = safeEvaluate('constructor.constructor("return 1")()');
    expect(typeof result === 'function').toBe(false);
  });

  it('should not allow prototype pollution via __proto__', () => {
    const vars = { obj: {} };
    safeEvaluate('obj.__proto__.polluted', vars as any);
    expect((Object.prototype as any).polluted).toBeUndefined();
  });

  it('should not execute Function constructor', () => {
    const result = safeEvaluate('Function("return 42")()');
    expect(result).not.toBe(42);
  });

  it('should handle process.env access attempt', () => {
    const result = safeEvaluate('process.env.SECRET');
    expect(result).toBeUndefined();
  });

  it('should handle require() attempt safely', () => {
    const result = safeEvaluate("require('fs')");
    // Should not actually execute require; returns a safe fallback
    expect(typeof result !== 'object' || result === null || result === false).toBe(true);
  });

  it('should handle this access attempt', () => {
    const result = safeEvaluate('this.constructor');
    expect(result).toBeUndefined();
  });

  it('should handle window access attempt', () => {
    const result = safeEvaluate('window.document');
    expect(result).toBeUndefined();
  });

  it('should handle global access attempt', () => {
    const result = safeEvaluate('globalThis');
    expect(result).toBeUndefined();
  });

  it('should safely handle very long expressions', () => {
    const longExpr = '1 + '.repeat(100) + '1';
    // Should not crash
    const result = safeEvaluate(longExpr);
    expect(typeof result).toBe('number');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('edge cases', () => {
  it('should handle empty expression', () => {
    const result = safeEvaluate('');
    expect(result).toBe(false);
  });

  it('should handle whitespace-only expression', () => {
    const result = safeEvaluate('   ');
    expect(result).toBe(false);
  });

  it('should handle division by zero', () => {
    expect(safeEvaluate('10 / 0')).toBe(0);
  });

  it('should handle modulo by zero', () => {
    expect(safeEvaluate('10 % 0')).toBe(0);
  });

  it('should handle very large numbers', () => {
    expect(safeEvaluate('999999999 + 1')).toBe(1000000000);
  });

  it('should handle very small decimal numbers', () => {
    const result = safeEvaluate('0.0001 + 0.0002');
    expect(result).toBeCloseTo(0.0003, 4);
  });

  it('should handle special characters gracefully without crashing', () => {
    // Should not crash on special characters -- result can be false or undefined
    expect(() => safeEvaluate('@#$')).not.toThrow();
  });

  it('should handle multiple operators in a row gracefully', () => {
    // This is invalid but should not crash
    const result = safeEvaluate('5 ++ 3');
    expect(result).toBeDefined();
  });
});

// ============================================================================
// safeEvaluateBoolean
// ============================================================================

describe('safeEvaluateBoolean', () => {
  it('should coerce truthy number to true', () => {
    expect(safeEvaluateBoolean('5')).toBe(true);
  });

  it('should coerce zero to false', () => {
    expect(safeEvaluateBoolean('0')).toBe(false);
  });

  it('should coerce truthy string to true', () => {
    expect(safeEvaluateBoolean("'hello'")).toBe(true);
  });

  it('should coerce empty string to false', () => {
    expect(safeEvaluateBoolean("''")).toBe(false);
  });

  it('should return true for true expression', () => {
    expect(safeEvaluateBoolean('5 > 3')).toBe(true);
  });

  it('should return false for false expression', () => {
    expect(safeEvaluateBoolean('3 > 5')).toBe(false);
  });

  it('should handle variable expressions', () => {
    expect(safeEvaluateBoolean("status === 'active'", { status: 'active' })).toBe(true);
    expect(safeEvaluateBoolean("status === 'active'", { status: 'inactive' })).toBe(false);
  });
});

// ============================================================================
// validateExpression
// ============================================================================

describe('validateExpression', () => {
  it('should validate a simple expression', () => {
    expect(validateExpression('1 + 2')).toEqual({ valid: true });
  });

  it('should report empty expression as invalid', () => {
    const result = validateExpression('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Empty');
  });

  it('should report unbalanced open parentheses', () => {
    const result = validateExpression('(1 + 2');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('parentheses');
  });

  it('should report unbalanced close parentheses', () => {
    const result = validateExpression('1 + 2)');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('parentheses');
  });

  it('should validate nested parentheses', () => {
    expect(validateExpression('((1 + 2) * 3)')).toEqual({ valid: true });
  });

  it('should validate comparison expression', () => {
    expect(validateExpression("status === 'active'")).toEqual({ valid: true });
  });

  it('should validate logical expression', () => {
    expect(validateExpression('a && b || c')).toEqual({ valid: true });
  });
});

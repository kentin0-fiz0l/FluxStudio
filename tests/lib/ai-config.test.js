/**
 * Unit Tests for lib/ai/config.js
 * Tests model routing, env var overrides, and buildApiParams.
 */

// Mock logger before requiring config
jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const {
  MODELS,
  TASK_ROUTING,
  getModelForTask,
  getMaxTokensForTask,
  getExtendedThinkingConfig,
  buildApiParams,
} = require('../../lib/ai/config');

describe('lib/ai/config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env vars after each test
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // MODELS catalog
  // =========================================================================
  describe('MODELS', () => {
    it('should define opus, sonnet, and haiku', () => {
      expect(MODELS.opus.id).toBe('claude-opus-4-6');
      expect(MODELS.sonnet.id).toBe('claude-sonnet-4-6');
      expect(MODELS.haiku.id).toBe('claude-haiku-4-5-20251001');
    });

    it('should include capability metadata', () => {
      expect(MODELS.opus.capabilities).toContain('extended-thinking');
      expect(MODELS.sonnet.tier).toBe('sonnet');
      expect(MODELS.haiku.maxOutputTokens).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // getModelForTask
  // =========================================================================
  describe('getModelForTask', () => {
    it('should route lightweight tasks to Haiku', () => {
      expect(getModelForTask('search')).toBe('claude-haiku-4-5-20251001');
      expect(getModelForTask('summarize')).toBe('claude-haiku-4-5-20251001');
      expect(getModelForTask('daily-brief')).toBe('claude-haiku-4-5-20251001');
      expect(getModelForTask('palette')).toBe('claude-haiku-4-5-20251001');
    });

    it('should route interactive tasks to Sonnet', () => {
      expect(getModelForTask('chat')).toBe('claude-sonnet-4-6');
      expect(getModelForTask('design-feedback')).toBe('claude-sonnet-4-6');
      expect(getModelForTask('metmap')).toBe('claude-sonnet-4-6');
      expect(getModelForTask('template')).toBe('claude-sonnet-4-6');
    });

    it('should route complex tasks to Opus', () => {
      expect(getModelForTask('design-review')).toBe('claude-opus-4-6');
      expect(getModelForTask('code-generate')).toBe('claude-opus-4-6');
      expect(getModelForTask('show-generate')).toBe('claude-opus-4-6');
      expect(getModelForTask('formation-draft')).toBe('claude-opus-4-6');
    });

    it('should fall back to Sonnet for unknown task types', () => {
      expect(getModelForTask('nonexistent-task')).toBe('claude-sonnet-4-6');
    });

    it('should respect new-style env var override', () => {
      process.env.FLUXSTUDIO_MODEL_CHAT = 'custom-model-id';
      expect(getModelForTask('chat')).toBe('custom-model-id');
    });

    it('should respect legacy env var override', () => {
      process.env.DESIGN_AI_MODEL = 'legacy-model-id';
      expect(getModelForTask('design-feedback')).toBe('legacy-model-id');
    });

    it('should prioritize new-style env var over legacy', () => {
      process.env.FLUXSTUDIO_MODEL_DESIGN_FEEDBACK = 'new-style';
      process.env.DESIGN_AI_MODEL = 'legacy-style';
      expect(getModelForTask('design-feedback')).toBe('new-style');
    });
  });

  // =========================================================================
  // getMaxTokensForTask
  // =========================================================================
  describe('getMaxTokensForTask', () => {
    it('should return configured max tokens', () => {
      expect(getMaxTokensForTask('chat')).toBe(8192);
      expect(getMaxTokensForTask('code-generate')).toBe(32000);
      expect(getMaxTokensForTask('show-generate')).toBe(64000);
      expect(getMaxTokensForTask('search')).toBe(1024);
    });

    it('should return 4096 for unknown tasks', () => {
      expect(getMaxTokensForTask('unknown-task')).toBe(4096);
    });
  });

  // =========================================================================
  // getExtendedThinkingConfig
  // =========================================================================
  describe('getExtendedThinkingConfig', () => {
    it('should return thinking config for Opus tasks', () => {
      const config = getExtendedThinkingConfig('design-review');
      expect(config).toEqual({ type: 'enabled', budget_tokens: 10000 });
    });

    it('should return correct budgets per task', () => {
      expect(getExtendedThinkingConfig('code-generate').budget_tokens).toBe(15000);
      expect(getExtendedThinkingConfig('formation-draft').budget_tokens).toBe(12000);
      expect(getExtendedThinkingConfig('show-generate').budget_tokens).toBe(10000);
    });

    it('should return null for non-thinking tasks', () => {
      expect(getExtendedThinkingConfig('chat')).toBeNull();
      expect(getExtendedThinkingConfig('search')).toBeNull();
      expect(getExtendedThinkingConfig('unknown')).toBeNull();
    });
  });

  // =========================================================================
  // buildApiParams
  // =========================================================================
  describe('buildApiParams', () => {
    it('should build params with model, max_tokens, and thinking', () => {
      const params = buildApiParams('design-review', {
        system: 'You are a design reviewer.',
        messages: [{ role: 'user', content: 'Review this' }],
      });

      expect(params.model).toBe('claude-opus-4-6');
      expect(params.max_tokens).toBe(2048);
      expect(params.thinking).toEqual({ type: 'enabled', budget_tokens: 10000 });
      expect(params.system).toBe('You are a design reviewer.');
      expect(params.messages).toHaveLength(1);
    });

    it('should not add thinking for non-thinking tasks', () => {
      const params = buildApiParams('chat', {
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(params.model).toBe('claude-sonnet-4-6');
      expect(params.thinking).toBeUndefined();
    });

    it('should allow overriding model and max_tokens', () => {
      const params = buildApiParams('chat', {
        model: 'custom-model',
        max_tokens: 999,
      });

      expect(params.model).toBe('custom-model');
      expect(params.max_tokens).toBe(999);
    });

    it('should not override caller-provided thinking config', () => {
      const customThinking = { type: 'enabled', budget_tokens: 50000 };
      const params = buildApiParams('design-review', { thinking: customThinking });

      expect(params.thinking).toEqual(customThinking);
    });
  });
});

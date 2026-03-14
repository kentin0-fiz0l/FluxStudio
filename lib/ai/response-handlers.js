/**
 * Response Handler Utilities
 *
 * When extended thinking is enabled, response.content contains both
 * 'thinking' and 'text' blocks. These utilities safely extract content
 * without breaking on mixed block types.
 */

/**
 * Extract all text content from a Claude response, filtering out thinking blocks.
 *
 * @param {Object} response - Anthropic messages response
 * @returns {string} Concatenated text content
 */
function extractTextContent(response) {
  if (!response?.content) return '';

  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');
}

/**
 * Extract thinking content from a Claude response (for logging/debugging).
 *
 * @param {Object} response - Anthropic messages response
 * @returns {string} Concatenated thinking content, or empty string
 */
function extractThinkingContent(response) {
  if (!response?.content) return '';

  return response.content
    .filter(block => block.type === 'thinking')
    .map(block => block.thinking)
    .join('');
}

/**
 * Safely extract JSON from text content.
 * Handles common AI output patterns: bare JSON, markdown-wrapped JSON,
 * and JSON embedded in explanatory text.
 *
 * @param {string} text - Text that may contain JSON
 * @returns {Object|null} Parsed JSON or null if extraction fails
 */
function extractJSON(text) {
  if (!text) return null;

  // Try parsing the entire text as JSON first
  try {
    return JSON.parse(text);
  } catch {
    // Not pure JSON, try extracting
  }

  // Try extracting JSON object or array from the text
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Matched braces but not valid JSON
    }
  }

  return null;
}

module.exports = {
  extractTextContent,
  extractThinkingContent,
  extractJSON,
};

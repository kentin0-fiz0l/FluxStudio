/**
 * Few-Shot Examples for Formation AI Endpoints
 *
 * Provides domain-specific examples to improve AI quality for
 * formation generation, path suggestion, and show critique.
 * Each example includes a description, optional context, and expected response.
 */

const FORMATION_EXAMPLES = [
  // 1. Company front across the 50 yard line
  {
    category: 'generate',
    description: 'company front',
    context: '48 performers, ncaa_football field',
    response: {
      pattern: 'Single evenly spaced line across the 50 yard line (y=50), x positions from 10 to 90 at equal intervals. All performers face front (rotation=0).',
      notes: 'Standard 8-to-5 spacing for 48 performers fills about 30 yards centered on the 50.',
    },
  },
  // 2. Block band 8x6
  {
    category: 'generate',
    description: 'block band 8x6',
    context: '48 performers arranged in rectangular block',
    response: {
      pattern: '8 columns x 6 rows. Columns spaced evenly across x=20-80, rows spaced evenly across y=30-70. Fill by row: row 0 gets performers 0-7, row 1 gets 8-15, etc.',
      notes: 'Standard marching block formation. Maintain 2-step intervals between files and ranks.',
    },
  },
  // 3. Pinwheel clockwise
  {
    category: 'generate',
    description: 'pinwheel clockwise',
    context: '32 performers',
    response: {
      pattern: '4 spiral arms of 8 performers each, radiating from center (50,50). Arm 0 starts at angle=0 and curves clockwise. Each performer along an arm is 5 units farther from center with 15 degree angular offset.',
      notes: 'Performers on outer ring have more spacing. Keep minimum 2-unit clearance between arms.',
    },
  },
  // 4. Scatter to form the letter F
  {
    category: 'generate',
    description: 'scatter to form the letter F',
    context: '24 performers',
    response: {
      pattern: 'Vertical line of 10 performers from (35,15) to (35,85) for the spine. Horizontal line of 8 performers from (35,15) to (70,15) for the top bar. Horizontal line of 6 performers from (35,45) to (60,45) for the middle bar.',
      notes: 'Letter formations need enough performers to be readable from the press box. Adjust proportions based on performer count.',
    },
  },
  // 5. Spread in arc from 30 to 30
  {
    category: 'generate',
    description: 'spread in arc from 30 to 30',
    context: '36 performers, field notation: yard line 30L to 30R',
    response: {
      pattern: 'Arc centered at (50, 65) with radius 35. Performers distributed from angle -2.3 rad to -0.84 rad (roughly 30L to 30R yard lines). Even angular spacing.',
      notes: 'The "30 to 30" means spanning from the left 30 yard line to the right 30 yard line. Center the arc\'s base near the back hash.',
    },
  },
  // 6. Stagger trumpets behind mellophones
  {
    category: 'generate',
    description: 'stagger trumpets behind mellophones',
    context: '12 mellophones and 16 trumpets, section-aware',
    response: {
      pattern: 'Place mellophones in a line at y=40 (front). Place trumpets in offset rows at y=50 and y=60, staggered so each trumpet is between two mellophones horizontally. This creates a "brick wall" pattern.',
      notes: 'Section-relative positioning: "behind" means higher y-value (further from front sideline). Staggering maximizes sound projection gaps.',
    },
  },
  // 7. Critique example
  {
    category: 'critique',
    description: 'Formation screenshot analysis',
    context: 'Show with 48 performers, 12 sets, some collision warnings',
    response: {
      overallScore: 7,
      strengths: [
        'Clean company front in Set 1 with consistent 8-to-5 spacing',
        'Effective use of the full field width in the opener',
        'Smooth arc-to-block transition in Sets 4-5',
      ],
      improvements: [
        'Sets 8-9 have 3 collision pairs near the front hash — stagger the crossing paths or add a hold',
        'Trumpet section stride in Set 6 requires 5-to-5 which is aggressive at 160 BPM — consider splitting into two 8-count moves',
        'The closer lacks visual variety — the final set mirrors Set 1 too closely',
      ],
      summary: 'Solid fundamentals with clean spacing in most sets. Address the collision cluster in the ballad section and reduce stride demands in the up-tempo.',
    },
  },
  // 8. Path suggestion
  {
    category: 'paths',
    description: 'smooth transition from block to arc',
    context: 'Block at y=30-60, arc centered at (50,50) radius 30',
    response: {
      pattern: 'For performers moving from block corners to arc endpoints: use wide Bezier curves that bow outward to avoid crossing paths. CP1 offsets 15 units perpendicular to the direct line, CP2 offsets 8 units. Interior performers use gentler curves (CP1 offset 5, CP2 offset 3).',
      notes: 'The key challenge is preventing path collisions during the transition. Corner performers travel the farthest and need the most curved paths.',
    },
  },
  // 9. Diagonal line
  {
    category: 'generate',
    description: 'diagonal line from back left to front right',
    context: '24 performers',
    response: {
      pattern: 'Performers distributed evenly along a line from (15, 80) to (85, 20). Equal spacing along the diagonal. Performer[0] at (15,80), performer[23] at (85,20).',
      notes: 'Diagonal lines look best with consistent perpendicular spacing. Calculate actual step sizes — diagonals require larger physical steps than horizontal or vertical movements.',
    },
  },
  // 10. Concentric circles
  {
    category: 'generate',
    description: 'concentric circles',
    context: '40 performers, 3 rings',
    response: {
      pattern: 'Three concentric circles centered at (50,50). Inner ring: 8 performers at radius 12. Middle ring: 14 performers at radius 22. Outer ring: 18 performers at radius 32. Each ring has evenly distributed angular spacing.',
      notes: 'More performers on outer rings maintain visual density. Stagger the starting angles of each ring so performers don\'t radially align.',
    },
  },
  // 11. Follow-the-leader curve
  {
    category: 'paths',
    description: 'follow the leader S-curve across the field',
    context: '16 performers in a single file, moving from side 1 to side 2',
    response: {
      pattern: 'All performers follow the same S-curve path but offset in time. CP1 at (30, 25) and CP2 at (70, 75) create the S shape. Each successive performer starts 2 counts behind the previous one, creating a cascading "follow-the-leader" visual.',
      notes: 'The temporal offset is key — identical paths but staggered timing. Ensure the curve amplitude doesn\'t bring performers too close to the sideline.',
    },
  },
  // 12. Wedge / V-formation
  {
    category: 'generate',
    description: 'wedge pointing toward the press box',
    context: '32 performers',
    response: {
      pattern: 'V-shape (inverted chevron) with apex at (50, 25) pointing toward front sideline. Two diagonal lines extending to (20, 65) and (80, 65). 16 performers per arm, evenly spaced along each line. Drum major or lead performer at the apex.',
      notes: 'The wedge/V is one of the most effective visual formations from elevated press box view. Ensure equal performer count on each arm for symmetry.',
    },
  },
];

/**
 * Get examples filtered by category.
 * @param {'generate' | 'critique' | 'paths'} category
 * @returns {Array} Filtered examples
 */
function getExamplesForCategory(category) {
  return FORMATION_EXAMPLES.filter(ex => ex.category === category);
}

/**
 * Build a few-shot examples string for injection into system prompts.
 * @param {'generate' | 'critique' | 'paths'} category
 * @param {number} [maxExamples=6] - Maximum examples to include
 * @returns {string} Formatted examples block
 */
function buildExamplesPrompt(category, maxExamples = 6) {
  const examples = getExamplesForCategory(category).slice(0, maxExamples);
  if (examples.length === 0) return '';

  const formatted = examples.map((ex, i) => {
    const resp = typeof ex.response === 'object'
      ? JSON.stringify(ex.response, null, 2)
      : ex.response;
    return `Example ${i + 1}:
Input: "${ex.description}"${ex.context ? ` (${ex.context})` : ''}
Response approach: ${resp}`;
  }).join('\n\n');

  return `\n\n## Reference Examples\nUse these as guidance for the style and detail level expected:\n\n${formatted}`;
}

module.exports = {
  FORMATION_EXAMPLES,
  getExamplesForCategory,
  buildExamplesPrompt,
};

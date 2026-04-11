# Formation Review

Review drill formation data and AI tool calls for correctness.

## Usage

```
/formation-review [--file <formation-file>] [--tool-call <json>]
```

## Instructions

When the user invokes this skill, analyze drill formation data for correctness, performance, and adherence to FluxStudio's formation system.

### Formation System Context

FluxStudio uses Claude AI with tool-calling for drill design. The relevant tools are defined as `FORMATION_TOOLS` in `routes/ai.js`:

#### move_performers
Moves one or more performers by a delta (dx, dy) or to an absolute position (to.x, to.y). Coordinates are normalized 0-100.

**Validation checks:**
- All coordinates must be within 0-100 range
- Performer IDs must be valid
- Delta movements should not place performers outside bounds
- Check for performer collisions (overlapping positions)

#### create_formation
Creates a formation from a named template. Valid template names:
- `company_front` - Standard line formation
- `wedge` - V-shaped formation
- `diamond` - Diamond/rhombus shape
- `block` - Rectangular block
- `circle` - Circular formation
- `arc` - Curved arc formation

**Validation checks:**
- Template name must be one of the valid names above
- Performer count should be appropriate for the template
- Spacing parameters should produce reasonable layouts

### MCP Formation Tools

Additional formation tools are available in `apps/flux-mcp/src/formation/`:
- `formationTools.ts` - MCP tool definitions
- `formationAnalysis.ts` - Formation analysis utilities
- `formationBridge.ts` - Bridge between MCP and FluxStudio
- `formationSchemas.ts` - Zod schemas for formation data

### Review Checklist

When reviewing formation data, check:

1. **Coordinate validity** - All positions within 0-100 normalized range
2. **Performer spacing** - No overlapping performers (minimum distance threshold)
3. **Formation symmetry** - Templates like diamond, wedge, circle should be symmetric
4. **Transition feasibility** - Movement distances between formations should be achievable
5. **Count consistency** - Performer count should match between consecutive formations
6. **Template appropriateness** - Template should match the described visual intent
7. **Tool call format** - Verify JSON structure matches the expected input_schema

### Output Format

```markdown
## Formation Review: <formation-name>

### Summary
- Performers: <count>
- Template: <template-name>
- Coordinate range: <min>-<max>

### Issues Found
- [ ] <issue description and severity>

### Suggestions
- <improvement suggestion>

### Verdict: PASS / NEEDS_REVISION / FAIL
```

## Output

1. Detailed review following the checklist above
2. Any issues flagged with severity (error, warning, info)
3. Actionable suggestions for improvement

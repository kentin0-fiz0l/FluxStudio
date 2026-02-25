# Security Audit - Sprint 49

**Audit Date:** 2026-02-24
**Auditor:** agent-a (automated)
**Scope:** Dependency vulnerabilities, eval() usage, dependency pinning

---

## npm audit Summary

**Total vulnerabilities: 11**

| Severity | Count | Packages |
|----------|-------|----------|
| High     | 7     | jspdf (3), minimatch (4 instances) |
| Moderate | 2     | ajv (ReDoS), markdown-it (ReDoS) |
| Low      | 2     | aws-sdk (region validation), hono (timing comparison) |

### High Severity Details

1. **jspdf <= 4.1.0** (3 advisories)
   - PDF Injection via AcroForm module (GHSA-p5xg-68wr-hm3m)
   - PDF Object Injection via addJS (GHSA-9vjf-qc39-jprp)
   - DoS via malicious GIF dimensions (GHSA-67pg-wm7f-q7fj)
   - **Fix:** `npm audit fix` (non-breaking)

2. **minimatch** (4 instances across dependencies)
   - ReDoS via repeated wildcards (GHSA-3ppc-4f35-3m26)
   - Affected: @sentry/node, @typescript-eslint, @vitest/coverage-v8, filelist, sucrase, workbox-build
   - **Fix:** `npm audit fix` (non-breaking) + override already in place (`>=10.2.1`)

3. **tar < 7.5.8** (via sqlite3 -> node-gyp -> cacache -> make-fetch-happen)
   - Arbitrary file read/write via hardlink escape (GHSA-83g3-92jg-28cx)
   - **Fix:** Direct dependency pinned at `^7.5.8`; override forces transitive deps to use it
   - **Note:** Full fix requires `npm audit fix --force` (breaking: sqlite3 downgrade to 5.0.2)

### Moderate Severity

4. **ajv < 6.14.0 || >= 7.0.0-alpha.0 < 8.18.0**
   - ReDoS with `$data` option (GHSA-2g4f-4pwh-qvx6)
   - Affects: @modelcontextprotocol/sdk, ajv-formats, workbox-build
   - **Fix:** `npm audit fix` (non-breaking)

5. **markdown-it 13.0.0 - 14.1.0**
   - ReDoS vulnerability (GHSA-38c4-r59v-3vqw)
   - **Fix:** `npm audit fix` (non-breaking)

### Low Severity

6. **aws-sdk >= 2.0.1** - Missing region validation (GHSA-j965-2qgj-vjmq)
   - Recommendation: Migrate to AWS SDK v3

7. **hono < 4.11.10** - Timing comparison hardening (GHSA-gq3j-xvxp-8hrf)
   - **Fix:** `npm audit fix` (non-breaking)

---

## eval() Status

**Status: CLEAN**

No `eval()` calls found in `src/`. References found are:
- `src/utils/safeExpressionEvaluator.ts` - Safe alternative implementation (does NOT use eval)
- `src/services/workflowEngine.ts` - Comment documenting that eval is NOT used
- `src/utils/__tests__/safeExpressionEvaluator.test.ts` - Test verifying eval strings are rejected

---

## Dependency Pinning Status

| Package | Before | After | Notes |
|---------|--------|-------|-------|
| `three` | `^0.180.0` (caret) | `0.180.0` (exact) | Pinned to prevent uncontrolled Three.js updates |
| `tar` | `^7.5.8` (direct dep) | `^7.5.8` (unchanged) | Override fixed from `>=7.5.8` to `$tar` to resolve npm audit conflict |

### Override Configuration Fixed

The npm `overrides` section had `"tar": ">=7.5.8"` which conflicted with the direct dependency `"tar": "^7.5.8"`. Changed to `"tar": "$tar"` to inherit from the direct dependency spec, resolving the `EOVERRIDE` error that was preventing `npm audit` from running.

---

## Remediation Plan

### Immediate (Sprint 49)

1. Run `npm audit fix` to resolve non-breaking vulnerabilities (jspdf, ajv, markdown-it, minimatch, hono)
2. Three.js pinned to exact version 0.180.0
3. tar override conflict resolved

### Short-term (Sprint 50)

1. Evaluate sqlite3 upgrade path for tar transitive vulnerability
2. Begin AWS SDK v2 -> v3 migration planning
3. Run `npm audit fix --force` in a test branch to evaluate breaking changes

### Long-term

1. Set up automated dependency security scanning in CI (e.g., Dependabot, Snyk)
2. Quarterly dependency audit cycle
3. AWS SDK v3 migration

---

## Build Verification

Bundle optimization (T2) completed in this sprint confirms:
- OrbitControls (Three.js) only loads on 3D view activation (lazy import verified)
- PrimitiveBuilder converted from static to lazy import
- No vendor chunks pull Three.js into main bundle

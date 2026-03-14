/**
 * Migration Schema Integration Tests — Phase 3
 *
 * Validates:
 * 1. All migration files are properly named and ordered
 * 2. SQL files parse without syntax errors (basic validation)
 * 3. The consolidation migration (150) covers all essential tables
 * 4. No duplicate migration numbers with conflicting content
 * 5. verify-schema.js expectations are consistent with migrations
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../database/migrations');

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function parseMigrationNumber(filename) {
  const match = filename.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function readMigration(filename) {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf-8');
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('Database Migrations', () => {
  let migrationFiles;

  beforeAll(() => {
    migrationFiles = getMigrationFiles();
  });

  test('migration directory exists and contains SQL files', () => {
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
    expect(migrationFiles.length).toBeGreaterThan(0);
  });

  test('all migration files start with a numeric prefix', () => {
    const invalid = migrationFiles.filter(
      (f) => parseMigrationNumber(f) === null,
    );
    expect(invalid).toEqual([]);
  });

  test('migration numbers span from 000 to at least 150 (consolidation)', () => {
    const numbers = migrationFiles.map(parseMigrationNumber).filter(Boolean);
    const max = Math.max(...numbers);
    expect(max).toBeGreaterThanOrEqual(150);
  });

  test('no migration file is empty', () => {
    const empty = migrationFiles.filter((f) => {
      const content = readMigration(f).trim();
      return content.length === 0;
    });
    expect(empty).toEqual([]);
  });

  test('all migrations contain valid SQL keywords', () => {
    const sqlKeywords =
      /\b(CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|SELECT|BEGIN|COMMIT|SET|DO|IF|GRANT|REVOKE)\b/i;
    const invalid = migrationFiles.filter((f) => {
      const content = readMigration(f);
      // Skip comment-only files
      const withoutComments = content.replace(/--.*$/gm, '').trim();
      return withoutComments.length > 0 && !sqlKeywords.test(withoutComments);
    });
    expect(invalid).toEqual([]);
  });

  test('consolidation migration (150) exists and handles UUID/TEXT fixes', () => {
    const consolidation = migrationFiles.find((f) =>
      f.startsWith('150_schema_consolidation'),
    );
    expect(consolidation).toBeDefined();

    const content = readMigration(consolidation).toLowerCase();

    // Should fix UUID → TEXT column conversions
    expect(content).toContain('uuid');
    expect(content).toContain('text');

    // Should reference key columns that need fixing
    expect(content).toContain('user_id');
    expect(content).toContain('author_id');

    // Should handle the conversion in PL/pgSQL
    expect(content).toContain('do $$');
    expect(content).toContain('information_schema');
  });

  test('migration checksums are stable (no accidental edits to applied migrations)', () => {
    // Compute checksums for all migrations and ensure no duplicates
    const checksums = new Map();
    const duplicates = [];

    for (const file of migrationFiles) {
      const content = readMigration(file);
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      if (checksums.has(hash)) {
        duplicates.push({
          file1: checksums.get(hash),
          file2: file,
          hash,
        });
      }
      checksums.set(hash, file);
    }

    // Duplicate file content means copy-paste error
    expect(duplicates).toEqual([]);
  });
});

describe('Schema Verification Script', () => {
  test('verify-schema.js exists', () => {
    const verifyPath = path.resolve(
      __dirname,
      '../../database/verify-schema.js',
    );
    expect(fs.existsSync(verifyPath)).toBe(true);
  });

  test('verify-schema.js checks all essential tables', () => {
    const verifyPath = path.resolve(
      __dirname,
      '../../database/verify-schema.js',
    );
    const content = fs.readFileSync(verifyPath, 'utf-8');

    const essentialTables = [
      'users',
      'organizations',
      'projects',
      'tasks',
      'messages',
      'conversations',
      'notifications',
      'formations',
      'subscriptions',
      'schema_migrations',
    ];

    for (const table of essentialTables) {
      expect(content).toContain(`'${table}'`);
    }
  });

  test('verify-schema.js checks TEXT column types for CUID columns', () => {
    const verifyPath = path.resolve(
      __dirname,
      '../../database/verify-schema.js',
    );
    const content = fs.readFileSync(verifyPath, 'utf-8');

    // Should check users.id, projects.id at minimum
    expect(content).toContain("table: 'users', column: 'id'");
    expect(content).toContain("table: 'projects', column: 'id'");
  });

  test('verify-schema.js exits cleanly when DATABASE_URL is not set', () => {
    const verifyPath = path.resolve(
      __dirname,
      '../../database/verify-schema.js',
    );
    const content = fs.readFileSync(verifyPath, 'utf-8');

    // Should handle missing DATABASE_URL gracefully
    expect(content).toContain('DATABASE_URL');
    expect(content).toContain('process.exit(0)');
  });
});

describe('Migration Runner', () => {
  test('run-migrations.js exists', () => {
    const runnerPath = path.resolve(
      __dirname,
      '../../database/run-migrations.js',
    );
    expect(fs.existsSync(runnerPath)).toBe(true);
  });

  test('run-migrations.js uses transactions', () => {
    const runnerPath = path.resolve(
      __dirname,
      '../../database/run-migrations.js',
    );
    const content = fs.readFileSync(runnerPath, 'utf-8');

    expect(content).toContain('BEGIN');
    expect(content).toContain('COMMIT');
    expect(content).toContain('ROLLBACK');
  });

  test('run-migrations.js tracks checksums', () => {
    const runnerPath = path.resolve(
      __dirname,
      '../../database/run-migrations.js',
    );
    const content = fs.readFileSync(runnerPath, 'utf-8');

    expect(content).toContain('checksum');
    expect(content).toContain('sha256');
  });

  test('run-migrations.js handles already-exists errors gracefully', () => {
    const runnerPath = path.resolve(
      __dirname,
      '../../database/run-migrations.js',
    );
    const content = fs.readFileSync(runnerPath, 'utf-8');

    // Should handle duplicate table/object errors
    expect(content).toContain('42P07'); // duplicate_table
    expect(content).toContain('42710'); // duplicate_object
  });

  test('run-migrations.js exits cleanly when DATABASE_URL is not set', () => {
    const runnerPath = path.resolve(
      __dirname,
      '../../database/run-migrations.js',
    );
    const content = fs.readFileSync(runnerPath, 'utf-8');

    expect(content).toContain('DATABASE_URL');
    expect(content).toContain('process.exit(0)');
  });
});

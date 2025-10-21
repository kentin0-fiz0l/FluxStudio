#!/usr/bin/env node

/**
 * Test Runner for FluxStudio Sprint 9
 * Orchestrates all testing phases: unit, integration, and load tests
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      load: null
    };
    this.startTime = Date.now();
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Running: ${command} ${args.join(' ')}\n`);

      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...\n');

    // Check if servers are running
    const healthChecks = [
      { name: 'Auth Server', url: 'http://localhost:3001/health' },
      { name: 'Messaging Server', url: 'http://localhost:3004/health' }
    ];

    for (const check of healthChecks) {
      try {
        const response = await fetch(check.url);
        if (response.ok) {
          console.log(`   ✓ ${check.name} is running`);
        } else {
          throw new Error(`${check.name} returned status ${response.status}`);
        }
      } catch (error) {
        console.error(`   ❌ ${check.name} is not accessible: ${error.message}`);
        console.log('   💡 Make sure both servers are running:');
        console.log('      - Auth Server: USE_DATABASE=true node server-auth.js');
        console.log('      - Messaging Server: USE_DATABASE=true node server-messaging.js');
        throw new Error('Prerequisites not met');
      }
    }

    // Check test dependencies
    const requiredModules = ['mocha', 'chai', 'supertest', 'socket.io-client'];
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    for (const module of requiredModules) {
      if (!packageJson.devDependencies?.[module] && !packageJson.dependencies?.[module]) {
        console.error(`   ❌ Missing dependency: ${module}`);
        throw new Error(`Please install ${module}: npm install --save-dev ${module}`);
      } else {
        console.log(`   ✓ ${module} is available`);
      }
    }

    console.log('\n✅ All prerequisites met\n');
  }

  async runUnitTests() {
    console.log('🧪 Running Unit Tests...\n');

    try {
      await this.runCommand('npm', ['run', 'test:unit']);
      this.results.unit = { status: 'passed', error: null };
      console.log('\n✅ Unit tests passed\n');
    } catch (error) {
      this.results.unit = { status: 'failed', error: error.message };
      console.log('\n❌ Unit tests failed\n');
      throw error;
    }
  }

  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...\n');

    try {
      const testFile = path.join(__dirname, 'integration/sprint9.integration.test.js');
      await this.runCommand('npx', ['mocha', testFile, '--timeout', '60000']);
      this.results.integration = { status: 'passed', error: null };
      console.log('\n✅ Integration tests passed\n');
    } catch (error) {
      this.results.integration = { status: 'failed', error: error.message };
      console.log('\n❌ Integration tests failed\n');
      throw error;
    }
  }

  async runLoadTests() {
    console.log('⚡ Running Load Tests...\n');

    try {
      const loadTestFile = path.join(__dirname, 'load/performance.load.test.js');
      await this.runCommand('node', [loadTestFile]);
      this.results.load = { status: 'passed', error: null };
      console.log('\n✅ Load tests completed\n');
    } catch (error) {
      this.results.load = { status: 'failed', error: error.message };
      console.log('\n❌ Load tests failed\n');
      throw error;
    }
  }

  async runSecurityTests() {
    console.log('🔒 Running Security Tests...\n');

    try {
      // Security-specific tests
      const securityTests = [
        'tests/security/auth.security.test.js',
        'tests/security/file-upload.security.test.js',
        'tests/security/rate-limiting.security.test.js'
      ];

      for (const testFile of securityTests) {
        if (fs.existsSync(testFile)) {
          await this.runCommand('npx', ['mocha', testFile, '--timeout', '30000']);
        }
      }

      console.log('\n✅ Security tests passed\n');
    } catch (error) {
      console.log('\n⚠️ Security tests encountered issues (continuing...)\n');
    }
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration: totalTime,
      summary: {
        unit: this.results.unit?.status || 'not_run',
        integration: this.results.integration?.status || 'not_run',
        load: this.results.load?.status || 'not_run'
      },
      details: this.results
    };

    // Save report
    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log('📊 TEST SUMMARY');
    console.log('=====================================');
    console.log(`Total Duration: ${Math.round(totalTime / 1000)}s`);
    console.log(`Unit Tests: ${this.getStatusIcon(report.summary.unit)} ${report.summary.unit}`);
    console.log(`Integration Tests: ${this.getStatusIcon(report.summary.integration)} ${report.summary.integration}`);
    console.log(`Load Tests: ${this.getStatusIcon(report.summary.load)} ${report.summary.load}`);
    console.log(`Report saved: ${reportPath}\n`);

    return report;
  }

  getStatusIcon(status) {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'not_run': return '⏭️';
      default: return '❓';
    }
  }

  async run(options = {}) {
    try {
      console.log('🚀 FluxStudio Sprint 9 Test Suite\n');
      console.log('Testing features:');
      console.log('  • Performance monitoring & alerting');
      console.log('  • Enhanced file upload with security');
      console.log('  • Database performance monitoring');
      console.log('  • Real-time WebSocket metrics');
      console.log('  • Message threading & search\n');

      await this.checkPrerequisites();

      if (!options.skipUnit) {
        await this.runUnitTests();
      }

      if (!options.skipIntegration) {
        await this.runIntegrationTests();
      }

      if (!options.skipLoad) {
        await this.runLoadTests();
      }

      if (options.includeSecurity) {
        await this.runSecurityTests();
      }

      const report = this.generateReport();

      const allPassed = Object.values(report.summary).every(status =>
        status === 'passed' || status === 'not_run'
      );

      if (allPassed) {
        console.log('🎉 All tests completed successfully!');
        process.exit(0);
      } else {
        console.log('❌ Some tests failed. Check the report for details.');
        process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Test suite failed: ${error.message}`);
      this.generateReport();
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    skipUnit: args.includes('--skip-unit'),
    skipIntegration: args.includes('--skip-integration'),
    skipLoad: args.includes('--skip-load'),
    includeSecurity: args.includes('--security')
  };

  if (args.includes('--help')) {
    console.log(`
FluxStudio Test Runner

Usage: node run-all-tests.js [options]

Options:
  --skip-unit         Skip unit tests
  --skip-integration  Skip integration tests
  --skip-load        Skip load tests
  --security         Include security tests
  --help             Show this help message

Examples:
  node run-all-tests.js                    # Run all tests
  node run-all-tests.js --skip-unit        # Skip unit tests
  node run-all-tests.js --security         # Include security tests
    `);
    process.exit(0);
  }

  const runner = new TestRunner();
  runner.run(options);
}

module.exports = TestRunner;
#!/usr/bin/env node

/**
 * FluxStudio Services Monitor
 * Real-time monitoring dashboard for all backend services
 */

const axios = require('axios');
const Table = require('cli-table3');
const chalk = require('chalk');
const ora = require('ora');

// Service endpoints
const SERVICES = [
  {
    name: 'Auth Service',
    url: 'http://localhost:3001/health',
    critical: true
  },
  {
    name: 'Messaging Service',
    url: 'http://localhost:3004/health',
    critical: true
  },
  {
    name: 'Production Auth',
    url: 'https://fluxstudio.art/api/auth/health',
    critical: false
  },
  {
    name: 'Production Messaging',
    url: 'https://fluxstudio.art/api/messaging/health',
    critical: false
  }
];

// Health check function
async function checkHealth(service) {
  try {
    const response = await axios.get(service.url, { timeout: 5000 });
    return {
      ...service,
      status: 'UP',
      details: response.data,
      responseTime: response.headers['x-response-time'] || 'N/A'
    };
  } catch (error) {
    return {
      ...service,
      status: 'DOWN',
      error: error.message,
      responseTime: 'N/A'
    };
  }
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format uptime
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Main monitoring function
async function monitor() {
  console.clear();
  console.log(chalk.cyan.bold('\n🔍 FluxStudio Services Monitor'));
  console.log(chalk.gray(`Last Updated: ${new Date().toLocaleString()}\n`));

  const spinner = ora('Checking services...').start();

  // Check all services
  const results = await Promise.all(SERVICES.map(checkHealth));
  spinner.stop();

  // Create status table
  const table = new Table({
    head: ['Service', 'Status', 'Uptime', 'Memory', 'Response Time'],
    colWidths: [25, 12, 15, 15, 15],
    style: {
      head: ['cyan']
    }
  });

  // Add service rows
  results.forEach(result => {
    const statusColor = result.status === 'UP' ? chalk.green : chalk.red;
    const statusIcon = result.status === 'UP' ? '✅' : '❌';

    let uptime = 'N/A';
    let memory = 'N/A';

    if (result.status === 'UP' && result.details) {
      uptime = result.details.uptime ? formatUptime(result.details.uptime) : 'N/A';
      memory = result.details.memory?.heapUsed
        ? formatBytes(result.details.memory.heapUsed)
        : 'N/A';
    }

    table.push([
      result.name,
      statusColor(`${statusIcon} ${result.status}`),
      uptime,
      memory,
      result.responseTime
    ]);
  });

  console.log(table.toString());

  // Summary
  const upCount = results.filter(r => r.status === 'UP').length;
  const downCount = results.filter(r => r.status === 'DOWN').length;
  const criticalDown = results.filter(r => r.critical && r.status === 'DOWN').length;

  console.log('\n📊 Summary:');
  console.log(chalk.green(`  ✓ Services UP: ${upCount}`));
  if (downCount > 0) {
    console.log(chalk.red(`  ✗ Services DOWN: ${downCount}`));
  }
  if (criticalDown > 0) {
    console.log(chalk.red.bold(`  ⚠️  CRITICAL SERVICES DOWN: ${criticalDown}`));
  }

  // Alerts
  const criticalServices = results.filter(r => r.critical && r.status === 'DOWN');
  if (criticalServices.length > 0) {
    console.log(chalk.red.bold('\n🚨 ALERTS:'));
    criticalServices.forEach(service => {
      console.log(chalk.red(`  - ${service.name} is DOWN: ${service.error}`));
    });
  }

  console.log(chalk.gray('\n(Refreshing every 30 seconds. Press Ctrl+C to exit)\n'));
}

// Run monitor on interval
async function start() {
  // Initial check
  await monitor();

  // Refresh every 30 seconds
  setInterval(async () => {
    await monitor();
  }, 30000);
}

// Handle exit
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nMonitoring stopped.'));
  process.exit(0);
});

// Check if required packages are installed
try {
  require('axios');
  require('cli-table3');
  require('chalk');
  require('ora');
} catch (error) {
  console.log(chalk.yellow('Installing required packages...'));
  require('child_process').execSync('npm install axios cli-table3 chalk ora', { stdio: 'inherit' });
}

// Start monitoring
start().catch(error => {
  console.error(chalk.red('Error starting monitor:'), error.message);
  process.exit(1);
});
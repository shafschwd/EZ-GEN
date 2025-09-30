#!/usr/bin/env node

/**
 * EZ-GEN Stress Test Suite
 * Tests multiple concurrent users with various valid/invalid inputs
 * to validate field validation, error handling, and system stability
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const { performance } = require('perf_hooks');

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:5005',
  maxConcurrentUsers: 10,
  testDuration: 60000, // 1 minute
  delayBetweenRequests: 1000, // 1 second
  outputDir: './results',
  logLevel: 'INFO' // DEBUG, INFO, WARN, ERROR
};

// Test scenarios with various validation cases
const TEST_SCENARIOS = [
  {
    name: 'Valid App - E-commerce',
    type: 'VALID',
    data: {
      appName: 'MyStore',
      websiteUrl: 'https://mystoreapp.com',
      packageName: 'com.mystore.app',
      appType: 'ecommerce'
    },
    expectedResult: 'SUCCESS'
  },
  {
    name: 'Valid App - Blog',
    type: 'VALID',
    data: {
      appName: 'TechBlog',
      websiteUrl: 'https://techblog.io',
      packageName: 'com.techblog.mobile',
      appType: 'blog'
    },
    expectedResult: 'SUCCESS'
  },
  {
    name: 'Invalid App Name - Empty',
    type: 'VALIDATION_ERROR',
    data: {
      appName: '',
      websiteUrl: 'https://example.com',
      packageName: 'com.test.app',
      appType: 'portfolio'
    },
    expectedResult: 'VALIDATION_ERROR'
  },
  {
    name: 'Invalid App Name - Special Characters',
    type: 'VALIDATION_ERROR',
    data: {
      appName: 'My@App#2024!',
      websiteUrl: 'https://example.com',
      packageName: 'com.test.app',
      appType: 'business'
    },
    expectedResult: 'VALIDATION_ERROR'
  },
  {
    name: 'Invalid URL - Not HTTPS',
    type: 'VALIDATION_ERROR',
    data: {
      appName: 'TestApp',
      websiteUrl: 'http://insecure-site.com',
      packageName: 'com.test.app',
      appType: 'news'
    },
    expectedResult: 'VALIDATION_ERROR'
  },
  {
    name: 'Invalid URL - Malformed',
    type: 'VALIDATION_ERROR',
    data: {
      appName: 'TestApp',
      websiteUrl: 'not-a-valid-url',
      packageName: 'com.test.app',
      appType: 'entertainment'
    },
    expectedResult: 'VALIDATION_ERROR'
  },
  {
    name: 'Invalid Package Name - Wrong Format',
    type: 'VALIDATION_ERROR',
    data: {
      appName: 'TestApp',
      websiteUrl: 'https://example.com',
      packageName: 'invalid-package-name',
      appType: 'education'
    },
    expectedResult: 'VALIDATION_ERROR'
  },
  {
    name: 'Invalid Package Name - Special Characters',
    type: 'VALIDATION_ERROR',
    data: {
      appName: 'TestApp',
      websiteUrl: 'https://example.com',
      packageName: 'com.test@app.mobile!',
      appType: 'health'
    },
    expectedResult: 'VALIDATION_ERROR'
  },
  {
    name: 'Missing Required Fields',
    type: 'VALIDATION_ERROR',
    data: {
      appName: 'TestApp'
      // Missing websiteUrl, packageName, appType
    },
    expectedResult: 'VALIDATION_ERROR'
  },
  {
    name: 'Extremely Long App Name',
    type: 'VALIDATION_ERROR',
    data: {
      appName: 'A'.repeat(100),
      websiteUrl: 'https://example.com',
      packageName: 'com.test.app',
      appType: 'lifestyle'
    },
    expectedResult: 'VALIDATION_ERROR'
  },
  {
    name: 'SQL Injection Attempt',
    type: 'SECURITY_TEST',
    data: {
      appName: "'; DROP TABLE apps; --",
      websiteUrl: 'https://example.com',
      packageName: 'com.test.app',
      appType: 'utilities'
    },
    expectedResult: 'VALIDATION_ERROR'
  },
  {
    name: 'XSS Attempt',
    type: 'SECURITY_TEST',
    data: {
      appName: '<script>alert("xss")</script>',
      websiteUrl: 'https://example.com',
      packageName: 'com.test.app',
      appType: 'social'
    },
    expectedResult: 'VALIDATION_ERROR'
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logging utility
class Logger {
  constructor(level = 'INFO') {
    this.levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    this.currentLevel = this.levels[level] || 1;
  }

  log(level, message, data = null) {
    if (this.levels[level] >= this.currentLevel) {
      const timestamp = new Date().toISOString();
      const color = {
        DEBUG: colors.cyan,
        INFO: colors.blue,
        WARN: colors.yellow,
        ERROR: colors.red
      }[level] || colors.reset;
      
      console.log(`${color}[${timestamp}] ${level}: ${message}${colors.reset}`);
      if (data && this.currentLevel === 0) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  debug(message, data) { this.log('DEBUG', message, data); }
  info(message, data) { this.log('INFO', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  error(message, data) { this.log('ERROR', message, data); }
}

// Test result tracker
class TestResults {
  constructor() {
    this.results = [];
    this.stats = {
      total: 0,
      success: 0,
      validationErrors: 0,
      networkErrors: 0,
      serverErrors: 0,
      timeouts: 0,
      unexpectedResults: 0
    };
    this.startTime = performance.now();
  }

  addResult(result) {
    this.results.push(result);
    this.stats.total++;
    
    switch (result.status) {
      case 'SUCCESS':
        this.stats.success++;
        break;
      case 'VALIDATION_ERROR':
        this.stats.validationErrors++;
        break;
      case 'NETWORK_ERROR':
        this.stats.networkErrors++;
        break;
      case 'SERVER_ERROR':
        this.stats.serverErrors++;
        break;
      case 'TIMEOUT':
        this.stats.timeouts++;
        break;
      default:
        this.stats.unexpectedResults++;
    }
  }

  getReport() {
    const duration = (performance.now() - this.startTime) / 1000;
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(2);
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length;

    return {
      summary: {
        totalTests: this.stats.total,
        duration: `${duration.toFixed(2)}s`,
        successRate: `${successRate}%`,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`
      },
      stats: this.stats,
      details: this.results
    };
  }
}

// Individual test runner
class TestRunner {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.results = new TestResults();
  }

  async runScenario(scenario, userId) {
    const startTime = performance.now();
    const testId = `${userId}-${Date.now()}`;
    
    this.logger.debug(`🧪 Running scenario: ${scenario.name}`, { userId, testId });

    try {
      const formData = new FormData();
      
      // Add form fields
      Object.keys(scenario.data).forEach(key => {
        formData.append(key, scenario.data[key]);
      });

      // Create a dummy logo file for tests that need it
      if (scenario.type === 'VALID') {
        const logoBuffer = Buffer.from('dummy-logo-data');
        formData.append('logo', logoBuffer, {
          filename: 'logo.png',
          contentType: 'image/png'
        });
      }

      const response = await axios.post(`${this.config.baseUrl}/generate`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000, // 30 second timeout
        validateStatus: () => true // Don't throw on non-2xx status
      });

      const responseTime = performance.now() - startTime;
      const result = this.analyzeResponse(scenario, response, responseTime, testId);
      
      this.results.addResult(result);
      this.logResult(result);
      
      return result;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      const result = this.handleError(scenario, error, responseTime, testId);
      
      this.results.addResult(result);
      this.logResult(result);
      
      return result;
    }
  }

  analyzeResponse(scenario, response, responseTime, testId) {
    const result = {
      testId,
      scenario: scenario.name,
      type: scenario.type,
      expected: scenario.expectedResult,
      responseTime,
      statusCode: response.status,
      timestamp: new Date().toISOString()
    };

    // Analyze response based on status code and expected result
    if (response.status >= 200 && response.status < 300) {
      if (scenario.expectedResult === 'SUCCESS') {
        result.status = 'SUCCESS';
        result.message = 'Test passed - valid request succeeded';
      } else {
        result.status = 'UNEXPECTED_SUCCESS';
        result.message = 'Test failed - invalid request succeeded';
      }
    } else if (response.status >= 400 && response.status < 500) {
      if (scenario.expectedResult === 'VALIDATION_ERROR') {
        result.status = 'VALIDATION_ERROR';
        result.message = 'Test passed - validation correctly rejected invalid input';
      } else {
        result.status = 'UNEXPECTED_VALIDATION_ERROR';
        result.message = 'Test failed - valid request was rejected';
      }
    } else if (response.status >= 500) {
      result.status = 'SERVER_ERROR';
      result.message = 'Server error occurred';
    }

    // Try to parse response data
    try {
      result.responseData = response.data;
    } catch (e) {
      result.responseData = 'Could not parse response';
    }

    return result;
  }

  handleError(scenario, error, responseTime, testId) {
    const result = {
      testId,
      scenario: scenario.name,
      type: scenario.type,
      expected: scenario.expectedResult,
      responseTime,
      timestamp: new Date().toISOString()
    };

    if (error.code === 'ECONNREFUSED') {
      result.status = 'NETWORK_ERROR';
      result.message = 'Could not connect to server';
    } else if (error.code === 'ETIMEDOUT') {
      result.status = 'TIMEOUT';
      result.message = 'Request timed out';
    } else {
      result.status = 'NETWORK_ERROR';
      result.message = error.message;
    }

    result.error = error.message;
    return result;
  }

  logResult(result) {
    const icon = {
      'SUCCESS': '✅',
      'VALIDATION_ERROR': '✅',
      'UNEXPECTED_SUCCESS': '❌',
      'UNEXPECTED_VALIDATION_ERROR': '❌',
      'SERVER_ERROR': '🔥',
      'NETWORK_ERROR': '🌐',
      'TIMEOUT': '⏱️'
    }[result.status] || '❓';

    const color = {
      'SUCCESS': colors.green,
      'VALIDATION_ERROR': colors.green,
      'UNEXPECTED_SUCCESS': colors.red,
      'UNEXPECTED_VALIDATION_ERROR': colors.red,
      'SERVER_ERROR': colors.red,
      'NETWORK_ERROR': colors.yellow,
      'TIMEOUT': colors.yellow
    }[result.status] || colors.reset;

    this.logger.info(
      `${icon} ${color}${result.scenario}${colors.reset} (${result.responseTime.toFixed(2)}ms) - ${result.message}`
    );
  }
}

// Main stress test orchestrator
class StressTest {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logLevel);
    this.runners = [];
    this.isRunning = false;
  }

  async initialize() {
    // Ensure output directory exists
    await fs.ensureDir(this.config.outputDir);
    
    // Test server connectivity
    this.logger.info('🔗 Testing server connectivity...');
    try {
      const response = await axios.get(this.config.baseUrl, { timeout: 5000 });
      this.logger.info(`✅ Server is responding (${response.status})`);
    } catch (error) {
      this.logger.error('❌ Cannot connect to server');
      throw new Error(`Server at ${this.config.baseUrl} is not accessible: ${error.message}`);
    }
  }

  async runStressTest() {
    this.logger.info(`🚀 Starting stress test with ${this.config.maxConcurrentUsers} concurrent users`);
    this.logger.info(`📊 Running ${TEST_SCENARIOS.length} different scenarios`);
    this.logger.info(`⏱️  Test duration: ${this.config.testDuration / 1000}s`);
    
    this.isRunning = true;
    const promises = [];

    // Start concurrent users
    for (let userId = 1; userId <= this.config.maxConcurrentUsers; userId++) {
      const runner = new TestRunner(this.config, this.logger);
      this.runners.push(runner);
      promises.push(this.runUserSession(runner, userId));
    }

    // Set timeout to stop the test
    setTimeout(() => {
      this.isRunning = false;
      this.logger.info('⏹️  Test duration reached, stopping...');
    }, this.config.testDuration);

    // Wait for all user sessions to complete
    await Promise.all(promises);
    
    return this.generateReport();
  }

  async runUserSession(runner, userId) {
    this.logger.debug(`👤 Starting user session ${userId}`);
    
    while (this.isRunning) {
      // Pick a random scenario
      const scenario = TEST_SCENARIOS[Math.floor(Math.random() * TEST_SCENARIOS.length)];
      
      await runner.runScenario(scenario, userId);
      
      // Wait before next request
      if (this.isRunning) {
        await this.sleep(this.config.delayBetweenRequests + Math.random() * 1000);
      }
    }
    
    this.logger.debug(`👤 User session ${userId} completed`);
  }

  async generateReport() {
    this.logger.info('📊 Generating comprehensive report...');
    
    // Combine results from all runners
    const allResults = [];
    const combinedStats = {
      total: 0,
      success: 0,
      validationErrors: 0,
      networkErrors: 0,
      serverErrors: 0,
      timeouts: 0,
      unexpectedResults: 0
    };

    this.runners.forEach(runner => {
      const report = runner.results.getReport();
      allResults.push(...report.details);
      
      Object.keys(combinedStats).forEach(key => {
        combinedStats[key] += report.stats[key];
      });
    });

    // Calculate metrics
    const successRate = ((combinedStats.success / combinedStats.total) * 100).toFixed(2);
    const validationRate = ((combinedStats.validationErrors / combinedStats.total) * 100).toFixed(2);
    const errorRate = (((combinedStats.networkErrors + combinedStats.serverErrors + combinedStats.timeouts) / combinedStats.total) * 100).toFixed(2);
    
    const avgResponseTime = allResults.reduce((sum, r) => sum + r.responseTime, 0) / allResults.length;
    const maxResponseTime = Math.max(...allResults.map(r => r.responseTime));
    const minResponseTime = Math.min(...allResults.map(r => r.responseTime));

    // Group results by scenario type
    const scenarioResults = {};
    allResults.forEach(result => {
      if (!scenarioResults[result.type]) {
        scenarioResults[result.type] = [];
      }
      scenarioResults[result.type].push(result);
    });

    const report = {
      summary: {
        totalRequests: combinedStats.total,
        successRate: `${successRate}%`,
        validationRate: `${validationRate}%`,
        errorRate: `${errorRate}%`,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        minResponseTime: `${minResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${maxResponseTime.toFixed(2)}ms`,
        concurrentUsers: this.config.maxConcurrentUsers,
        testDuration: `${this.config.testDuration / 1000}s`
      },
      stats: combinedStats,
      scenarioBreakdown: scenarioResults,
      timeline: allResults.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    };

    // Save detailed report
    const reportPath = path.join(this.config.outputDir, `stress-test-report-${Date.now()}.json`);
    await fs.writeJson(reportPath, report, { spaces: 2 });

    this.printSummary(report);
    this.logger.info(`📄 Detailed report saved to: ${reportPath}`);
    
    return report;
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}${colors.blue}        EZ-GEN STRESS TEST RESULTS${colors.reset}`);
    console.log('='.repeat(60));
    
    console.log(`\n${colors.bright}📊 SUMMARY:${colors.reset}`);
    console.log(`   Total Requests: ${colors.cyan}${report.summary.totalRequests}${colors.reset}`);
    console.log(`   Success Rate: ${colors.green}${report.summary.successRate}${colors.reset}`);
    console.log(`   Validation Rate: ${colors.yellow}${report.summary.validationRate}${colors.reset}`);
    console.log(`   Error Rate: ${colors.red}${report.summary.errorRate}${colors.reset}`);
    
    console.log(`\n${colors.bright}⚡ PERFORMANCE:${colors.reset}`);
    console.log(`   Average Response Time: ${colors.cyan}${report.summary.avgResponseTime}${colors.reset}`);
    console.log(`   Min Response Time: ${colors.green}${report.summary.minResponseTime}${colors.reset}`);
    console.log(`   Max Response Time: ${colors.red}${report.summary.maxResponseTime}${colors.reset}`);
    
    console.log(`\n${colors.bright}🎯 TEST CONFIGURATION:${colors.reset}`);
    console.log(`   Concurrent Users: ${colors.cyan}${report.summary.concurrentUsers}${colors.reset}`);
    console.log(`   Test Duration: ${colors.cyan}${report.summary.testDuration}${colors.reset}`);
    
    console.log(`\n${colors.bright}📈 DETAILED STATS:${colors.reset}`);
    console.log(`   ✅ Successful: ${colors.green}${report.stats.success}${colors.reset}`);
    console.log(`   🔍 Validation Errors: ${colors.yellow}${report.stats.validationErrors}${colors.reset}`);
    console.log(`   🌐 Network Errors: ${colors.red}${report.stats.networkErrors}${colors.reset}`);
    console.log(`   🔥 Server Errors: ${colors.red}${report.stats.serverErrors}${colors.reset}`);
    console.log(`   ⏱️  Timeouts: ${colors.red}${report.stats.timeouts}${colors.reset}`);
    
    // Scenario breakdown
    console.log(`\n${colors.bright}🧪 SCENARIO BREAKDOWN:${colors.reset}`);
    Object.keys(report.scenarioBreakdown).forEach(type => {
      const scenarios = report.scenarioBreakdown[type];
      const success = scenarios.filter(s => s.status === 'SUCCESS' || s.status === 'VALIDATION_ERROR').length;
      const total = scenarios.length;
      const rate = ((success / total) * 100).toFixed(1);
      console.log(`   ${type}: ${colors.cyan}${success}/${total} (${rate}%)${colors.reset}`);
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.bright}EZ-GEN Stress Test Suite${colors.reset}

Usage: node stress-test.js [options]

Options:
  --users <number>      Number of concurrent users (default: 10)
  --duration <seconds>  Test duration in seconds (default: 60)
  --url <url>          Server URL (default: http://localhost:5005)
  --delay <ms>         Delay between requests (default: 1000)
  --log-level <level>  Log level: DEBUG, INFO, WARN, ERROR (default: INFO)
  --output <dir>       Output directory (default: ./results)
  --help, -h           Show this help message

Examples:
  node stress-test.js --users 20 --duration 120
  node stress-test.js --url http://localhost:5005 --log-level DEBUG
  node stress-test.js --users 5 --duration 30 --delay 500
    `);
    return;
  }

  // Parse options
  const userIndex = args.indexOf('--users');
  if (userIndex !== -1) CONFIG.maxConcurrentUsers = parseInt(args[userIndex + 1]) || CONFIG.maxConcurrentUsers;
  
  const durationIndex = args.indexOf('--duration');
  if (durationIndex !== -1) CONFIG.testDuration = (parseInt(args[durationIndex + 1]) || 60) * 1000;
  
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1) CONFIG.baseUrl = args[urlIndex + 1] || CONFIG.baseUrl;
  
  const delayIndex = args.indexOf('--delay');
  if (delayIndex !== -1) CONFIG.delayBetweenRequests = parseInt(args[delayIndex + 1]) || CONFIG.delayBetweenRequests;
  
  const logIndex = args.indexOf('--log-level');
  if (logIndex !== -1) CONFIG.logLevel = args[logIndex + 1] || CONFIG.logLevel;
  
  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1) CONFIG.outputDir = args[outputIndex + 1] || CONFIG.outputDir;

  console.log(`${colors.bright}${colors.magenta}🚀 EZ-GEN STRESS TEST SUITE${colors.reset}\n`);
  
  try {
    const stressTest = new StressTest(CONFIG);
    await stressTest.initialize();
    
    const report = await stressTest.runStressTest();
    
    // Exit with appropriate code
    const errorRate = ((report.stats.networkErrors + report.stats.serverErrors + report.stats.timeouts) / report.stats.total) * 100;
    if (errorRate > 10) {
      console.log(`${colors.red}❌ Test failed: Error rate (${errorRate.toFixed(2)}%) exceeds threshold${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`${colors.green}✅ Test completed successfully!${colors.reset}`);
      process.exit(0);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Stress test failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { StressTest, TestRunner, CONFIG };

#!/usr/bin/env node
/**
 * Test script for ESP32 Compliment Server
 * Tests all API endpoints and ESP32 connectivity
 */

const http = require('http');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 3000;
const ESP32_IP = '192.168.4.1';  // Change to your ESP32 IP
const ESP32_PORT = 80;

let testsPassed = 0;
let testsFailed = 0;

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testEndpoint(name, options, expectedStatus = 200) {
  try {
    process.stdout.write(`  Testing ${name}... `);
    const result = await makeRequest(options);
    
    if (result.statusCode === expectedStatus) {
      log('✓ PASS', 'green');
      testsPassed++;
      if (result.data) {
        try {
          const json = JSON.parse(result.data);
          console.log(`    Response: ${JSON.stringify(json, null, 2).split('\n').join('\n    ')}`);
        } catch {
          console.log(`    Response: ${result.data.substring(0, 100)}...`);
        }
      }
      return true;
    } else {
      log(`✗ FAIL (expected ${expectedStatus}, got ${result.statusCode})`, 'red');
      testsFailed++;
      return false;
    }
  } catch (error) {
    log(`✗ FAIL (${error.message})`, 'red');
    testsFailed++;
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  log('ESP32 Compliment Server - Test Suite', 'blue');
  console.log('='.repeat(60) + '\n');

  // Test 1: Server health check
  log('Test Suite 1: Server API Endpoints', 'yellow');
  await testEndpoint('GET /', {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/',
    method: 'GET'
  });

  // Test 2: Get random compliment
  await testEndpoint('GET /api/compliment', {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/compliment',
    method: 'GET'
  });

  // Test 3: Get stats
  await testEndpoint('GET /api/stats', {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/stats',
    method: 'GET'
  });

  // Test 4: 404 handling
  await testEndpoint('GET /nonexistent (404 test)', {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/nonexistent',
    method: 'GET'
  }, 404);

  // Test 5: ESP32 connectivity
  console.log('\n');
  log('Test Suite 2: ESP32 Connectivity', 'yellow');
  
  const esp32Available = await testESP32Connection();
  
  if (esp32Available) {
    // Test 6: Send compliment to ESP32
    await testEndpoint('POST /compliment to ESP32', {
      hostname: ESP32_IP,
      port: ESP32_PORT,
      path: '/compliment',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Test compliment from test suite!' })
    });
  } else {
    log('  ⚠ Skipping ESP32 tests (device not reachable)', 'yellow');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  log('Test Summary', 'blue');
  console.log('='.repeat(60));
  log(`  Passed: ${testsPassed}`, 'green');
  if (testsFailed > 0) {
    log(`  Failed: ${testsFailed}`, 'red');
  }
  console.log('='.repeat(60) + '\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

async function testESP32Connection() {
  try {
    process.stdout.write(`  Checking ESP32 at ${ESP32_IP}... `);
    const result = await makeRequest({
      hostname: ESP32_IP,
      port: ESP32_PORT,
      path: '/',
      method: 'GET',
      timeout: 3000
    });
    log('✓ Connected', 'green');
    return true;
  } catch (error) {
    log(`✗ Not reachable (${error.message})`, 'yellow');
    return false;
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest({
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/',
      method: 'GET',
      timeout: 2000
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  log('\n🔍 Checking if server is running...', 'blue');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    log(`\n✗ Server is not running on http://${SERVER_HOST}:${SERVER_PORT}`, 'red');
    log('\nPlease start the server first:', 'yellow');
    log('  npm start', 'yellow');
    log('  or', 'yellow');
    log('  node compliment-server.js\n', 'yellow');
    process.exit(1);
  }
  
  log('✓ Server is running!\n', 'green');
  
  // Run tests
  await runTests();
}

main().catch(error => {
  log(`\n✗ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});

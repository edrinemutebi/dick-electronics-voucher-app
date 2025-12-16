#!/usr/bin/env node

/**
 * SMS Configuration Test Script
 * Run this to check your SMS setup
 */

const https = require('https');

async function testSMSConfig() {
  console.log('🧪 Testing SMS Configuration...\n');

  try {
    // Test configuration endpoint
    console.log('1. Checking SMS configuration...');
    const configResponse = await fetch('http://localhost:3000/api/send-sms');
    const config = await configResponse.json();

    console.log('   Configuration:', config.config);
    console.log('   Using defaults:', config.usingDefaults ? 'YES' : 'NO');

    if (config.usingDefaults) {
      console.log('\n⚠️  WARNING: Using default EGOSMS credentials!');
      console.log('   You should set these environment variables:');
      console.log('   - EGOSMS_USERNAME=your_username');
      console.log('   - EGOSMS_PASSWORD=your_password');
      console.log('   - EGOSMS_SENDER=your_sender_name\n');
    }

    // Test SMS sending (optional - comment out if you don't want to send test SMS)
    console.log('2. Sending test SMS...');
    const testResponse = await fetch('http://localhost:3000/api/test-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: '256700000000' // Replace with your test number
      })
    });

    const testResult = await testResponse.json();
    console.log('   Test SMS Result:', testResult.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!testResult.success) {
      console.log('   Error:', testResult.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your Next.js app is running with: npm run dev');
  }
}

// For Node.js < 18 compatibility
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

testSMSConfig();



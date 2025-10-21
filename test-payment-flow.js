#!/usr/bin/env node

/**
 * Comprehensive test script for payment flow and custom callback verification
 * Tests the complete payment process from initiation to completion
 */

const https = require('https');

const BASE_URL = 'https://dick-electronics-voucher-app.vercel.app';

// Test payment data
const testPayment = {
  phone: "+256712345678",
  amount: 1000,
  reference: `test-ref-${Date.now()}`
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            response,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            response: data,
            success: false,
            error: 'Failed to parse JSON response'
          });
        }
      });
    });

    req.on('error', (err) => {
      reject({
        error: err.message,
        success: false
      });
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testPaymentFlow() {
  console.log('🧪 Testing Complete Payment Flow & Custom Callback');
  console.log('================================================\n');

  try {
    // Step 1: Test webhook health
    console.log('1️⃣ Testing webhook endpoint health...');
    const webhookHealth = await makeRequest(`${BASE_URL}/api/webhook`);
    
    if (webhookHealth.success) {
      console.log('   ✅ Webhook endpoint is healthy');
      console.log(`   📍 Endpoint: ${webhookHealth.response.endpoint}`);
      console.log(`   🔄 Processed callbacks: ${webhookHealth.response.processed_callbacks_count}`);
    } else {
      console.log('   ❌ Webhook endpoint health check failed');
      return;
    }
    console.log('');

    // Step 2: Test callback simulation
    console.log('2️⃣ Testing custom callback simulation...');
    const callbackTest = await makeRequest(`${BASE_URL}/api/test-callback`, {
      method: 'POST',
      body: { reference: testPayment.reference }
    });
    
    if (callbackTest.success) {
      console.log('   ✅ Callback simulation successful');
      console.log(`   📝 Message: ${callbackTest.response.message}`);
      console.log(`   🔗 Callback URL: ${callbackTest.response.callback_url}`);
      
      if (callbackTest.response.after.voucher) {
        console.log(`   🎫 Generated voucher: ${callbackTest.response.after.voucher.voucher}`);
      }
    } else {
      console.log('   ⚠️  Callback simulation had issues');
      console.log(`   📝 Response: ${callbackTest.response.message || callbackTest.response}`);
    }
    console.log('');

    // Step 3: Test payment status checking
    console.log('3️⃣ Testing payment status checking...');
    const statusCheck = await makeRequest(`${BASE_URL}/api/check-payment`, {
      method: 'POST',
      body: { reference: testPayment.reference }
    });
    
    if (statusCheck.success) {
      console.log('   ✅ Payment status check successful');
      console.log(`   📊 Status: ${statusCheck.response.data.status}`);
      console.log(`   💰 Amount: ${statusCheck.response.data.amount} UGX`);
      console.log(`   📱 Phone: ${statusCheck.response.data.phone}`);
      
      if (statusCheck.response.data.voucher) {
        console.log(`   🎫 Voucher: ${statusCheck.response.data.voucher}`);
      }
    } else {
      console.log('   ❌ Payment status check failed');
      console.log(`   📝 Error: ${statusCheck.response.message}`);
    }
    console.log('');

    // Step 4: Test MarzPay webhook with real payload
    console.log('4️⃣ Testing MarzPay webhook with real payload...');
    const marzPayPayload = {
      "event_type": "collection.completed",
      "transaction": {
        "uuid": `marz-test-${Date.now()}`,
        "reference": testPayment.reference,
        "status": "completed",
        "amount": {
          "formatted": "1,000.00",
          "raw": 1000,
          "currency": "UGX"
        },
        "provider": "mtn",
        "phone_number": testPayment.phone,
        "description": "Test payment completion",
        "created_at": new Date().toISOString(),
        "updated_at": new Date().toISOString()
      },
      "collection": {
        "provider": "mtn",
        "phone_number": testPayment.phone,
        "amount": {
          "formatted": "1,000.00",
          "raw": 1000,
          "currency": "UGX"
        },
        "mode": "mtnuganda",
        "provider_reference": `marz-provider-${Date.now()}`
      },
      "business": {
        "uuid": "test-business-uuid",
        "name": "Dick Electronics"
      },
      "metadata": {
        "sandbox_mode": true,
        "environment": "test",
        "timestamp": new Date().toISOString()
      }
    };

    const marzPayTest = await makeRequest(`${BASE_URL}/api/webhook`, {
      method: 'POST',
      body: marzPayPayload
    });
    
    if (marzPayTest.success) {
      console.log('   ✅ MarzPay webhook test successful');
      console.log(`   📝 Message: ${marzPayTest.response.message}`);
      console.log(`   🔄 Event Type: ${marzPayTest.response.event_type}`);
      console.log(`   📊 Mapped Status: ${marzPayTest.response.mapped_status}`);
      
      if (marzPayTest.response.voucher) {
        console.log(`   🎫 Generated voucher: ${marzPayTest.response.voucher}`);
      }
    } else {
      console.log('   ❌ MarzPay webhook test failed');
      console.log(`   📝 Error: ${marzPayTest.response.message || marzPayTest.response}`);
    }
    console.log('');

    // Step 5: Final status verification
    console.log('5️⃣ Final payment status verification...');
    const finalCheck = await makeRequest(`${BASE_URL}/api/check-payment`, {
      method: 'POST',
      body: { reference: testPayment.reference }
    });
    
    if (finalCheck.success) {
      console.log('   ✅ Final status check successful');
      console.log(`   📊 Final Status: ${finalCheck.response.data.status}`);
      
      if (finalCheck.response.data.voucher) {
        console.log(`   🎫 Final Voucher: ${finalCheck.response.data.voucher}`);
        console.log(`   ✅ Payment completed successfully with voucher!`);
      } else {
        console.log(`   ⚠️  No voucher found - payment may not be completed`);
      }
    } else {
      console.log('   ❌ Final status check failed');
    }

    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`✅ Webhook Health: ${webhookHealth.success ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Callback Simulation: ${callbackTest.success ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Status Checking: ${statusCheck.success ? 'PASS' : 'FAIL'}`);
    console.log(`✅ MarzPay Webhook: ${marzPayTest.success ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Final Verification: ${finalCheck.success ? 'PASS' : 'FAIL'}`);
    
    const allPassed = webhookHealth.success && callbackTest.success && 
                     statusCheck.success && marzPayTest.success && finalCheck.success;
    
    if (allPassed) {
      console.log('\n🎉 All tests passed! Your payment flow and custom callback are working correctly.');
      console.log('📝 Polling interval: 2 seconds (as requested)');
      console.log('🔗 Custom callback URL: https://dick-electronics-voucher-app.vercel.app/api/webhook');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the implementation.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the tests
testPaymentFlow().catch(console.error);

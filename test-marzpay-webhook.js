#!/usr/bin/env node

/**
 * Test script for MarzPay webhook integration
 * Tests the webhook endpoint with sample MarzPay payloads
 */

const https = require('https');

const WEBHOOK_URL = 'https://dick-electronics-voucher-app.vercel.app/api/webhook';

// Sample MarzPay payloads according to documentation
const testPayloads = {
  successfulPayment: {
    "event_type": "collection.completed",
    "transaction": {
      "uuid": "test-transaction-uuid-001",
      "reference": "test-ref-001",
      "status": "completed",
      "amount": {
        "formatted": "1,000.00",
        "raw": 1000,
        "currency": "UGX"
      },
      "provider": "mtn",
      "phone_number": "+256712345678",
      "description": "Test payment for voucher",
      "created_at": "2025-01-20T15:18:48.000000Z",
      "updated_at": "2025-01-20T15:18:48.000000Z"
    },
    "collection": {
      "provider": "mtn",
      "phone_number": "+256712345678",
      "amount": {
        "formatted": "1,000.00",
        "raw": 1000,
        "currency": "UGX"
      },
      "mode": "mtnuganda",
      "provider_reference": "mtn-transaction-001"
    },
    "business": {
      "uuid": "test-business-uuid",
      "name": "Dick Electronics"
    },
    "metadata": {
      "sandbox_mode": true,
      "environment": "test",
      "timestamp": "2025-01-20T15:18:48.000000Z"
    }
  },

  failedPayment: {
    "event_type": "collection.failed",
    "transaction": {
      "uuid": "test-transaction-uuid-002",
      "reference": "test-ref-002",
      "status": "failed",
      "amount": {
        "formatted": "1,500.00",
        "raw": 1500,
        "currency": "UGX"
      },
      "provider": "airtel",
      "phone_number": "+256712345679",
      "description": "Test failed payment",
      "created_at": "2025-01-20T15:20:48.000000Z",
      "updated_at": "2025-01-20T15:20:48.000000Z"
    },
    "collection": {
      "provider": "airtel",
      "phone_number": "+256712345679",
      "amount": {
        "formatted": "1,500.00",
        "raw": 1500,
        "currency": "UGX"
      },
      "mode": "airteluganda",
      "provider_reference": "airtel-transaction-002"
    },
    "business": {
      "uuid": "test-business-uuid",
      "name": "Dick Electronics"
    },
    "metadata": {
      "sandbox_mode": true,
      "environment": "test",
      "timestamp": "2025-01-20T15:20:48.000000Z"
    }
  },

  mtnStatusMapping: {
    "event_type": "collection.completed",
    "transaction": {
      "uuid": "test-transaction-uuid-003",
      "reference": "test-ref-003",
      "status": "successful", // MTN specific status
      "amount": {
        "formatted": "7,000.00",
        "raw": 7000,
        "currency": "UGX"
      },
      "provider": "mtn",
      "phone_number": "+256712345680",
      "description": "Test MTN status mapping",
      "created_at": "2025-01-20T15:22:48.000000Z",
      "updated_at": "2025-01-20T15:22:48.000000Z"
    },
    "collection": {
      "provider": "mtn",
      "phone_number": "+256712345680",
      "amount": {
        "formatted": "7,000.00",
        "raw": 7000,
        "currency": "UGX"
      },
      "mode": "mtnuganda",
      "provider_reference": "mtn-transaction-003"
    },
    "business": {
      "uuid": "test-business-uuid",
      "name": "Dick Electronics"
    },
    "metadata": {
      "sandbox_mode": true,
      "environment": "test",
      "timestamp": "2025-01-20T15:22:48.000000Z"
    }
  }
};

function makeRequest(payload, testName) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'dick-electronics-voucher-app.vercel.app',
      port: 443,
      path: '/api/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'MarzPay-Webhook-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            testName,
            statusCode: res.statusCode,
            response,
            success: res.statusCode === 200
          });
        } catch (e) {
          resolve({
            testName,
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
        testName,
        error: err.message,
        success: false
      });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing MarzPay Webhook Integration');
  console.log('=====================================\n');

  const tests = [
    { name: 'Successful Payment (MTN)', payload: testPayloads.successfulPayment },
    { name: 'Failed Payment (Airtel)', payload: testPayloads.failedPayment },
    { name: 'MTN Status Mapping Test', payload: testPayloads.mtnStatusMapping }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`📤 Testing: ${test.name}`);
    console.log(`   Reference: ${test.payload.transaction.reference}`);
    console.log(`   Event Type: ${test.payload.event_type}`);
    console.log(`   Provider: ${test.payload.transaction.provider}`);
    console.log(`   Amount: ${test.payload.transaction.amount.formatted} ${test.payload.transaction.amount.currency}`);
    
    try {
      const result = await makeRequest(test.payload, test.name);
      results.push(result);
      
      if (result.success) {
        console.log(`   ✅ Status: ${result.statusCode}`);
        console.log(`   📝 Response: ${result.response.message}`);
        if (result.response.voucher) {
          console.log(`   🎫 Voucher: ${result.response.voucher}`);
        }
        console.log(`   🔄 Mapped Status: ${result.response.mapped_status}`);
      } else {
        console.log(`   ❌ Status: ${result.statusCode}`);
        console.log(`   📝 Response: ${result.response}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.error || error.message}`);
      results.push({ testName: test.name, success: false, error: error.error || error.message });
    }
    
    console.log('');
    
    // Wait 1 second between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test duplicate callback handling
  console.log('🔄 Testing Duplicate Callback Handling');
  console.log('=====================================\n');
  
  try {
    const duplicateResult = await makeRequest(testPayloads.successfulPayment, 'Duplicate Callback Test');
    results.push(duplicateResult);
    
    if (duplicateResult.success && duplicateResult.response.message.includes('Duplicate')) {
      console.log('   ✅ Duplicate callback properly handled');
    } else {
      console.log('   ⚠️  Duplicate callback handling may need review');
    }
  } catch (error) {
    console.log(`   ❌ Error testing duplicates: ${error.error || error.message}`);
  }

  console.log('\n📊 Test Summary');
  console.log('===============');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 All tests passed! Your MarzPay webhook integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the webhook implementation.');
  }
}

// Run the tests
runTests().catch(console.error);

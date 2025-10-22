#!/usr/bin/env node

/**
 * Complete flow test: Create payment -> Test webhook -> Verify status
 */

const https = require('https');

const BASE_URL = 'https://dick-electronics-voucher-app.vercel.app';

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

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Payment Flow');
  console.log('================================\n');

  const testPayment = {
    phone: "+256712345678",
    amount: 1000,
    reference: `flow-test-${Date.now()}`
  };

  try {
    // Step 1: Create a payment
    console.log('1️⃣ Creating test payment...');
    const createPayment = await makeRequest(`${BASE_URL}/api/pay`, {
      method: 'POST',
      body: {
        phone: testPayment.phone,
        amount: testPayment.amount
      }
    });
    
    if (createPayment.success && createPayment.response.data) {
      console.log('   ✅ Payment created successfully');
      console.log(`   📝 Reference: ${createPayment.response.data.reference}`);
      console.log(`   💰 Amount: ${createPayment.response.data.amount} UGX`);
      console.log(`   📱 Phone: ${createPayment.response.data.phone}`);
      
      // Use the actual reference from the created payment
      testPayment.reference = createPayment.response.data.reference;
    } else {
      console.log('   ❌ Failed to create payment');
      console.log(`   📝 Error: ${createPayment.response.message || createPayment.response}`);
      return;
    }
    console.log('');

    // Step 2: Check initial payment status
    console.log('2️⃣ Checking initial payment status...');
    const initialStatus = await makeRequest(`${BASE_URL}/api/check-payment`, {
      method: 'POST',
      body: { reference: testPayment.reference }
    });
    
    if (initialStatus.success) {
      console.log('   ✅ Initial status check successful');
      console.log(`   📊 Status: ${initialStatus.response.data.status}`);
      console.log(`   🎫 Has Voucher: ${!!initialStatus.response.data.voucher}`);
    } else {
      console.log('   ❌ Initial status check failed');
      console.log(`   📝 Error: ${initialStatus.response.message}`);
    }
    console.log('');

    // Step 3: Simulate MarzPay webhook callback
    console.log('3️⃣ Simulating MarzPay webhook callback...');
    const marzPayPayload = {
      "event_type": "collection.completed",
      "transaction": {
        "uuid": `marz-flow-${Date.now()}`,
        "reference": testPayment.reference,
        "status": "completed",
        "amount": {
          "formatted": "1,000.00",
          "raw": 1000,
          "currency": "UGX"
        },
        "provider": "mtn",
        "phone_number": testPayment.phone,
        "description": "Complete flow test payment",
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
        "provider_reference": `marz-flow-provider-${Date.now()}`
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

    const webhookResult = await makeRequest(`${BASE_URL}/api/webhook`, {
      method: 'POST',
      body: marzPayPayload
    });
    
    if (webhookResult.success) {
      console.log('   ✅ Webhook callback successful');
      console.log(`   📝 Message: ${webhookResult.response.message}`);
      console.log(`   🎫 Generated Voucher: ${webhookResult.response.voucher}`);
      console.log(`   📊 Mapped Status: ${webhookResult.response.mapped_status}`);
    } else {
      console.log('   ❌ Webhook callback failed');
      console.log(`   📝 Error: ${webhookResult.response.message || webhookResult.response}`);
    }
    console.log('');

    // Step 4: Check final payment status
    console.log('4️⃣ Checking final payment status...');
    const finalStatus = await makeRequest(`${BASE_URL}/api/check-payment`, {
      method: 'POST',
      body: { reference: testPayment.reference }
    });
    
    if (finalStatus.success) {
      console.log('   ✅ Final status check successful');
      console.log(`   📊 Final Status: ${finalStatus.response.data.status}`);
      console.log(`   💰 Amount: ${finalStatus.response.data.amount} UGX`);
      console.log(`   📱 Phone: ${finalStatus.response.data.phone}`);
      
      if (finalStatus.response.data.voucher) {
        console.log(`   🎫 Final Voucher: ${finalStatus.response.data.voucher}`);
        console.log(`   ✅ Payment completed successfully!`);
      } else {
        console.log(`   ⚠️  No voucher found - payment may not be completed`);
      }
    } else {
      console.log('   ❌ Final status check failed');
      console.log(`   📝 Error: ${finalStatus.response.message}`);
    }
    console.log('');

    // Step 5: Debug storage state
    console.log('5️⃣ Debugging storage state...');
    const debugStorage = await makeRequest(`${BASE_URL}/api/debug-storage`);
    
    if (debugStorage.success) {
      console.log('   ✅ Storage debug successful');
      console.log(`   📊 Total payments in storage: ${debugStorage.response.total_payments}`);
      
      const currentPayment = debugStorage.response.payments.find(p => p.reference === testPayment.reference);
      if (currentPayment) {
        console.log(`   📝 Current payment status: ${currentPayment.status}`);
        console.log(`   🎫 Has voucher: ${currentPayment.hasVoucher}`);
        console.log(`   🎫 Voucher: ${currentPayment.voucher || 'None'}`);
      } else {
        console.log(`   ⚠️  Payment not found in storage`);
      }
    } else {
      console.log('   ❌ Storage debug failed');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testCompleteFlow().catch(console.error);














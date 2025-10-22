#!/usr/bin/env node

/**
 * Debug storage test to understand the issue
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

async function debugStorage() {
  console.log('🔍 Debugging Storage Issue');
  console.log('==========================\n');

  const testReference = `debug-${Date.now()}`;

  try {
    // Step 1: Create a payment
    console.log('1️⃣ Creating payment...');
    const createResult = await makeRequest(`${BASE_URL}/api/pay`, {
      method: 'POST',
      body: {
        phone: "+256712345678",
        amount: 1000
      }
    });
    
    if (createResult.success) {
      console.log('   ✅ Payment created');
      console.log(`   📝 Reference: ${createResult.response.data.reference}`);
      
      const reference = createResult.response.data.reference;
      
      // Step 2: Check storage immediately
      console.log('\n2️⃣ Checking storage immediately...');
      const debugResult = await makeRequest(`${BASE_URL}/api/debug-storage`);
      
      if (debugResult.success) {
        console.log('   ✅ Storage debug successful');
        console.log(`   📊 Total payments: ${debugResult.response.total_payments}`);
        
        const currentPayment = debugResult.response.payments.find(p => p.reference === reference);
        if (currentPayment) {
          console.log('   📝 Found payment in storage:');
          console.log(`      Status: ${currentPayment.status}`);
          console.log(`      Amount: ${currentPayment.amount}`);
          console.log(`      Phone: ${currentPayment.phone}`);
          console.log(`      Has Voucher: ${currentPayment.hasVoucher}`);
        } else {
          console.log('   ⚠️  Payment not found in storage');
        }
      } else {
        console.log('   ❌ Storage debug failed');
        console.log(`   📝 Error: ${debugResult.response.message || debugResult.response}`);
      }
      
      // Step 3: Test webhook with the same reference
      console.log('\n3️⃣ Testing webhook with same reference...');
      const webhookPayload = {
        "event_type": "collection.completed",
        "transaction": {
          "uuid": `debug-${Date.now()}`,
          "reference": reference,
          "status": "completed",
          "amount": {
            "formatted": "1,000.00",
            "raw": 1000,
            "currency": "UGX"
          },
          "provider": "mtn",
          "phone_number": "+256712345678",
          "description": "Debug test payment",
          "created_at": new Date().toISOString(),
          "updated_at": new Date().toISOString()
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
          "provider_reference": `debug-provider-${Date.now()}`
        },
        "business": {
          "uuid": "debug-business-uuid",
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
        body: webhookPayload
      });
      
      if (webhookResult.success) {
        console.log('   ✅ Webhook successful');
        console.log(`   📝 Message: ${webhookResult.response.message}`);
        console.log(`   🎫 Voucher: ${webhookResult.response.voucher}`);
      } else {
        console.log('   ❌ Webhook failed');
        console.log(`   📝 Error: ${webhookResult.response.message || webhookResult.response}`);
      }
      
      // Step 4: Check storage after webhook
      console.log('\n4️⃣ Checking storage after webhook...');
      const debugResult2 = await makeRequest(`${BASE_URL}/api/debug-storage`);
      
      if (debugResult2.success) {
        console.log('   ✅ Storage debug successful');
        console.log(`   📊 Total payments: ${debugResult2.response.total_payments}`);
        
        const currentPayment = debugResult2.response.payments.find(p => p.reference === reference);
        if (currentPayment) {
          console.log('   📝 Payment after webhook:');
          console.log(`      Status: ${currentPayment.status}`);
          console.log(`      Amount: ${currentPayment.amount}`);
          console.log(`      Phone: ${currentPayment.phone}`);
          console.log(`      Has Voucher: ${currentPayment.hasVoucher}`);
          console.log(`      Voucher: ${currentPayment.voucher || 'None'}`);
        } else {
          console.log('   ⚠️  Payment not found in storage after webhook');
        }
      } else {
        console.log('   ❌ Storage debug failed after webhook');
        console.log(`   📝 Error: ${debugResult2.response.message || debugResult2.response}`);
      }
      
      // Step 5: Check payment status via API
      console.log('\n5️⃣ Checking payment status via API...');
      const statusResult = await makeRequest(`${BASE_URL}/api/check-payment`, {
        method: 'POST',
        body: { reference: reference }
      });
      
      if (statusResult.success) {
        console.log('   ✅ Status check successful');
        console.log(`   📊 Status: ${statusResult.response.data.status}`);
        console.log(`   🎫 Voucher: ${statusResult.response.data.voucher || 'None'}`);
      } else {
        console.log('   ❌ Status check failed');
        console.log(`   📝 Error: ${statusResult.response.message}`);
      }
      
    } else {
      console.log('   ❌ Failed to create payment');
      console.log(`   📝 Error: ${createResult.response.message || createResult.response}`);
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Run the debug test
debugStorage().catch(console.error);














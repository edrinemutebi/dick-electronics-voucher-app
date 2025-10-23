#!/usr/bin/env node

/**
 * Test the new MarzPay API polling approach
 * This replaces webhook-based approach with direct API polling
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

async function testApiPolling() {
  console.log('🧪 Testing MarzPay API Polling Approach');
  console.log('=====================================\n');

  try {
    // Step 1: Create a payment
    console.log('1️⃣ Creating payment with MarzPay API...');
    const createResult = await makeRequest(`${BASE_URL}/api/pay`, {
      method: 'POST',
      body: {
        phone: "+256712345678",
        amount: 1000
      }
    });
    
    if (!createResult.success) {
      console.log('   ❌ Failed to create payment');
      console.log(`   📝 Error: ${createResult.response.message || createResult.response}`);
      return;
    }
    
    console.log('   ✅ Payment created successfully');
    console.log(`   📝 Reference: ${createResult.response.data.paymentResponse.data.transaction.reference}`);
    console.log(`   🆔 Transaction UUID: ${createResult.response.data.paymentResponse.data.transaction.uuid}`);
    console.log(`   📊 Status: ${createResult.response.data.paymentResponse.data.transaction.status}`);
    
    const reference = createResult.response.data.paymentResponse.data.transaction.reference;
    const transactionUuid = createResult.response.data.paymentResponse.data.transaction.uuid;
    
    // Step 2: Test MarzPay API checker directly
    console.log('\n2️⃣ Testing MarzPay API checker directly...');
    const marzCheckResult = await makeRequest(`${BASE_URL}/api/check-marz-payment`, {
      method: 'POST',
      body: {
        reference: reference,
        transactionUuid: transactionUuid
      }
    });
    
    if (marzCheckResult.success) {
      console.log('   ✅ MarzPay API checker successful');
      console.log(`   📊 MarzPay Status: ${marzCheckResult.response.data.marzPayStatus}`);
      console.log(`   🔄 Internal Status: ${marzCheckResult.response.data.internalStatus}`);
      console.log(`   ✅ Is Complete: ${marzCheckResult.response.data.isComplete}`);
      console.log(`   🎫 Should Generate Voucher: ${marzCheckResult.response.data.shouldGenerateVoucher}`);
    } else {
      console.log('   ❌ MarzPay API checker failed');
      console.log(`   📝 Error: ${marzCheckResult.response.message || marzCheckResult.response}`);
    }
    
    // Step 3: Test integrated payment status check
    console.log('\n3️⃣ Testing integrated payment status check...');
    const statusResult = await makeRequest(`${BASE_URL}/api/check-payment`, {
      method: 'POST',
      body: {
        reference: reference
      }
    });
    
    if (statusResult.success) {
      console.log('   ✅ Payment status check successful');
      console.log(`   📊 Status: ${statusResult.response.data.status}`);
      console.log(`   💰 Amount: ${statusResult.response.data.amount} UGX`);
      console.log(`   📱 Phone: ${statusResult.response.data.phone}`);
      console.log(`   🎫 Voucher: ${statusResult.response.data.voucher || 'None'}`);
      
      if (statusResult.response.data.voucher) {
        console.log(`   ✅ Payment completed with voucher!`);
      } else {
        console.log(`   ⏳ Payment still processing...`);
      }
    } else {
      console.log('   ❌ Payment status check failed');
      console.log(`   📝 Error: ${statusResult.response.message}`);
    }
    
    // Step 4: Test multiple polling attempts
    console.log('\n4️⃣ Testing multiple polling attempts...');
    for (let i = 1; i <= 3; i++) {
      console.log(`   🔄 Polling attempt ${i}/3...`);
      
      const pollResult = await makeRequest(`${BASE_URL}/api/check-payment`, {
        method: 'POST',
        body: {
          reference: reference
        }
      });
      
      if (pollResult.success) {
        console.log(`   📊 Attempt ${i} - Status: ${pollResult.response.data.status}`);
        
        if (pollResult.response.data.status === 'successful' && pollResult.response.data.voucher) {
          console.log(`   🎫 Voucher generated: ${pollResult.response.data.voucher}`);
          break;
        } else if (pollResult.response.data.status === 'failed') {
          console.log(`   ❌ Payment failed`);
          break;
        } else {
          console.log(`   ⏳ Still processing...`);
        }
      } else {
        console.log(`   ❌ Polling attempt ${i} failed: ${pollResult.response.message}`);
      }
      
      // Wait 2 seconds between attempts (matching frontend polling)
      if (i < 3) {
        console.log(`   ⏳ Waiting 2 seconds before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Step 5: Final status check
    console.log('\n5️⃣ Final status check...');
    const finalResult = await makeRequest(`${BASE_URL}/api/check-payment`, {
      method: 'POST',
      body: {
        reference: reference
      }
    });
    
    if (finalResult.success) {
      console.log('   ✅ Final status check successful');
      console.log(`   📊 Final Status: ${finalResult.response.data.status}`);
      
      if (finalResult.response.data.voucher) {
        console.log(`   🎫 Final Voucher: ${finalResult.response.data.voucher}`);
        console.log(`   ✅ Payment completed successfully!`);
      } else {
        console.log(`   ⏳ Payment still processing or failed`);
      }
    } else {
      console.log('   ❌ Final status check failed');
      console.log(`   📝 Error: ${finalResult.response.message}`);
    }

    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`✅ Payment Creation: ${createResult.success ? 'PASS' : 'FAIL'}`);
    console.log(`✅ MarzPay API Checker: ${marzCheckResult.success ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Status Integration: ${statusResult.success ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Final Verification: ${finalResult.success ? 'PASS' : 'FAIL'}`);
    
    const allPassed = createResult.success && marzCheckResult.success && 
                     statusResult.success && finalResult.success;
    
    if (allPassed) {
      console.log('\n🎉 All tests passed! Your API polling approach is working correctly.');
      console.log('📝 Polling interval: 2 seconds (as requested)');
      console.log('🔄 Approach: Direct MarzPay API polling instead of webhooks');
      console.log('🌐 API Endpoint: GET /api/v1/collect-money/{uuid}');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the implementation.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testApiPolling().catch(console.error);
















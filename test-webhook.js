// Test script for Marz Pay webhook integration
// Run with: node test-webhook.js

const testWebhook = async () => {
  const webhookUrl = 'http://localhost:3000/api/webhook';
  
  // Test successful payment webhook
  const successfulPayload = {
    event_type: "collection.completed",
    transaction: {
      uuid: "test-transaction-uuid",
      reference: "test-reference-123",
      status: "completed",
      amount: {
        formatted: "1,000.00",
        raw: 1000,
        currency: "UGX"
      },
      provider: "mtn",
      phone_number: "+256712345678",
      description: "Voucher payment 1000",
      created_at: "2025-01-21T15:18:48.000000Z",
      updated_at: "2025-01-21T15:18:48.000000Z"
    },
    collection: {
      provider: "mtn",
      phone_number: "+256712345678",
      amount: {
        formatted: "1,000.00",
        raw: 1000,
        currency: "UGX"
      },
      mode: "mtnuganda",
      provider_reference: "mtn-transaction-id"
    },
    business: {
      uuid: "business-uuid",
      name: "Dick Electronics"
    },
    metadata: {
      sandbox_mode: true,
      environment: "test",
      timestamp: "2025-01-21T15:18:48.000000Z"
    }
  };

  // Test failed payment webhook
  const failedPayload = {
    event_type: "collection.failed",
    transaction: {
      uuid: "test-transaction-uuid-2",
      reference: "test-reference-456",
      status: "failed",
      amount: {
        formatted: "1,000.00",
        raw: 1000,
        currency: "UGX"
      },
      provider: "mtn",
      phone_number: "+256712345678",
      description: "Voucher payment 1000",
      created_at: "2025-01-21T15:18:48.000000Z",
      updated_at: "2025-01-21T15:18:48.000000Z"
    }
  };

  try {
    console.log('🧪 Testing successful payment webhook...');
    const successResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successfulPayload)
    });
    
    const successResult = await successResponse.json();
    console.log('✅ Success webhook response:', successResult);
    
    console.log('\n🧪 Testing failed payment webhook...');
    const failedResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(failedPayload)
    });
    
    const failedResult = await failedResponse.json();
    console.log('❌ Failed webhook response:', failedResult);
    
    console.log('\n🎉 Webhook tests completed!');
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error);
  }
};

// Run the test
testWebhook();

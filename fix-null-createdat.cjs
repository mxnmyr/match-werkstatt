const { MongoClient } = require('mongodb');

async function fixNullCreatedAt() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('matchdb');
    
    console.log('=== Fixing null createdAt in Orders ===');
    
    // Fix orders with null createdAt
    const orders = await db.collection('Order').find({ createdAt: null }).toArray();
    console.log(`Found ${orders.length} orders with null createdAt`);
    
    for (const order of orders) {
      await db.collection('Order').updateOne(
        { _id: order._id },
        { $set: { createdAt: new Date(), updatedAt: new Date() } }
      );
      console.log(`Fixed order ${order.title || order._id} - added createdAt`);
    }
    
    console.log('\n=== createdAt fix complete ===');
    
  } finally {
    await client.close();
  }
}

fixNullCreatedAt().catch(console.error);

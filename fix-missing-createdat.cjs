const { MongoClient } = require('mongodb');

async function fixMissingCreatedAt() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('matchdb');
    
    console.log('=== Fixing missing createdAt ===');
    
    // Fix components without createdAt
    const result = await db.collection('Component').updateMany(
      { createdAt: { $exists: false } },
      { $set: { createdAt: new Date() } }
    );
    console.log(`Fixed ${result.modifiedCount} components`);
    
  } finally {
    await client.close();
  }
}

fixMissingCreatedAt().catch(console.error);

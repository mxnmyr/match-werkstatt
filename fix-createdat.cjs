const { MongoClient, ObjectId } = require('mongodb');

async function fixCreatedAtFields() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('matchdb');
    
    console.log('=== Fixing createdAt fields ===');
    
    // Fix components without createdAt
    const components = await db.collection('Component').find({ createdAt: { $exists: false } }).toArray();
    console.log(`Found ${components.length} components without createdAt`);
    
    for (const comp of components) {
      await db.collection('Component').updateOne(
        { _id: comp._id },
        { $set: { createdAt: new Date() } }
      );
      console.log(`Fixed component ${comp.title} - added createdAt`);
    }
    
    console.log('\n=== createdAt fix complete ===');
    
  } finally {
    await client.close();
  }
}

fixCreatedAtFields().catch(console.error);

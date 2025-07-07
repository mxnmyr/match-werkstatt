const { MongoClient, ObjectId } = require('mongodb');

async function fixExistingData() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('matchdb');
    
    console.log('=== Fixing existing data ===');
    
    // Fix documents - convert string orderId to ObjectId
    const documents = await db.collection('Document').find({}).toArray();
    console.log(`Found ${documents.length} documents to fix`);
    
    for (const doc of documents) {
      if (typeof doc.orderId === 'string') {
        await db.collection('Document').updateOne(
          { _id: doc._id },
          { $set: { orderId: new ObjectId(doc.orderId) } }
        );
        console.log(`Fixed document ${doc.name} - orderId converted to ObjectId`);
      }
    }
    
    // Fix components - convert string orderId to ObjectId
    const components = await db.collection('Component').find({}).toArray();
    console.log(`\nFound ${components.length} components to fix`);
    
    for (const comp of components) {
      if (typeof comp.orderId === 'string') {
        await db.collection('Component').updateOne(
          { _id: comp._id },
          { $set: { orderId: new ObjectId(comp.orderId) } }
        );
        console.log(`Fixed component ${comp.title} - orderId converted to ObjectId`);
      }
    }
    
    // Fix component documents - convert string componentId to ObjectId
    const componentDocs = await db.collection('ComponentDocument').find({}).toArray();
    console.log(`\nFound ${componentDocs.length} component documents to fix`);
    
    for (const doc of componentDocs) {
      if (typeof doc.componentId === 'string') {
        await db.collection('ComponentDocument').updateOne(
          { _id: doc._id },
          { $set: { componentId: new ObjectId(doc.componentId) } }
        );
        console.log(`Fixed component document ${doc.name} - componentId converted to ObjectId`);
      }
    }
    
    console.log('\n=== Data fix complete ===');
    
  } finally {
    await client.close();
  }
}

fixExistingData().catch(console.error);

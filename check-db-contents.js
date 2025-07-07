const { MongoClient } = require('mongodb');

async function checkDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('matchdb');
    
    console.log('=== Orders ===');
    const orders = await db.collection('Order').find({}).toArray();
    console.log(`Found ${orders.length} orders`);
    
    console.log('\n=== Documents ===');
    const documents = await db.collection('Document').find({}).toArray();
    console.log(`Found ${documents.length} documents`);
    documents.forEach(doc => {
      console.log(`- ${doc.name} (orderId: ${doc.orderId})`);
    });
    
    console.log('\n=== Components ===');
    const components = await db.collection('Component').find({}).toArray();
    console.log(`Found ${components.length} components`);
    components.forEach(comp => {
      console.log(`- ${comp.title} (orderId: ${comp.orderId})`);
    });
    
    console.log('\n=== ComponentDocuments ===');
    const componentDocs = await db.collection('ComponentDocument').find({}).toArray();
    console.log(`Found ${componentDocs.length} component documents`);
    componentDocs.forEach(doc => {
      console.log(`- ${doc.name} (componentId: ${doc.componentId})`);
    });
    
  } finally {
    await client.close();
  }
}

checkDatabase().catch(console.error);

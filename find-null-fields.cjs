const { MongoClient } = require('mongodb');

async function findNullFields() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('matchdb');
    
    console.log('=== Checking for null fields ===');
    
    // Check Orders
    const ordersWithNull = await db.collection('Order').find({
      $or: [
        { createdAt: null },
        { updatedAt: null },
        { createdAt: { $exists: false } },
        { updatedAt: { $exists: false } }
      ]
    }).toArray();
    console.log(`Orders with null/missing timestamps: ${ordersWithNull.length}`);
    ordersWithNull.forEach(order => console.log(`- Order: ${order.title}, createdAt: ${order.createdAt}, updatedAt: ${order.updatedAt}`));
    
    // Check Components  
    const componentsWithNull = await db.collection('Component').find({
      $or: [
        { createdAt: null },
        { createdAt: { $exists: false } }
      ]
    }).toArray();
    console.log(`\nComponents with null/missing createdAt: ${componentsWithNull.length}`);
    componentsWithNull.forEach(comp => console.log(`- Component: ${comp.title}, createdAt: ${comp.createdAt}`));
    
    // Check Documents
    const documentsWithNull = await db.collection('Document').find({
      $or: [
        { uploadDate: null },
        { uploadDate: { $exists: false } }
      ]
    }).toArray();
    console.log(`\nDocuments with null/missing uploadDate: ${documentsWithNull.length}`);
    documentsWithNull.forEach(doc => console.log(`- Document: ${doc.name}, uploadDate: ${doc.uploadDate}`));
    
    // Check ComponentDocuments
    const compDocsWithNull = await db.collection('ComponentDocument').find({
      $or: [
        { uploadDate: null },
        { uploadDate: { $exists: false } }
      ]
    }).toArray();
    console.log(`\nComponentDocuments with null/missing uploadDate: ${compDocsWithNull.length}`);
    compDocsWithNull.forEach(doc => console.log(`- ComponentDocument: ${doc.name}, uploadDate: ${doc.uploadDate}`));
    
  } finally {
    await client.close();
  }
}

findNullFields().catch(console.error);

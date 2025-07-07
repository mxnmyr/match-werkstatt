import { MongoClient } from 'mongodb';

const url = 'mongodb://localhost:27017';
const dbName = 'matchdb';

async function checkOrderData() {
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Prüfe Order
    const ordersCollection = db.collection('Order');
    const order = await ordersCollection.findOne({ orderNumber: 'F-250707-144' });
    console.log('📋 Order found:', order ? 'YES' : 'NO');
    if (order) console.log('Order Title:', order.title);
    
    // Prüfe Documents
    const documentsCollection = db.collection('Document');
    const documents = await documentsCollection.find({ orderId: order?._id.toString() }).toArray();
    console.log('📄 Documents found:', documents.length);
    documents.forEach(doc => console.log('- Document:', doc.name));
    
    // Prüfe Components
    const componentsCollection = db.collection('Component');
    const components = await componentsCollection.find({ orderId: order?._id.toString() }).toArray();
    console.log('🔧 Components found:', components.length);
    components.forEach(comp => console.log('- Component:', comp.title));
    
    // Prüfe Component Documents
    if (components.length > 0) {
      const compDocumentsCollection = db.collection('ComponentDocument');
      for (const comp of components) {
        const compDocs = await compDocumentsCollection.find({ componentId: comp._id.toString() }).toArray();
        console.log(`📎 Component "${comp.title}" documents:`, compDocs.length);
        compDocs.forEach(doc => console.log('  - Doc:', doc.name));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkOrderData();

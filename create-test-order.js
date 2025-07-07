import { MongoClient } from 'mongodb';

const url = 'mongodb://localhost:27017';
const dbName = 'matchdb';

async function createTestOrder() {
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection('Order');
    
    const testOrder = {
      orderNumber: 'F-250707-123',
      title: 'Test Auftrag',
      description: 'Test Beschreibung',
      clientId: '686bb4b770bd0a6c9ff75719',
      clientName: 'Max Mustermann',
      deadline: new Date('2025-07-15'),
      costCenter: 'TEST-001',
      priority: 'medium',
      status: 'pending',
      estimatedHours: 0,
      actualHours: 0,
      assignedTo: null,
      notes: '',
      orderType: 'fertigung',
      subTasks: [],
      revisionHistory: [],
      reworkComments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(testOrder);
    console.log('✅ Created test order with ID:', result.insertedId);
    
    // Verifikation
    const orders = await collection.find({}).toArray();
    console.log(`📋 Found ${orders.length} orders in database`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestOrder();

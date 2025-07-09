const { MongoClient } = require('mongodb');

async function testMongoDirectly() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    console.log('Connecting to MongoDB directly...');
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('matchdb');
    const collection = db.collection('SystemConfig');
    
    // Test inserting a document
    console.log('Inserting test document...');
    const result = await collection.insertOne({
      key: 'TEST_NETWORK_PATH',
      value: 'C:\\Test\\Path',
      description: 'Test configuration',
      updatedAt: new Date(),
      updatedBy: 'test'
    });
    
    console.log('✓ Document inserted with ID:', result.insertedId);
    
    // Test finding the document
    const found = await collection.findOne({ key: 'TEST_NETWORK_PATH' });
    console.log('✓ Found document:', found);
    
    // Clean up
    await collection.deleteOne({ _id: result.insertedId });
    console.log('✓ Test document cleaned up');
    
  } catch (error) {
    console.error('✗ MongoDB error:', error);
  } finally {
    await client.close();
  }
}

testMongoDirectly();

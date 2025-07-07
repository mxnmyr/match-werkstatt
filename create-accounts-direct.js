import { MongoClient } from 'mongodb';

const url = 'mongodb://localhost:27017';
const dbName = 'matchdb';

async function createTestAccounts() {
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection('User');
    
    // Lösche alle existierenden User (für Clean Setup)
    await collection.deleteMany({});
    console.log('🗑️ Cleared existing users');
    
    // Admin Account
    const admin = {
      username: 'admin',
      password: 'admin123',
      name: 'Administrator',
      role: 'admin',
      isActive: true,
      isApproved: true,
      createdAt: new Date()
    };
    
    // Workshop Account
    const workshop = {
      username: 'werkstatt',
      password: 'werkstatt123',
      name: 'Werkstatt Mitarbeiter',
      role: 'workshop',
      isActive: true,
      isApproved: true,
      createdAt: new Date()
    };
    
    // Client Accounts
    const client1 = {
      username: 'kunde',
      password: 'kunde123',
      name: 'Max Mustermann',
      role: 'client',
      isActive: true,
      isApproved: true,
      createdAt: new Date()
    };
    
    const client2 = {
      username: 'kunde2',
      password: 'kunde123',
      name: 'Anna Schmidt',
      role: 'client',
      isActive: true,
      isApproved: true,
      createdAt: new Date()
    };
    
    // Accounts erstellen
    const result = await collection.insertMany([admin, workshop, client1, client2]);
    console.log('✅ Created', result.insertedCount, 'user accounts');
    
    // Verifikation
    const users = await collection.find({}).toArray();
    console.log('\n📊 Created Accounts:');
    console.log('====================');
    
    users.forEach(user => {
      console.log(`👤 ${user.role.toUpperCase()}: ${user.username} (${user.name})`);
    });
    
    console.log('\n🔑 Login Credentials:');
    console.log('=====================');
    console.log('👤 Admin Login:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    
    console.log('\n🔧 Workshop Login:');
    console.log('   Username: werkstatt');
    console.log('   Password: werkstatt123');
    console.log('   Role: workshop');
    
    console.log('\n👨‍💼 Client Login 1:');
    console.log('   Username: kunde');
    console.log('   Password: kunde123');
    console.log('   Role: client');
    console.log('   Name: Max Mustermann');
    
    console.log('\n👩‍💼 Client Login 2:');
    console.log('   Username: kunde2');
    console.log('   Password: kunde123');
    console.log('   Role: client');
    console.log('   Name: Anna Schmidt');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createTestAccounts();

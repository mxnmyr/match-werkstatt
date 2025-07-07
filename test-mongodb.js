import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    
    // Test connection by trying to connect
    await prisma.$connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in database`);
    
    const orderCount = await prisma.order.count();
    console.log(`📋 Found ${orderCount} orders in database`);
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testConnection();

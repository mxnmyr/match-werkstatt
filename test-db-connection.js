const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await prisma.$connect();
    console.log('✓ Database connection successful');
    
    // Test reading existing data
    const users = await prisma.user.findMany();
    console.log(`✓ Found ${users.length} users in database`);
    
    // Test reading system config
    const configs = await prisma.systemConfig.findMany();
    console.log(`✓ Found ${configs.length} system configurations`);
    
    // Try a simple create operation (non-transactional)
    console.log('Testing simple insert...');
    
    // First, try to delete any existing test config
    try {
      await prisma.systemConfig.deleteMany({
        where: { key: 'TEST_CONFIG' }
      });
    } catch (e) {
      console.log('No existing test config to delete');
    }
    
    // Now try to create a new test config
    const testConfig = await prisma.systemConfig.create({
      data: {
        key: 'TEST_CONFIG',
        value: 'test_value',
        description: 'Test configuration',
        updatedBy: 'test'
      }
    });
    
    console.log('✓ Test configuration created:', testConfig);
    
    // Clean up - delete the test config
    await prisma.systemConfig.delete({
      where: { id: testConfig.id }
    });
    
    console.log('✓ Test configuration cleaned up');
    console.log('✓ All database operations successful');
    
  } catch (error) {
    console.error('✗ Database error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

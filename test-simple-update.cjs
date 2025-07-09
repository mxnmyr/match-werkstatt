const { PrismaClient } = require('@prisma/client');

async function testSimpleUpdate() {
  const prisma = new PrismaClient();
  try {
    // Hole einen Auftrag
    const orders = await prisma.order.findMany();
    if (orders.length === 0) {
      console.log('No orders found');
      return;
    }
    
    const testOrder = orders[0];
    console.log(`Testing with order: ${testOrder.id}`);
    
    // Teste einfaches Update ohne includes
    const updated = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        titleImage: 'test-base64-string'
      }
    });
    
    console.log('✅ Simple update successful:', updated.id);
    
    // Teste Update mit includes
    try {
      const updatedWithIncludes = await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          titleImage: 'test-with-includes'
        },
        include: {
          documents: true
        }
      });
      console.log('✅ Update with includes successful');
    } catch (includeError) {
      console.log('❌ Update with includes failed:', includeError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSimpleUpdate();

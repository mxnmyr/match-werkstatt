const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrismaRelations() {
  try {
    console.log('=== Testing Prisma Relations ===');
    
    // Get an order with a specific ID
    const order = await prisma.order.findUnique({
      where: { id: '686bbb159a18a70cd7048f0b' },
      include: {
        documents: true,
        components: {
          include: {
            documents: true
          }
        }
      }
    });
    
    console.log('Order found:', order ? 'YES' : 'NO');
    if (order) {
      console.log('Documents:', order.documents.length);
      console.log('Components:', order.components.length);
      order.documents.forEach(doc => console.log(`- Document: ${doc.name}`));
      order.components.forEach(comp => console.log(`- Component: ${comp.title}`));
    }
    
    // Test direct document query
    console.log('\n=== Direct Document Query ===');
    const documents = await prisma.document.findMany({
      where: { orderId: '686bbb159a18a70cd7048f0b' }
    });
    console.log(`Found ${documents.length} documents directly`);
    
    // Test direct component query
    console.log('\n=== Direct Component Query ===');
    const components = await prisma.component.findMany({
      where: { orderId: '686bbb159a18a70cd7048f0b' }
    });
    console.log(`Found ${components.length} components directly`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaRelations();

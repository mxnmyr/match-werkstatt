const { PrismaClient } = require('@prisma/client');

async function checkImages() {
  const prisma = new PrismaClient();
  try {
    const images = await prisma.image.findMany();
    console.log('Existing images:', images.length);
    
    const orders = await prisma.order.findMany({
      where: {
        titleImageId: { not: null }
      },
      select: {
        id: true,
        orderNumber: true,
        titleImageId: true
      }
    });
    console.log('Orders with title images:', orders);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImages();

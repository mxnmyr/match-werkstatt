import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestAccounts() {
  try {
    console.log('🔧 Creating test accounts...');
    
    // Prüfe erstmal ob Accounts bereits existieren
    const existingUsers = await prisma.user.findMany();
    console.log(`📊 Found ${existingUsers.length} existing users`);

    // Admin Account
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (!existingAdmin) {
      const admin = await prisma.user.create({
        data: {
          username: 'admin',
          password: 'admin123', // In production würde man das hashen
          name: 'Administrator',
          role: 'admin',
          isActive: true,
          isApproved: true
        }
      });
      console.log('✅ Admin account created:', admin.username);
    } else {
      console.log('ℹ️ Admin account already exists');
    }

    // Workshop Account
    const existingWorkshop = await prisma.user.findUnique({
      where: { username: 'werkstatt' }
    });
    
    if (!existingWorkshop) {
      const workshop = await prisma.user.create({
        data: {
          username: 'werkstatt',
          password: 'werkstatt123',
          name: 'Werkstatt Mitarbeiter',
          role: 'workshop',
          isActive: true,
          isApproved: true
        }
      });
      console.log('✅ Workshop account created:', workshop.username);
    } else {
      console.log('ℹ️ Workshop account already exists');
    }

    // Client Account
    const existingClient = await prisma.user.findUnique({
      where: { username: 'kunde' }
    });
    
    if (!existingClient) {
      const client = await prisma.user.create({
        data: {
          username: 'kunde',
          password: 'kunde123',
          name: 'Max Mustermann',
          role: 'client',
          isActive: true,
          isApproved: true
        }
      });
      console.log('✅ Client account created:', client.username);
    } else {
      console.log('ℹ️ Client account already exists');
    }

    // Client Account 2
    const existingClient2 = await prisma.user.findUnique({
      where: { username: 'kunde2' }
    });
    
    if (!existingClient2) {
      const client2 = await prisma.user.create({
        data: {
          username: 'kunde2',
          password: 'kunde123',
          name: 'Anna Schmidt',
          role: 'client',
          isActive: true,
          isApproved: true
        }
      });
      console.log('✅ Client account 2 created:', client2.username);
    } else {
      console.log('ℹ️ Client account 2 already exists');
    }

    console.log('\n📊 Account Summary:');
    console.log('===================');
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
    console.error('❌ Error creating accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAccounts();

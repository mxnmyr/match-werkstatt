// migrate-all-files.js
// Dieses Skript migriert alle Dateien in die entsprechenden Netzwerkordner

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const API_BASE_URL = 'http://localhost:3001';
const prisma = new PrismaClient();

async function migrateAllFiles() {
  try {
    console.log('Migrating all files to network folders...');
    
    // Hole alle Aufträge
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        networkFolderCreated: true
      }
    });
    
    console.log(`Found ${orders.length} orders to process`);
    
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    
    // Für jeden Auftrag die Dateien migrieren
    for (const order of orders) {
      try {
        // Wenn der Netzwerkordner noch nicht erstellt wurde, erstelle ihn zuerst
        if (!order.networkFolderCreated) {
          console.log(`Creating network folder for order ${order.orderNumber || order.id}...`);
          await axios.post(`${API_BASE_URL}/api/orders/${order.id}/network-folder`);
        }
        
        // Migriere die Dateien
        console.log(`Migrating files for order ${order.orderNumber || order.id}...`);
        const response = await axios.post(`${API_BASE_URL}/api/orders/${order.id}/migrate-files`);
        
        if (response.data.success) {
          const migratedFiles = response.data.migrationResult?.migratedFiles || 0;
          const fileTypes = response.data.migrationResult?.fileTypes || {};
          
          // Format file type distribution
          let fileTypeSummary = '';
          if (Object.keys(fileTypes).length > 0) {
            fileTypeSummary = Object.entries(fileTypes)
              .map(([type, count]) => `${count} in ${type}`)
              .join(', ');
          }
          
          console.log(`✓ Successfully migrated ${migratedFiles} files for order ${order.orderNumber || order.id}${fileTypeSummary ? ` (${fileTypeSummary})` : ''}`);
          successCount++;
        } else {
          console.log(`⚠ Migration completed with warnings for order ${order.orderNumber || order.id}`);
          successCount++;
        }
      } catch (error) {
        console.error(`✗ Failed to migrate files for order ${order.orderNumber || order.id}:`, error.response?.data || error.message);
        failCount++;
      }
    }
    
    console.log('\nMigration Summary:');
    console.log(`Total orders processed: ${orders.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Skipped: ${skippedCount}`);
    
  } catch (error) {
    console.error('Error in migration process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAllFiles().then(() => {
  console.log('Migration script completed');
}).catch(error => {
  console.error('Migration script error:', error);
  process.exit(1);
});

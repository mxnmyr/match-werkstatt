async function test() {
  console.log('Testing MongoDB-only APIs...');
  
  try {
    const response = await fetch('http://localhost:3001/api/orders');
    const orders = await response.json();
    console.log('✅ GET /api/orders:', orders.length, 'orders loaded');
    
    // Prüfe documents
    const ordersWithDocs = orders.filter(o => o.documents && o.documents.length > 0);
    console.log('📁 Orders with documents:', ordersWithDocs.length);
    ordersWithDocs.forEach(order => {
      console.log('  -', order.id, ':', order.documents.length, 'documents');
      order.documents.forEach(doc => {
        console.log('    *', doc.name, '(' + (doc.type || 'undefined') + ')');
      });
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}
test();

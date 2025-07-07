const response = await fetch('http://localhost:3001/api/orders');
const orders = await response.json();
console.log('First order:', JSON.stringify(orders[0], null, 2));
console.log('reworkComments:', orders[0]?.reworkComments);

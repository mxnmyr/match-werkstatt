// Test für Frontend-Request
const testData = {
  status: 'rework',
  revisionComment: 'Frontend-Test Kommentar von Kunde',
  userId: '686bb4b770bd0a6c9ff75719',
  userName: 'Test Kunde'
};

fetch('http://localhost:3001/api/orders/686bc76e3da427aa8af7650c', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('Response:', JSON.stringify(data, null, 2));
  console.log('reworkComments:', data.reworkComments);
})
.catch(err => console.error('Error:', err));

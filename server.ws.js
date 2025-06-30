const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3001;

app.use(cors());
app.use(express.json());

const usersPath = path.join(__dirname, 'storage', 'users', 'users.json');
const ordersPath = path.join(__dirname, 'storage', 'orders', 'orders.json');
const uploadsDir = path.join(__dirname, 'storage', 'uploads');

if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '[]');
if (!fs.existsSync(ordersPath)) fs.writeFileSync(ordersPath, '[]');

function broadcast(type, payload) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, payload }));
    }
  });
}

// --- USERS ---
app.get('/api/users', (req, res) => {
  const users = JSON.parse(fs.readFileSync(usersPath));
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const users = JSON.parse(fs.readFileSync(usersPath));
  users.push(req.body);
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  broadcast('usersUpdated', users);
  res.status(201).json(req.body);
});

// --- ORDERS ---
app.get('/api/orders', (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ordersPath));
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ordersPath));
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ordersPath));
  orders.push(req.body);
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
  broadcast('ordersUpdated', orders);
  res.status(201).json(req.body);
});

app.put('/api/orders/:id', (req, res) => {
  let orders = JSON.parse(fs.readFileSync(ordersPath));
  orders = orders.map(o => o.id === req.params.id ? req.body : o);
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
  broadcast('ordersUpdated', orders);
  res.json(req.body);
});

// --- FILE UPLOADS ---
const upload = multer({ dest: uploadsDir });
app.post('/api/upload', upload.single('file'), (req, res) => {
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

app.use('/uploads', express.static(uploadsDir));

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

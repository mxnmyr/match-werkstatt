const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = 3001;

// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5175'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
const uploadsDir = path.join(__dirname, 'storage', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    cb(null, true);
  }
});

// Memory storage for title images
const memoryUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for images
});

// MongoDB Connection Setup
const MONGODB_URL = 'mongodb://localhost:27017';
const DB_NAME = 'matchdb';

// Helper function: MongoDB connection
async function getDB() {
  const client = new MongoClient(MONGODB_URL);
  await client.connect();
  const db = client.db(DB_NAME);
  return { client, db };
}

// Helper function: Convert MongoDB document to response format
function convertMongoDoc(doc) {
  if (!doc) return null;
  return {
    ...doc,
    id: doc._id.toString(),
    _id: undefined
  };
}

// Helper function: Convert array of MongoDB documents
function convertMongoDocs(docs) {
  return docs.map(convertMongoDoc);
}

// === USERS API ===
app.get('/api/users', async (req, res) => {
  try {
    const { client, db } = await getDB();
    const users = await db.collection('User').find({}).toArray();
    await client.close();
    
    res.json(convertMongoDocs(users));
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Nutzer', details: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    const { client, db } = await getDB();
    
    // Check if user exists
    const exists = await db.collection('User').findOne({ username });
    if (exists) {
      await client.close();
      return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    }
    
    // Create user
    const newUser = {
      username,
      password,
      name,
      role: role || 'client',
      isActive: true,
      isApproved: false,
      createdAt: new Date()
    };
    
    const result = await db.collection('User').insertOne(newUser);
    await client.close();
    
    res.status(201).json(convertMongoDoc({ ...newUser, _id: result.insertedId }));
  } catch (err) {
    console.error('POST /api/users error:', err);
    res.status(500).json({ error: 'Fehler beim Anlegen des Nutzers', details: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { client, db } = await getDB();
    
    const user = await db.collection('User').findOne({ username });
    await client.close();
    
    if (user && user.password === password) {
      if (user.role === 'client' && user.isApproved === false) {
        return res.status(403).json({ success: false, message: 'Account noch nicht bestätigt' });
      }
      
      res.json({ success: true, user: convertMongoDoc(user) });
    } else {
      res.status(401).json({ success: false, message: 'Ungültige Zugangsdaten' });
    }
  } catch (err) {
    console.error('POST /api/login error:', err);
    res.status(500).json({ success: false, message: 'Serverfehler beim Login', error: err.message });
  }
});

app.patch('/api/users/:id/approve', async (req, res) => {
  try {
    const { client, db } = await getDB();
    
    const result = await db.collection('User').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isApproved: true } }
    );
    
    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({ error: 'User nicht gefunden' });
    }
    
    const user = await db.collection('User').findOne({ _id: new ObjectId(req.params.id) });
    await client.close();
    
    res.json(convertMongoDoc(user));
  } catch (err) {
    console.error('PATCH /api/users/:id/approve error:', err);
    res.status(500).json({ error: 'Fehler beim Bestätigen des Nutzers', details: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { client, db } = await getDB();
    
    const result = await db.collection('User').deleteOne({ _id: new ObjectId(req.params.id) });
    await client.close();
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err);
    res.status(500).json({ error: 'Fehler beim Löschen des Nutzers', details: err.message });
  }
});

// === ORDERS API ===
app.get('/api/orders', async (req, res) => {
  try {
    const { client, db } = await getDB();
    
    // Load all orders
    const orders = await db.collection('Order').find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    // Enrich with relations
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      // Load documents (embedded or referenced)
      let documents = order.documents || [];
      if (documents.length === 0) {
        documents = await db.collection('Document').find({ 
          orderId: new ObjectId(order._id) 
        }).toArray();
      }
      
      // Load components
      const components = await db.collection('Component').find({ 
        orderId: new ObjectId(order._id) 
      }).toArray();
      
      // Load note history
      const noteHistory = await db.collection('NoteHistory').find({ 
        orderId: new ObjectId(order._id) 
      })
      .sort({ createdAt: -1 })
      .toArray();
      
      return {
        ...order,
        id: order._id.toString(),
        _id: undefined,
        documents: documents,
        components: components,
        noteHistory: noteHistory,
        revisionHistory: order.revisionHistory || [],
        reworkComments: order.reworkComments || []
      };
    }));
    
    await client.close();
    
    console.log('GET /api/orders - Loaded', enrichedOrders.length, 'orders from MongoDB');
    res.json(enrichedOrders);
  } catch (err) {
    console.error('GET /api/orders error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Aufträge', details: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const { client, db } = await getDB();
    
    const order = await db.collection('Order').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!order) {
      await client.close();
      return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    }
    
    // Load relations
    let documents = order.documents || [];
    if (documents.length === 0) {
      documents = await db.collection('Document').find({ 
        orderId: new ObjectId(req.params.id) 
      }).toArray();
    }
    
    const components = await db.collection('Component').find({ 
      orderId: new ObjectId(req.params.id) 
    }).toArray();
    
    const noteHistory = await db.collection('NoteHistory').find({ 
      orderId: new ObjectId(req.params.id) 
    })
    .sort({ createdAt: -1 })
    .toArray();
    
    // Enrich components with their documents
    const enrichedComponents = await Promise.all(components.map(async (component) => {
      const compDocuments = await db.collection('Document').find({ 
        componentId: new ObjectId(component._id) 
      }).toArray();
      
      return {
        ...component,
        id: component._id.toString(),
        _id: undefined,
        documents: compDocuments
      };
    }));
    
    await client.close();
    
    const enrichedOrder = {
      ...order,
      id: order._id.toString(),
      _id: undefined,
      documents: documents,
      components: enrichedComponents,
      noteHistory: noteHistory,
      revisionHistory: order.revisionHistory || [],
      reworkComments: order.reworkComments || []
    };
    
    console.log('GET /api/orders/:id - Loaded order from MongoDB:', enrichedOrder.id);
    res.json(enrichedOrder);
  } catch (err) {
    console.error('GET /api/orders/:id error:', err);
    res.status(500).json({ error: 'Fehler beim Laden des Auftrags', details: err.message });
  }
});

// PUT /api/orders/:id - Update order
app.put('/api/orders/:id', async (req, res) => {
  try {
    const { client, db } = await getDB();
    const ordersCollection = db.collection('Order');
    
    console.log('=== PUT /api/orders/:id RECEIVED ===');
    console.log('Order ID:', req.params.id);
    console.log('Documents in request:', req.body.documents);
    
    // Extract allowed fields
    const {
      title, description, clientId, clientName, deadline, costCenter,
      priority, status, estimatedHours, actualHours, assignedTo, notes,
      orderType, subTasks, documents, revisionRequest, revisionComment,
      userId, userName, materialOrderedByWorkshop, materialOrderedByClient,
      materialOrderedByClientConfirmed, materialAvailable, confirmationNote,
      confirmationDate, canEdit
    } = req.body;

    // Get existing order
    const existingOrder = await ordersCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!existingOrder) {
      await client.close();
      return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    }

    let revisionHistory = Array.isArray(existingOrder.revisionHistory) ? existingOrder.revisionHistory : [];
    let reworkComments = Array.isArray(existingOrder.reworkComments) ? existingOrder.reworkComments : [];

    // Handle revision workflows
    let effectiveUserId = userId;
    let effectiveUserName = userName;

    // Case 1: Workshop sends order for revision to client
    if (status === 'revision' && revisionComment && effectiveUserId && effectiveUserName) {
      console.log('Case 1: Workshop revision being processed...');
      revisionHistory.push({
        comment: revisionComment,
        date: new Date().toISOString(),
        userId: effectiveUserId,
        userName: effectiveUserName
      });
    }

    // Case 2: Client sends order back to workshop after revision
    if (status === 'rework' && revisionRequest && effectiveUserId && effectiveUserName) {
      console.log('Case 2: Client rework being processed...');
      reworkComments.push({
        comment: revisionRequest,
        date: new Date().toISOString(),
        userId: effectiveUserId,
        userName: effectiveUserName
      });
    }

    // Build update data
    const updateData = { updatedAt: new Date() };

    // Only add defined fields
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (clientId !== undefined) updateData.clientId = clientId;
    if (clientName !== undefined) updateData.clientName = clientName;
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (costCenter !== undefined) updateData.costCenter = costCenter;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (actualHours !== undefined) updateData.actualHours = actualHours;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (notes !== undefined) updateData.notes = notes;
    if (orderType !== undefined) updateData.orderType = orderType;
    if (subTasks !== undefined) updateData.subTasks = subTasks || [];
    
    // Documents with type field
    if (documents !== undefined) {
      updateData.documents = (documents || []).map(doc => {
        // Determine type based on file extension
        let type = 'unknown';
        if (doc.name) {
          const extension = doc.name.toLowerCase().split('.').pop();
          switch (extension) {
            case 'pdf': type = 'application/pdf'; break;
            case 'stl': type = 'model/stl'; break;
            case 'step':
            case 'stp': type = 'model/step'; break;
            case 'iges':
            case 'igs': type = 'model/iges'; break;
            case 'ipt': type = 'model/inventor'; break;
            case 'dwg': type = 'application/autocad'; break;
            case 'jpg':
            case 'jpeg': type = 'image/jpeg'; break;
            case 'png': type = 'image/png'; break;
            default: type = 'application/octet-stream';
          }
        }
        
        return { ...doc, type: type };
      });
    }
    
    if (materialOrderedByWorkshop !== undefined) updateData.materialOrderedByWorkshop = materialOrderedByWorkshop;
    if (materialOrderedByClient !== undefined) updateData.materialOrderedByClient = materialOrderedByClient;
    if (materialOrderedByClientConfirmed !== undefined) updateData.materialOrderedByClientConfirmed = materialOrderedByClientConfirmed;
    if (materialAvailable !== undefined) updateData.materialAvailable = materialAvailable;
    if (confirmationNote !== undefined) updateData.confirmationNote = confirmationNote;
    if (confirmationDate !== undefined) updateData.confirmationDate = new Date(confirmationDate);
    if (canEdit !== undefined) updateData.canEdit = canEdit;
    
    // Always update history
    updateData.revisionHistory = revisionHistory;
    updateData.reworkComments = reworkComments;

    console.log('PUT /api/orders/:id updateData documents:', updateData.documents?.length || 0);
    
    // Update in MongoDB
    await ordersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    // Get updated order
    const updatedOrder = await ordersCollection.findOne({ _id: new ObjectId(req.params.id) });
    await client.close();
    
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found after update' });
    }

    const responseOrder = convertMongoDoc(updatedOrder);
    console.log('Final response documents:', responseOrder.documents?.length || 0);
    res.json(responseOrder);
  } catch (err) {
    console.error('PUT /api/orders/:id error:', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Auftrags', details: err.message });
  }
});

// POST /api/orders - Create new order
app.post('/api/orders', async (req, res) => {
  try {
    const { client, db } = await getDB();
    const { documents, components, ...orderData } = req.body;
    
    // Generate order number: F-YYMM-X (Year-Month-Sequential)
    const today = new Date();
    const yearMonth = today.toISOString().slice(2, 7).replace('-', ''); // YYMM
    const prefix = orderData.orderType === 'fertigung' ? 'F' : 'S';
    
    // Find highest sequential number for this month
    const yearMonthPattern = `${prefix}-${yearMonth}-`;
    const existingOrders = await db.collection('Order').find({
      orderNumber: { $regex: `^${yearMonthPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` }
    }).toArray();
    
    let nextNumber = 1;
    if (existingOrders.length > 0) {
      const numbers = existingOrders.map(order => {
        const match = order.orderNumber.match(new RegExp(`^${yearMonthPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      }).filter(num => num > 0);
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }
    
    const orderNumber = `${prefix}-${yearMonth}-${nextNumber}`;
    
    // Create new order
    const newOrder = {
      orderNumber: orderNumber,
      title: orderData.title,
      description: orderData.description,
      clientId: orderData.clientId,
      clientName: orderData.clientName,
      deadline: new Date(orderData.deadline),
      costCenter: orderData.costCenter,
      priority: orderData.priority || 'medium',
      status: orderData.status || 'pending',
      estimatedHours: orderData.estimatedHours || 0,
      actualHours: orderData.actualHours || 0,
      assignedTo: orderData.assignedTo || null,
      notes: orderData.notes || '',
      orderType: orderData.orderType,
      subTasks: orderData.subTasks || [],
      documents: documents || [],
      revisionHistory: [],
      reworkComments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('Order').insertOne(newOrder);
    
    // Create documents separately if needed
    if (documents && documents.length > 0) {
      const documentObjects = documents.map(doc => ({
        name: doc.name,
        url: doc.url,
        uploadDate: doc.uploadDate ? new Date(doc.uploadDate) : new Date(),
        orderId: result.insertedId
      }));
      await db.collection('Document').insertMany(documentObjects);
    }
    
    await client.close();
    
    const responseOrder = {
      ...newOrder,
      id: result.insertedId.toString(),
      _id: undefined
    };
    
    console.log('POST /api/orders - Created order:', responseOrder.orderNumber);
    res.json(responseOrder);
  } catch (err) {
    console.error('POST /api/orders error:', err);
    res.status(500).json({ error: 'Fehler beim Anlegen des Auftrags', details: err.message });
  }
});

// DELETE /api/orders/:id - Delete order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { client, db } = await getDB();
    
    // Delete related documents
    await db.collection('Document').deleteMany({ orderId: new ObjectId(req.params.id) });
    
    // Delete related components
    await db.collection('Component').deleteMany({ orderId: new ObjectId(req.params.id) });
    
    // Delete note history
    await db.collection('NoteHistory').deleteMany({ orderId: new ObjectId(req.params.id) });
    
    // Delete order
    const result = await db.collection('Order').deleteOne({ _id: new ObjectId(req.params.id) });
    
    await client.close();
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Order nicht gefunden' });
    }
    
    console.log('DELETE /api/orders/:id - Deleted order:', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/orders/:id error:', err);
    res.status(500).json({ error: 'Fehler beim Löschen des Auftrags', details: err.message });
  }
});

// GET /api/documents/:id - Download document
app.get('/api/documents/:id', async (req, res) => {
  try {
    const { client, db } = await getDB();
    
    // Find document
    let document = await db.collection('Document').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!document) {
      // Try component document
      document = await db.collection('ComponentDocument').findOne({ _id: new ObjectId(req.params.id) });
    }
    
    await client.close();
    
    if (!document) {
      return res.status(404).json({ error: 'Dokument nicht gefunden' });
    }
    
    const filePath = path.join(uploadsDir, path.basename(document.url));
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
    
    res.download(filePath, document.name);
  } catch (err) {
    console.error('GET /api/documents/:id error:', err);
    res.status(500).json({ error: 'Fehler beim Herunterladen der Datei', details: err.message });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'MongoDB Match Werkstatt API is running!', timestamp: new Date().toISOString() });
});

console.log('🚀 MongoDB-only Match Werkstatt Server');
console.log('📁 All data operations use MongoDB directly');
console.log('✅ No Prisma dependencies');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  console.log('✓ Direct MongoDB connection established');
});

module.exports = app;

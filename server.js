require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const helmet = require('helmet');
const WebSocket = require('ws');

const app = express();

// ---------------------
// Environment Variables
// ---------------------
const { MONGO_URI, JWT_SECRET, FRONTEND_URL } = process.env;
const SERVER_PORT = process.env.PORT || 5001;

if (!MONGO_URI) throw new Error('MONGO_URI is not defined in .env');
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined in .env');
if (!FRONTEND_URL) throw new Error('FRONTEND_URL is not defined in .env');

console.log(`[INIT] PORT=${SERVER_PORT}, FRONTEND_URL=${FRONTEND_URL}, MONGO_URI=${MONGO_URI.substring(0, 10)}...`);

// ---------------------
// Middleware
// ---------------------
app.use(helmet());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.url} from ${req.headers.origin}`);
  next();
});

// ---------------------
// CORS
// ---------------------
app.use(cors({
  origin: [
    FRONTEND_URL.replace(/\/$/, ''),
    'https://laundry-frontend-nine.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ---------------------
// MongoDB Connection
// ---------------------
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ---------------------
// Schemas & Models
// ---------------------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slotId: { type: String, required: true },
  machine: { type: String, required: true },
  machineType: { type: String, required: true },
  dayName: { type: String, required: true },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  timestamp: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// ---------------------
// JWT Middleware
// ---------------------
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied. Admins only.' });
  next();
};

// ---------------------
// Routes
// ---------------------
app.get('/', (req, res) => res.send('🚀 Laundry backend is running!'));
app.get('/healthcheck', (req, res) => res.json({ status: 'OK', message: 'Server is alive' }));
app.get('/status', (req, res) => res.json({ status: 'OK', message: 'Server is running' }));

// Register
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid username or password' });

    const token = jwt.sign({ id: user._id, username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, userId: user._id, role: user.role });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Bookings
app.get('/bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id || req.user._id });
    res.json(bookings);
  } catch (err) {
    console.error('Get bookings error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/bookings', verifyToken, async (req, res) => {
  try {
    const { slotId, machine, machineType, dayName, date, timeSlot, timestamp } = req.body;
    if (!slotId || !machine || !machineType || !dayName || !date || !timeSlot || !timestamp) {
      return res.status(400).json({ message: 'All booking fields required' });
    }

    const existing = await Booking.findOne({
      slotId,
      date: new Date(date),
      userId: req.user.id || req.user._id
    });
    if (existing) return res.status(400).json({ message: 'Slot already booked' });

    const booking = new Booking({
      userId: req.user.id || req.user._id,
      slotId,
      machine,
      machineType,
      dayName,
      date: new Date(date),
      timeSlot,
      timestamp,
    });

    const saved = await booking.save();

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'BOOKING_UPDATED', booking: saved }));
    });

    res.json(saved);
  } catch (err) {
    console.error('Create booking error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/bookings/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid booking ID' });

  try {
    const booking = await Booking.findOneAndDelete({ _id: id, userId: req.user.id || req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found or not authorized' });

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'BOOKING_DELETED', bookingId: id }));
    });

    res.json({ message: `Booking ${id} deleted` });
  } catch (err) {
    console.error('Delete booking error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin routes
app.get('/admin/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('Admin get users error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/admin/bookings', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('userId', 'username');
    res.json(bookings);
  } catch (err) {
    console.error('Admin get bookings error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: `User ${req.params.id} deleted` });
  } catch (err) {
    console.error('Admin delete user error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------
// WebSocket Server
// ---------------------
const server = app.listen(SERVER_PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${SERVER_PORT}`);
});

const wss = new WebSocket.Server({ server, path: '/ws' });
wss.on('connection', ws => {
  console.log('🔗 WebSocket client connected');
  ws.send(JSON.stringify({ type: 'WELCOME', message: 'Connected to WebSocket server' }));

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      ws.send(JSON.stringify({ type: 'ECHO', data }));
    } catch {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => console.log('🔌 WebSocket client disconnected'));
  ws.on('error', err => console.error('❌ WebSocket error:', err.message));
});

// ---------------------
// Global Error Handler
// ---------------------
app.use((err, req, res, next) => {
  console.error('❌ Unexpected error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

// ---------------------
// Status Logging
// ---------------------
setInterval(() => {
  console.log(`[STATUS] Server running on port ${SERVER_PORT} at ${new Date().toISOString()}`);
}, 60000);

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })
import { app } from "./app.js";
import { connectDB } from "./src/db/index.js";

const PORT = process.env.PORT || 8000;

connectDB().then(() => {
  app.on("error", (error) => {
    console.log("Error on app", error);
    throw error;
  });

  app.listen(PORT, () => {
    console.log(`app running in PORT ${PORT}`);
  });
})
.catch(error =>{
  console.log("MongoDB connection failed !!!", error)
})


// // Rate limiting for public endpoints
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // 100 requests per window
// });
// const statusLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 200, // More permissive for status checks
// });
// app.use('/register', limiter);
// app.use('/login', limiter);
// app.use('/status', statusLimiter);


// // ---------------------
// // WebSocket Server
// // ---------------------
// const server = app.listen(SERVER_PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${SERVER_PORT}`));
// const wss = new WebSocket.Server({ server, path: '/ws' });

// wss.on('connection', ws => {
//   console.log('🔗 WebSocket client connected');
//   ws.send(JSON.stringify({ type: 'WELCOME', message: 'Connected to WebSocket server' }));
//   ws.on('message', message => {
//     try {
//       const data = JSON.parse(message);
//       ws.send(JSON.stringify({ type: 'ECHO', data }));
//     } catch {
//       ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
//     }
//   });
//   ws.on('close', () => console.log('🔌 WebSocket client disconnected'));
//   ws.on('error', err => console.error('❌ WebSocket error:', err.message));
// });

// // ---------------------
// // JWT Middleware
// // ---------------------
// const verifyToken = (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Invalid token' });
//   const token = authHeader.split(' ')[1];
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     console.error('Invalid token:', err.message);
//     return res.status(401).json({ message: 'Invalid token' });
//   }
// };

// const verifyAdmin = (req, res, next) => {
//   if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied. Admins only.' });
//   next();
// };

// // ---------------------
// // Routes
// // ---------------------
// app.get('/', (req, res) => res.send('🚀 Laundry backend is running!'));

// // Status endpoint for frontend health check
// app.get('/status', (req, res) => {
//   res.json({ status: 'OK', timestamp: new Date().toISOString() });
// });

// // Healthcheck route
// app.get('/healthcheck', (req, res) => res.json({ status: 'OK' }));

// // Register
// app.post('/register', async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
//     if (await User.findOne({ username })) return res.status(400).json({ message: 'User already exists' });
//     const hashedPassword = await bcrypt.hash(password, 10);
//     await new User({ username, password: hashedPassword }).save();
//     res.json({ message: 'User registered successfully' });
//   } catch (err) {
//     console.error('Register error:', err.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // Login
// app.post('/login', async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
//     const user = await User.findOne({ username });
//     if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid username or password' });
//     const token = jwt.sign({ id: user._id.toString(), username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
//     res.json({ token, userId: user._id, role: user.role });
//   } catch (err) {
//     console.error('Login error:', err.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // Get bookings
// app.get('/bookings', verifyToken, async (req, res) => {
//   try {
//     const bookings = await Booking.find().populate('userId', 'username');
//     res.json(bookings);
//   } catch (err) {
//     console.error('Get bookings error:', err.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // Create booking
// app.post('/bookings', verifyToken, async (req, res) => {
//   try {
//     const { slotId, machine, machineType, dayName, date, timeSlot } = req.body;
//     if (!slotId || !machine || !machineType || !dayName || !date || !timeSlot)
//       return res.status(400).json({ message: 'All booking fields required' });
//     const parsedDate = new Date(date);
//     if (isNaN(parsedDate.getTime())) return res.status(400).json({ message: 'Invalid date format' });
//     const existing = await Booking.findOne({ date: parsedDate, machine, timeSlot });
//     if (existing) return res.status(400).json({ message: 'This slot is already booked' });
//     const saved = await new Booking({
//       userId: req.user.id,
//       slotId,
//       machine,
//       machineType,
//       dayName,
//       date: parsedDate,
//       timeSlot,
//     }).save();
//     // Notify WebSocket clients
//     wss.clients.forEach(client => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(JSON.stringify({ type: 'BOOKING_UPDATED', booking: saved }));
//       }
//     });
//     res.json(saved);
//   } catch (err) {
//     console.error('Create booking error:', err.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // Delete booking
// app.delete('/bookings/:id', verifyToken, async (req, res) => {
//   const { id } = req.params;
//   if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid booking ID' });
//   try {
//     const booking = req.user.role === 'admin'
//       ? await Booking.findByIdAndDelete(id)
//       : await Booking.findOneAndDelete({ _id: id, userId: req.user.id });
//     if (!booking) return res.status(404).json({ message: 'Booking not found or not authorized' });
//     wss.clients.forEach(client => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(JSON.stringify({ type: 'BOOKING_DELETED', bookingId: id }));
//       }
//     });
//     res.json({ message: `Booking ${id} deleted` });
//   } catch (err) {
//     console.error('Delete booking error:', err.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // Admin routes
// app.get('/admin/users', verifyToken, verifyAdmin, async (req, res) => {
//   try {
//     res.json(await User.find().select('-password'));
//   } catch (err) {
//     console.error('Admin get users error:', err.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// app.get('/admin/bookings', verifyToken, verifyAdmin, async (req, res) => {
//   try {
//     res.json(await Booking.find().populate('userId', 'username'));
//   } catch (err) {
//     console.error('Admin get bookings error:', err.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// app.delete('/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
//   try {
//     await User.findByIdAndDelete(req.params.id);
//     res.json({ message: `User ${req.params.id} deleted` });
//   } catch (err) {
//     console.error('Admin delete user error:', err.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // Global Error Handler
// app.use((err, req, res, next) => {
//   console.error('❌ Unexpected error:', err.message);
//   res.status(500).json({ message: 'Internal server error' });
// });

// // Status Logging
// setInterval(() => {
//   console.log(`[STATUS] Server running on port ${SERVER_PORT} at ${new Date().toISOString()}`);
// }, 60000);

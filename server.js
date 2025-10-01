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



// const verifyAdmin = (req, res, next) => {
//   if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied. Admins only.' });
//   next();
// };


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

# 🧺 Laundry Booking System – Backend

<p align="center">
  Node.js & Express backend API for managing a Laundry Booking System with real-time scheduling, machine availability, and user reservations.
</p>

<p align="center">
  🔗 <strong>Live Backend:</strong> <a href="#">Coming Soon</a>
</p>

---

## 📌 About The Project

This backend powers a **Laundry Booking System** designed to integrate with a React frontend.  

Users can:
- Book washers and dryers
- View available time slots
- Limit weekly bookings
- Automatically manage dryer bookings after washing

It is built to be **lightweight, modular, and scalable**, making it easy to extend with new features such as notifications, analytics, or authentication.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js    | Backend runtime |
| Express.js | RESTful API framework |
| MongoDB / SQLite | Database for users, machines, and bookings |
| Socket.IO  | Real-time updates for machine availability |
| Node Cron / Scheduler | Automated booking management |
| JavaScript | Core programming language |

---

## 🚀 Features

- RESTful API endpoints for users, bookings, and machines  
- Weekly booking limits per user  
- Automatic dryer booking after washer use  
- Real-time machine availability updates with Socket.IO  
- Easy integration with React frontend  
- Modular code structure for maintainability  

---

## 📂 Project Structure
laundry-backend/
│
├── server.js           # Entry point for the Node.js backend, starts the server
├── package.json        # Node.js project dependencies and scripts
├── .env                # Environment variables (PORT, DB connection)
│
├── config/             # Configuration files
│   └── db.js           # Database connection setup
│
├── routes/             # API route definitions
│   ├── bookings.js     # Routes for booking management
│   ├── machines.js     # Routes for washer/dryer info
│   └── users.js        # Routes for user registration & login
│
├── controllers/        # Business logic / API endpoint handlers
│   ├── bookingController.js
│   ├── machineController.js
│   └── userController.js
│
├── models/             # Database models (schemas)
│   ├── Booking.js
│   ├── Machine.js
│   └── User.js
│
├── middleware/         # Middleware for validation, authentication, errors
│   ├── authMiddleware.js
│   └── errorMiddleware.js
│
├── utils/              # Helper functions
│   └── scheduleHelper.js # Handles automatic dryer booking logic
│
└── README.md           # Project documentation

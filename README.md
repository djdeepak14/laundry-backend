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
├── server.js # Entry point, starts the backend server
├── package.json # Node.js dependencies and scripts
├── .env # Environment variables (PORT, DB_URI)
│
├── config/ # Configuration files
│ └── db.js # Database connection setup
│
├── routes/ # API route definitions
│ ├── bookings.js # Routes for booking management
│ ├── machines.js # Routes for washer/dryer info
│ └── users.js # Routes for user registration & login
│
├── controllers/ # Business logic / endpoint handlers
│ ├── bookingController.js
│ ├── machineController.js
│ └── userController.js
│
├── models/ # Database schemas/models
│ ├── Booking.js
│ ├── Machine.js
│ └── User.js
│
├── middleware/ # Middleware for auth, validation, error handling
│ ├── authMiddleware.js
│ └── errorMiddleware.js
│
├── utils/ # Helper functions
│ └── scheduleHelper.js # Automates dryer booking logic
│
└── README.md # Project documentation


---

## ⚙️ Installation & Setup

1. **Clone the repository**

```bash
git clone https://github.com/djdeepak14/laundry-backend.git

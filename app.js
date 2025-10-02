import dotenv from 'dotenv'
dotenv.config({ path: './.env' })
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))

app.use(express.urlencoded({ extended: true, limit: "16kb" }))

app.use(express.static("public"))

app.use(cookieParser())


import userRouter from "./src/routes/user.routes.js";
import machineRouter from "./src/routes/machine.routes.js";
import bookingRouter from "./src/routes/booking.router.js"; 


app.use("/api/v1/user", userRouter);
app.use("/api/v1/machine", machineRouter);
app.use("/api/v1/booking", bookingRouter);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "everything good" });
});

export { app }
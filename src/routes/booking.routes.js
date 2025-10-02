import { Router } from "express";
import { createBooking, cancelBooking, PastBookings, UpcomingBookings } from "../controllers/booking.controller.js";
const router = Router()


router.route("/")
    .post(createBooking)

router.route("/:id")
    .delete(cancelBooking)

router.route("/past")
    .get(PastBookings)

router.route("/upcoming")
    .get(UpcomingBookings)


export default router
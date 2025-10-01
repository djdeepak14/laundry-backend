
import dotenv from 'dotenv'
dotenv.config({ path: '../.env' })
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.DB_NAME

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`)
        console.log("mongodb connected !! DB HOST: ", connectionInstance.connection.host)
    } catch (error) {
        console.log("MongoDB connection error", error)
        process.exit(1)
    }
}

export { connectDB }
import mongoose from "mongoose";
let isConnected=false;
export const connectDB = async () => {
    if(isConnected) return;
    try {
        await mongoose.connect(process.env.MONGODB_URL!);
        const connection = mongoose.connection;
        connection.on("connected", () => {
            console.log("Connected to MongoDB"); 
            isConnected=true;
        })
        connection.on("error", (error) => {
            console.error("Make sure mongoDB is running:", error);
        })
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};
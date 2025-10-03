import mongoose from "mongoose"
const MONGODB_URI=process.env.MONGODB_URI!;
if(!MONGODB_URI) throw new Error("Please define MONGODB_URI in your environment variables");
 type Cached={
    conn:typeof mongoose|null;
    promise:Promise<typeof mongoose>|null;
 };

 let cached:Cached=(global as any).mongoose;
 if(!cached){
    cached=(global as any).mongoose={conn:null,promise:null};

 }
 const connectDB=async(): Promise<typeof mongoose> =>{
    if(cached.conn) return cached.conn;

    if(!cached.promise){
        cached.promise=mongoose
        .connect(MONGODB_URI)
        .then((mongoose)=>{
            const connection=mongoose.connection;

            connection.once("connected",()=>console.log("MongoDB connected"));
            connection.once("error",(err)=>console.error("MongoDB connection error:",err));
            return mongoose;

        })
        .catch((err)=>{
            cached.promise=null;
            throw err;
        });
    }
    cached.conn=await cached.promise;
    return cached.conn;
 }
 export default connectDB;
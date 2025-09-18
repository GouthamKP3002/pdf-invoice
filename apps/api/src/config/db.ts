import mongoose from "mongoose";

const connectDB = async (mongoURI: string) => {
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;

import mongoose from "mongoose";

export default async function connectDb() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI not set");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });

  console.log("✅ MongoDB connected");
}
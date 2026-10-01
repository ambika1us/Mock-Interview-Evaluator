import mongoose from 'mongoose';
import { env } from '../config/env.js';

let memoryServer = null;

/**
 * Connects to MongoDB.
 * - When MONGODB_URI is provided (e.g. MongoDB Atlas) it connects to that cluster.
 * - Otherwise it boots an embedded, in-memory MongoDB so local/preview runs work
 *   without any external dependency. Data is not persisted in that mode.
 */
export async function connectDb() {
  mongoose.set('strictQuery', true);

  let uri = env.mongoUri;

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: 'mock_interview' },
    });
    uri = memoryServer.getUri('mock_interview');
    console.log('[db] MONGODB_URI not set - started embedded in-memory MongoDB');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`[db] connected to MongoDB (${env.mongoUri ? 'external' : 'in-memory'})`);
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

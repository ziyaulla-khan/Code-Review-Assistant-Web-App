/**
 * MongoDB Database Configuration
 * Connects to MongoDB using Mongoose
 * Falls back to in-memory MongoDB if real DB isn't available
 */
const mongoose = require('mongoose');

const connectDB = async () => {
  let mongoUri = process.env.MONGODB_URI;

  // Check if URI is a real database or a placeholder
  const isPlaceholder = !mongoUri ||
    mongoUri.includes('cluster.mongodb.net') ||
    mongoUri.includes('username:password');

  if (isPlaceholder) {
    console.log('No MongoDB URI configured. Starting in-memory database...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    console.log(`In-memory MongoDB started at: ${mongoUri}`);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

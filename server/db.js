const mongoose = require('mongoose');
const env = require('dotenv');

env.config();

const MONGODB_URI = process.env.MONGODB_URL;
console.log("mongooooo startttting")

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URL environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    };
    console.log("before conneciton",MONGODB_URI,opts)
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Successfully connected to MongoDBbb!');
      return mongoose;
    }).catch((error) => {
      console.error('❌ Error connecting to MongoDB:', error);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ Error connecting to MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

module.exports = connectDB; 
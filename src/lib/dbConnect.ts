import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env'
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    console.log("Using cached database connection.");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("Creating new database connection promise.");
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      console.log("MongoDB Connected successfully.");
      return mongooseInstance;
    }).catch((error) => {
      console.error("Initial MongoDB connection failed:", error);
      cached.promise = null;
      throw error;
    });
  }

  try {
    console.log("Awaiting database connection promise.");
    cached.conn = await cached.promise;
    console.log("Database connection promise resolved.");
  } catch (e) {
    cached.promise = null;
    console.error("Awaiting MongoDB connection promise failed:", e);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;

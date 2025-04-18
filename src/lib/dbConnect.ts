import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
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


let cached = globalThis.mongoose;

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<typeof mongoose> {
  
  if (!cached) {
    
    cached = globalThis.mongoose = { conn: null, promise: null };
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => { 
      console.log("MongoDB Connected");
      return mongooseInstance; 
    }).catch(err => {
        console.error("MongoDB connection error:", err);
        
        if (globalThis.mongoose) {
            globalThis.mongoose.promise = null;
        }
        throw err;
    });
  }
  try {
    
    cached.conn = await cached.promise;
  } catch (e) {
   
    if (globalThis.mongoose) {
        globalThis.mongoose.promise = null;
    }
    throw e;
  }


  return cached.conn;
}

export default dbConnect;

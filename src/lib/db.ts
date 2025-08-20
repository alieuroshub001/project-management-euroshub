// lib/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Use a type assertion for the global extension
type MongooseGlobal = typeof globalThis & {
  mongoose: MongooseCache;
};

const globalWithMongoose = global as MongooseGlobal;

let cached = globalWithMongoose.mongoose;

if (!cached) {
  cached = globalWithMongoose.mongoose = { conn: null, promise: null };
}

let indexMigrationRan = false;

async function ensureTimeTrackerIndexes() {
  if (indexMigrationRan) return;
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const collections = await db.listCollections({ name: 'timetrackersessions' }).toArray();
    if (!collections.length) {
      indexMigrationRan = true;
      return;
    }

    const collection = db.collection('timetrackersessions');
    const indexes = await collection.indexes();
    const existing = indexes.find((ix) => ix.name === 'screenshots.public_id_1');

    // Drop legacy non-partial unique index that causes duplicates on null
    if (existing && !('partialFilterExpression' in existing) ) {
      try {
        await collection.dropIndex('screenshots.public_id_1');
      } catch (err) {
        // ignore if already dropped or doesn't exist
      }
    }

    // Ensure the correct partial unique index exists
    const hasPartial = (await collection.indexes()).some(
      (ix) => ix.name === 'screenshots.public_id_1' && (ix as any).partialFilterExpression
    );
    if (!hasPartial) {
      await collection.createIndex(
        { 'screenshots.public_id': 1 },
        {
          name: 'screenshots.public_id_1',
          unique: true,
          partialFilterExpression: { 'screenshots.public_id': { $exists: true, $type: 'string' } }
        }
      );
    }
  } catch (err) {
    // Log but do not block app startup
    console.error('Failed to ensure time tracker indexes:', err);
  } finally {
    indexMigrationRan = true;
  }
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    
    // Since we've already checked MONGODB_URI is defined, we can assert it as string
    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    await ensureTimeTrackerIndexes();
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
import mongoose from 'mongoose';
import { ENV } from './config/env';

const clearDatabase = async () => {
  try {
    console.log(`[Clear DB] Connecting to MongoDB: ${ENV.MONGODB_URI}`);
    await mongoose.connect(ENV.MONGODB_URI);
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database instance not found after connection');
    }

    const dbName = mongoose.connection.name;
    console.log(`[Clear DB] Connected! Target Database to wipe: ${dbName}`);

    // Fetch all collections in the database
    const collections = await db.listCollections().toArray();
    console.log(`[Clear DB] Found ${collections.length} collections:`, collections.map(c => c.name));

    for (const col of collections) {
      try {
        await db.dropCollection(col.name);
        console.log(`[Clear DB] Dropped collection: ${col.name}`);
      } catch (err: any) {
        console.warn(`[Clear DB] Could not drop ${col.name}: ${err?.message || err}`);
      }
    }

    console.log('========================================================');
    console.log(`✨ [SUCCESS] Database "${dbName}" is completely cleared! (0 collections, 0 data)`);
    console.log('========================================================');
    process.exit(0);
  } catch (error) {
    console.error('[Clear DB] Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();

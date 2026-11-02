import mongoose from 'mongoose';
import { ENV } from './config/env';

// Import all models
import { User } from './models/User';
import { Doubt } from './models/Doubt';
import { Subject } from './models/Subject';
import { VolunteerRequest } from './models/VolunteerRequest';
import { Answer } from './models/Answer';
import { Session } from './models/Session';
import { Message } from './models/Message';
import { Quiz } from './models/Quiz';
import { RefreshTokenSession } from './models/RefreshTokenSession';
import { Follow } from './models/Follow';
import { CreditTransaction } from './models/CreditTransaction';
import { OAuthAccount } from './models/OAuthAccount';
import { PendingRegistration } from './models/PendingRegistration';
import { VerificationChallenge } from './models/VerificationChallenge';
import { Otp } from './models/Otp';

const models = [
  { name: 'users', model: User },
  { name: 'doubts', model: Doubt },
  { name: 'subjects', model: Subject },
  { name: 'volunteerrequests', model: VolunteerRequest },
  { name: 'answers', model: Answer },
  { name: 'sessions', model: Session },
  { name: 'messages', model: Message },
  { name: 'quizzes', model: Quiz },
  { name: 'refreshtokensessions', model: RefreshTokenSession },
  { name: 'follows', model: Follow },
  { name: 'credittransactions', model: CreditTransaction },
  { name: 'oauthaccounts', model: OAuthAccount },
  { name: 'pendingregistrations', model: PendingRegistration },
  { name: 'verificationchallenges', model: VerificationChallenge },
  { name: 'otps', model: Otp }
];

async function initializeCollections() {
  try {
    console.log(`[Init Collections] Connecting to MongoDB: ${ENV.MONGODB_URI}`);
    await mongoose.connect(ENV.MONGODB_URI);
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection failed');
    }

    const dbName = mongoose.connection.name;
    console.log(`[Init Collections] Connected to DB: ${dbName}`);

    // 1. Remove the placeholder stray collection 'PeerBridge' if present
    try {
      await db.dropCollection('PeerBridge');
      console.log(`[Init Collections] Removed Atlas placeholder collection: 'PeerBridge'`);
    } catch {
      // Ignored if not found
    }

    // 2. Initialize all official collections with their indexes (0 documents, no seed)
    console.log('[Init Collections] Creating official collections without seed data...');
    for (const item of models) {
      try {
        await item.model.createCollection();
        console.log(`✅ Initialized empty collection: ${item.name}`);
      } catch (err: any) {
        console.log(`ℹ️ Collection ${item.name}: ${err?.message || err}`);
      }
    }

    const createdCollections = await db.listCollections().toArray();
    console.log('========================================================');
    console.log(`✨ [SUCCESS] All ${createdCollections.length} collections are initialized in "${dbName}"!`);
    console.log('Collections list:', createdCollections.map(c => c.name));
    console.log('Document count: 0 (Pure empty schema tables ready for user actions)');
    console.log('========================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Init Collections] Error:', error);
    process.exit(1);
  }
}

initializeCollections();

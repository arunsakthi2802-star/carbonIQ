import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dns from 'dns';
import { seedDatabase } from '../utils/seeder';

let mongoMemoryInstance: MongoMemoryServer | null = null;
export let isAtlasConnected = false;
export let activeDatabaseType = 'in-memory';

export const connectDB = async (): Promise<void> => {
  // Use public DNS to resolve external SRV records reliably if on restrictive LAN
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (dnsErr: any) {
    console.warn('DNS server configuration note:', dnsErr.message);
  }

  const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
  const uri = rawUri.replace(/^["']|["']$/g, '').trim();

  if (uri && uri !== 'memory' && uri.startsWith('mongodb')) {
    try {
      const sanitizedHost = uri.split('@').pop()?.split('/')[0] || 'remote';
      console.log(`📡 Connecting to MongoDB Atlas cluster at ${sanitizedHost}...`);
      
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      
      isAtlasConnected = true;
      activeDatabaseType = 'MongoDB Atlas Cloud';
      console.log('✅ Successfully connected to MongoDB Atlas Cloud Database!');
      
      // Auto-seed collections if empty
      await seedDatabase(false);
      return;
    } catch (err: any) {
      console.warn(`⚠️  MongoDB Atlas connection failed: ${err.message}`);
      if (err.message.includes('ENOTFOUND') || err.message.includes('querySrv')) {
        console.warn(`ℹ️  Note: If your Atlas cluster was paused due to inactivity, log in to cloud.mongodb.com and click 'Resume'.`);
      }
      console.log('🔄 Falling back to embedded high-performance MongoDB engine to maintain 100% uptime...');
    }
  }

  try {
    console.log('⚙️  Initializing embedded MongoDB Engine...');
    mongoMemoryInstance = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryInstance.getUri();
    await mongoose.connect(memoryUri);
    isAtlasConnected = false;
    activeDatabaseType = 'Embedded MongoMemoryServer';
    console.log(`✅ MongoDB connected successfully (${activeDatabaseType}: ${memoryUri})`);

    // Auto-seed collections and verify schemas
    await seedDatabase(false);
  } catch (error: any) {
    console.error('❌ Fatal error initializing MongoDB database:', error.message);
    throw error;
  }
};

export const closeDB = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongoMemoryInstance) {
    await mongoMemoryInstance.stop();
  }
};

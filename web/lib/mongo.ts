import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) throw new Error("MONGODB_URI is not set");
if (!dbName) throw new Error("MONGODB_DB is not set");

/**
 * A warm serverless invocation reuses module scope, but a cold one does not.
 * Holding the client on globalThis keeps one pool per container instead of one
 * per request — Atlas' free tier caps connections at 500 and a per-request
 * client exhausts that under trivial load.
 */
const cache = globalThis as unknown as { recalfyMongo?: MongoClient };

const client =
  cache.recalfyMongo ??
  new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  });

cache.recalfyMongo = client;

// The driver connects lazily on first operation, so this needs no await.
export const db: Db = client.db(dbName);

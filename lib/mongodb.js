import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "painthouses";

let clientPromise;

if (uri && process.env.NODE_ENV === "development") {
  if (!globalThis.__paintHousesMongoClientPromise) {
    const client = new MongoClient(uri);
    globalThis.__paintHousesMongoClientPromise = client.connect();
  }
  clientPromise = globalThis.__paintHousesMongoClientPromise;
} else if (uri) {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  if (!clientPromise) {
    throw new Error("MONGODB_URI environment variable is required");
  }
  const client = await clientPromise;
  return client.db(dbName);
}

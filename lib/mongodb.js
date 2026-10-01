import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "painthouses";

// Geliştirme modunda HMR her yüklemede modülü yeniden çalıştırdığı için bağlantıyı
// globalThis üzerinde tutarız; production'da da aynı yöntem tek bağlantı sağlar.
const globalForMongo = globalThis;

function connect() {
  const client = new MongoClient(uri);
  const promise = client.connect().catch((error) => {
    // Bağlantı hatası kalıcı olarak önbelleğe alınmasın; sonraki istek yeniden dener.
    if (globalForMongo.__paintHousesMongoClientPromise === promise) {
      globalForMongo.__paintHousesMongoClientPromise = undefined;
    }
    throw error;
  });
  globalForMongo.__paintHousesMongoClientPromise = promise;
  return promise;
}

export async function getDb() {
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }
  const client = await (globalForMongo.__paintHousesMongoClientPromise || connect());
  return client.db(dbName);
}

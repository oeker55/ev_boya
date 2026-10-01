import { getDb } from "./mongodb";
import { jsonError } from "./http";

let indexPromise;

function ensureIndexes(collection) {
  indexPromise ??= collection
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    .catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  return indexPromise;
}

/**
 * Sabit pencereli, MongoDB tabanlı istek sınırlayıcı. Sunucusuz ortamlarda da
 * örnekler arasında paylaşıldığı için bellek içi sayaçlardan güvenilirdir.
 */
export async function consumeRateLimit(key, { limit, windowMs }) {
  const db = await getDb();
  const collection = db.collection("rateLimits");
  await ensureIndexes(collection);

  const now = new Date();
  await collection.deleteOne({ _id: key, expiresAt: { $lte: now } });

  const increment = () =>
    collection.findOneAndUpdate(
      { _id: key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(now.getTime() + windowMs) },
      },
      { upsert: true, returnDocument: "after" }
    );

  let record;
  try {
    record = await increment();
  } catch (error) {
    // Eşzamanlı iki upsert aynı _id ile çakışabilir; ikinci deneme mevcut kaydı artırır.
    if (error?.code !== 11000) throw error;
    record = await increment();
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(record.expiresAt).getTime() - now.getTime()) / 1000)
  );
  return { allowed: record.count <= limit, retryAfterSeconds };
}

/** Sınırlardan biri aşılmışsa 429 yanıtı, aşılmamışsa null döndürür. */
export async function enforceRateLimits(rules) {
  for (const rule of rules) {
    const result = await consumeRateLimit(rule.key, rule);
    if (!result.allowed) {
      return jsonError("Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.", 429, {
        "Retry-After": String(result.retryAfterSeconds),
      });
    }
  }
  return null;
}

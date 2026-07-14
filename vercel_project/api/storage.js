// /api/storage.js
// Claudeアーティファクトの window.storage と同じ get/set/delete のインターフェースを
// Upstash Redis（Vercel Marketplace経由）で再現するサーバーレス関数です。
//
// 必要な環境変数（Vercelダッシュボード → Storage → Upstash連携で自動設定されます）:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { Redis } from "@upstash/redis";

// automaticDeserialization は無効化し、値は常に「文字列」として保存・取得する
// （フロント側は JSON.stringify / JSON.parse を自分で行う前提のため）
const redis = Redis.fromEnv({ automaticDeserialization: false });

function buildKey(key, shared, deviceId) {
  if (!key || typeof key !== "string") {
    throw new Error("key is required");
  }
  if (shared === "true" || shared === true) {
    return `shared:${key}`;
  }
  if (!deviceId) {
    throw new Error("deviceId is required for personal (non-shared) keys");
  }
  return `personal:${deviceId}:${key}`;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { key, shared, deviceId } = req.query;
      const fullKey = buildKey(key, shared, deviceId);
      const value = await redis.get(fullKey);
      if (value === null || value === undefined) {
        return res.status(200).json(null);
      }
      return res.status(200).json({ key, value, shared: shared === "true" });
    }

    if (req.method === "POST") {
      const { key, value, shared, deviceId } = req.body || {};
      const fullKey = buildKey(key, shared, deviceId);
      await redis.set(fullKey, value);
      return res.status(200).json({ key, value, shared: !!shared });
    }

    if (req.method === "DELETE") {
      const { key, shared, deviceId } = req.query;
      const fullKey = buildKey(key, shared, deviceId);
      await redis.del(fullKey);
      return res.status(200).json({ key, deleted: true, shared: shared === "true" });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
}

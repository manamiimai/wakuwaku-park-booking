// /api/admin.js
// 主催者用承認画面のログイン確認と、承認・却下の操作をまとめて行うサーバーレス関数。
// パスワードはサーバー側（環境変数 ADMIN_PASSWORD）で検証するため、
// ブラウザのソースを見てもパスワードは分かりません。
//
// 必要な環境変数（Vercelダッシュボード → Settings → Environment Variables で設定）:
//   ADMIN_PASSWORD  … 主催者用承認画面のパスワード（好きな文字列でOK）

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv({ automaticDeserialization: false });
const BOOKINGS_KEY = "shared:allBookings";

async function readAllBookings() {
  const raw = await redis.get(BOOKINGS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) {
    return res.status(500).json({ error: "ADMIN_PASSWORD が設定されていません（Vercelの環境変数を確認してください）" });
  }

  const { password, action, key } = req.body || {};
  if (password !== configuredPassword) {
    return res.status(401).json({ error: "パスワードが違います" });
  }

  // ログイン確認のみ（パスワードが合っているかだけ知りたい場合）
  if (action === "verify") {
    return res.status(200).json({ ok: true });
  }

  if (action === "approve" || action === "reject") {
    if (!key) {
      return res.status(400).json({ error: "key is required" });
    }
    const allBookings = await readAllBookings();

    if (action === "approve") {
      if (!allBookings[key]) {
        return res.status(404).json({ error: "対象の申請が見つかりません" });
      }
      allBookings[key].status = "approved";
    } else {
      delete allBookings[key];
    }

    await redis.set(BOOKINGS_KEY, JSON.stringify(allBookings));
    return res.status(200).json({ ok: true, allBookings });
  }

  return res.status(400).json({ error: "action must be 'verify', 'approve', or 'reject'" });
}

// /api/blob-upload.js
// ワークショップ内容フォームの画像（画像①・画像②）を Vercel Blob に保存するための
// サーバーレス関数です。ブラウザ側で画像をBase64に変換して送信し、
// ここでファイルとして保存してURLを返します。
//
// 必要な環境変数（Vercelダッシュボード → Storage → Blobストアを作成・接続すると自動設定されます）:
//   BLOB_READ_WRITE_TOKEN

import { put } from "@vercel/blob";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB（リクエスト全体で4.5MBを超えられないため余裕を持たせる）

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { filename, contentType, dataBase64 } = req.body || {};
    if (!filename || !dataBase64) {
      return res.status(400).json({ error: "filename と dataBase64 は必須です" });
    }

    const buffer = Buffer.from(dataBase64, "base64");
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: "画像サイズが大きすぎます（3MB程度までにしてください）" });
    }

    const blob = await put(`workshop-images/${Date.now()}-${filename}`, buffer, {
      access: "public",
      contentType: contentType || "image/jpeg",
      addRandomSuffix: true,
    });

    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "アップロードに失敗しました" });
  }
}

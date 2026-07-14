// /api/blob-upload.js
// ワークショップ内容フォームの画像（画像①・画像②）を Vercel Blob に保存するための
// サーバーレス関数です。ブラウザ側で画像をBase64に変換して送信し、
// ここでファイルとして保存してURLを返します。
//
// 必要な環境変数（Vercelダッシュボード → Storage → Blobストアを作成・接続すると自動設定されます）:
//   BLOB_READ_WRITE_TOKEN

import { put } from "@vercel/blob";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB（リクエスト全体で4.5MBを超えられないため余裕を持たせる）

// ファイル名に使える形に整える（絵文字・記号・スペースなどは除去）
function sanitizeForPath(str, fallback){
  const cleaned = String(str || "")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\s]/g, "")
    .replace(/[^\w\-一-龠々ぁ-んァ-ヶーa-zA-Z0-9]/g, "")
    .slice(0, 24);
  return cleaned || fallback;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { filename, contentType, dataBase64, shopName, label } = req.body || {};
    if (!filename || !dataBase64) {
      return res.status(400).json({ error: "filename と dataBase64 は必須です" });
    }

    const buffer = Buffer.from(dataBase64, "base64");
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: "画像サイズが大きすぎます（3MB程度までにしてください）" });
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const safeShop = sanitizeForPath(shopName, "不明ショップ");
    const safeLabel = sanitizeForPath(label, "画像");
    const safeOriginalName = sanitizeForPath(filename.replace(/\.[^.]+$/, ""), "image");
    const ext = (filename.match(/\.[a-zA-Z0-9]+$/) || [".jpg"])[0];

    const pathname = `workshop-images/${safeShop}_${safeLabel}_${dateStr}_${safeOriginalName}${ext}`;

    const blob = await put(pathname, buffer, {
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

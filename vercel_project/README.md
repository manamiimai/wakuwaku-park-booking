# 夏のよりみち わくわくパーク｜出店申込・日程調整ツール（Vercel版）

Claudeのアーティファクト専用ストレージ（`window.storage`）を、Vercel上でも動くように
**Upstash Redis**（Vercel Marketplace経由）に置き換えたバージョンです。
プロフィール・ワークショップ内容の保存、出店申請・承認、申請状況の共有など、
すべての機能がそのままVercel上で動作します。

## 構成

```
.
├── index.html        … アプリ本体（フロントエンド）
├── api/
│   ├── storage.js     … データの保存・取得・削除を行うサーバーレス関数
│   └── admin.js       … 主催者ログイン確認・承認/却下を行うサーバーレス関数
├── package.json
└── README.md
```

ビルド不要のシンプルな構成です（Next.jsなどのフレームワークは使っていません）。

---

## デプロイ手順

### 1. GitHubにリポジトリを作成してpush

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/<あなたのアカウント>/wakuwaku-park-booking.git
git push -u origin main
```

### 2. Vercelでプロジェクトをインポート

1. [vercel.com](https://vercel.com) にログイン
2. 「Add New...」→「Project」
3. 先ほどのGitHubリポジトリを選択してインポート
4. Framework Preset は **Other** のままでOK（ビルドコマンド不要）
5. まだ「Deploy」は押さず、次のステップでデータベースを接続してから公開します

### 3. Upstash Redis（データベース）を接続する

Vercel KVは終了しており、現在は **Upstash Redis** をMarketplace経由で接続する形が標準です。

1. Vercelのプロジェクト画面 →「Storage」タブ
2. 「Create Database」または「Marketplace Database Provider」から **Upstash** を選択
3. Redisデータベースを新規作成し、今回のプロジェクトに接続（Connect）
4. 接続すると、環境変数 `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` が
   自動的にプロジェクトへ設定されます（自分で入力する必要はありません）

### 4. 主催者用承認画面のパスワードを設定する

1. Vercelのプロジェクト画面 →「Settings」→「Environment Variables」
2. `ADMIN_PASSWORD` という名前で、好きなパスワードを値として追加（例：`wakuwaku2026`）
3. Production／Preview／Development すべてにチェックを入れて保存

このパスワードはサーバー側だけで確認されるので、ブラウザの「ページのソースを表示」等をされても
中身は見えません。設定を忘れると承認画面が使えない（500エラー）ので、必ず設定してください。

### 5. デプロイ

「Deploy」を押せば数十秒で公開されます。発行されたURL（例：`https://wakuwaku-park-booking.vercel.app`）
が、そのまま出店者・主催者に共有するリンクになります。

---

## ローカルで動作確認したい場合

```bash
npm install -g vercel   # 初回のみ
vercel link             # このプロジェクトとVercel上のプロジェクトを紐付け
vercel env pull .env.local   # Upstashの接続情報をローカルに取得
vercel dev               # http://localhost:3000 で起動
```

---

## データの仕組み（参考）

- `api/storage.js` が Claude アーティファクトの `window.storage.get / set` と
  同じ形（`{key, value, shared}`）でやり取りできるように作られています。
- **共有データ**（`shared: true`）：出店申請の状況（`allBookings`）。全員が同じデータを見ます。
  主催者用承認画面もここから動いています。
- **個人データ**（`shared: false`）：プロフィール・ワークショップ内容・搬入申請・自分の申請履歴。
  ブラウザに保存された端末ID（`localStorage`）ごとに分かれて保存されます。
  - ⚠️ 端末やブラウザを変えたり、Cookie／サイトデータを削除すると、個人データは引き継がれません。
    ログイン機能はまだ入っていないためです。必要であれば、次のステップとして
    簡単なパスワード認証などを追加できます。

## 主催者用承認画面について

パスワード保護済みです（`ADMIN_PASSWORD` 環境変数で設定した値）。
「▶ 主催者用 承認画面はこちら」を押すとパスワード入力画面が表示され、正しいパスワードを
入力するまで承認・却下の操作はできません。判定はすべてサーバー側（`api/admin.js`）で行われます。
一度正しいパスワードを入力すると、ブラウザのタブを閉じるまで（`sessionStorage`）は再入力不要です。

パスワードを変更したい場合は、Vercelの環境変数 `ADMIN_PASSWORD` を書き換えて再デプロイしてください。

## 出店説明・ガイドラインPDF、告知画像（Canva）について

- ガイドラインPDFは `index.html` の中にそのまま埋め込んであるので、追加の設定なしで
  「PDFを見る」から開けます。内容を差し替えたい場合は、新しいPDFを作って埋め込み直します。
- 告知画像のCanvaリンク（`https://canva.link/wakuwakuyorimichi`）は、「やることリスト」内の
  「🎨 Canvaを開く」ボタンからそのまま開けます。

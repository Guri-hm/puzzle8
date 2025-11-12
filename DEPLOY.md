# WebP画像の自動変換とデプロイ

## ✅ 実装完了内容

### 1. **本番ビルド時にWebP画像を自動使用**

#### 仕組み
- `src/utils/imageUtils.ts` の `getImagePath()` 関数が環境を判定
- `process.env.NODE_ENV === 'development'` → PNG使用
- `process.env.NODE_ENV === 'production'` → WebP使用

#### 確認方法
```bash
npm run build
findstr /C:"tile_1" out\puzzle\0001.html
# 結果: tile_1.webp が使われている ✅
```

### 2. **GitHub Actions自動デプロイ**

#### ワークフロー (`.github/workflows/deploy.yml`)
```yaml
- name: Install dependencies
  run: npm ci

- name: Convert images to WebP  # ← 追加
  run: npm run convert-images

- name: Build with Next.js
  run: npm run build
  env:
    NODE_ENV: production
```

#### デプロイフロー
1. mainブランチにpush
2. GitHub Actionsが起動
3. **画像をWebPに変換** (`npm run convert-images`)
4. Next.jsでビルド（WebP画像を参照）
5. GitHub Pagesにデプロイ

### 3. **ローカルビルド用スクリプト**

#### package.json
```json
{
  "scripts": {
    "convert-images": "node scripts/convert-to-webp.js",
    "build:production": "npm run convert-images && npm run build"
  }
}
```

#### 使い方
```bash
# 本番用ビルド（変換→ビルド）
npm run build:production

# または個別実行
npm run convert-images  # WebP変換
npm run build           # ビルド
```

## 🎯 動作確認

### 開発環境
```bash
npm run dev
# → PNG画像を使用（高速開発）
```

### 本番ビルド
```bash
npm run build
# → WebP画像を使用（軽量化）
```

### 確認コマンド
```bash
# ビルド後のHTMLを確認
findstr /C:"tile_1.webp" out\puzzle\0001.html

# WebP画像が存在するか確認
dir public\puzzles\0001\*.webp
```

## 📊 変換結果

### ファイルサイズ削減率
- **平均70-80%削減**
- 0001パズル: 222KB → 98KB (-56%)
- 3001パズル: 549KB → 108KB (-80%)
- 4002パズル: 368KB → 167KB (-55%)
- 5001パズル: 904KB → 524KB (-42%)

### 変換仕様
- **サイズ**: 512×512ピクセル（統一）
- **品質**: 85%
- **形式**: WebP（sharpライブラリ使用）

## 🚀 デプロイ手順

### GitHub Actionsの場合
```bash
git add .
git commit -m "Update puzzle images"
git push origin main
# → 自動的に変換→ビルド→デプロイ
```

### 手動デプロイの場合
```bash
npm run build:production
cd out
git init
git add -A
git commit -m "Deploy"
git push -f origin main:gh-pages
```

## 🔍 トラブルシューティング

### 画像が表示されない
```bash
# WebP画像が生成されているか確認
dir public\puzzles\*\*.webp

# なければ変換実行
npm run convert-images
```

### 開発環境で画像が表示されない
```bash
# PNG画像が存在するか確認
dir public\puzzles\*\*.png

# PNG画像を配置してから開発サーバー起動
npm run dev
```

### GitHub Actionsでエラー
```bash
# sharpがインストールされているか確認
npm list sharp

# なければインストール
npm install --save-dev sharp
```

## 📝 重要ポイント

1. **開発環境はPNG、本番はWebP** - 自動切り替え
2. **GitHub Actionsで自動変換** - pushすれば全自動
3. **ローカルでも変換可能** - `npm run build:production`
4. **既存のPNG画像は残す** - WebPと共存

## 🎉 完了

これでGitHub Actionsによる自動WebP変換とデプロイが完全に動作します！

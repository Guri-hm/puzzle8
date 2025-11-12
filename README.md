# Puzzle8

Next.jsで作成したスライディングパズルゲームです。タイルをスライドさせて画像を完成させるクラシックなパズルゲームを、モダンなWebアプリケーションとして実装しています。

## デモ

https://puzzle8.solopg.com/

## 主な機能

- タイマー機能（M:SS形式）
- 手数・ヒント回数のカウント
- A*アルゴリズムによる最適解ヒント
- ローカルストレージでのリーダーボード管理
- レスポンシブデザイン（モバイル・デスクトップ対応）
- タッチ操作・ドラッグ操作対応
- 複数難易度のパズル（3×3から5×5まで）
- シークレットモード（画像非表示でプレイ）
- WebP画像による最適化

## 技術スタック

- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- GitHub Actions (CI/CD)
- GitHub Pages (デプロイ先)

## 開発

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 静的エクスポート
npm run export
```

## パズル追加方法

1. `public/puzzles/` に新しいフォルダを作成（例：`3004`）
   - フォルダ名の先頭数字がパズルサイズを示します（3=3×3, 4=4×4, 5=5×5）
2. 512×512pxのPNG画像を9枚（3×3の場合）配置
   - `tile_1.png` から `tile_9.png`（左上から右下へ、1から順に）
3. `src/data/puzzles.ts` の `PUZZLE_DATA` 配列に追加

```typescript
{
  id: '3004',
  name: 'パズル名',
  description: '説明文',
  isAvailable: true,
  isHidden: false,
  isSecret: false,
  bestTime: null
}
```

4. `npm run convert-images` で自動的にWebP変換
5. Gitにコミット・プッシュで自動デプロイ

## デプロイ

`main`ブランチへのプッシュで、GitHub Actionsが自動的にビルド・デプロイを実行します。

詳細は `DEPLOY.md` を参照してください。

## ライセンス

MIT License

## 作者

Guri-hm

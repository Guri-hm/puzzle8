// 画像パスのユーティリティ関数

/**
 * 画像の拡張子をWebPに変換
 * 開発環境（npm run dev）ではPNG、本番ビルド（npm run build）ではWebPを使用
 */
export function getImagePath(basePath: string): string {
  // 開発環境では元の画像をそのまま使用（開発中の高速化）
  if (process.env.NODE_ENV === 'development') {
    return basePath;
  }
  
  // 本番環境（ビルド時）ではWebPを使用（軽量化）
  return basePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
}

/**
 * パズル画像パスの配列を生成
 */
export function generatePuzzleImagePaths(puzzleId: string, tileCount: number, basePath: string = ''): string[] {
  return Array.from({ length: tileCount }, (_, i) => {
    const path = `${basePath}/puzzles/${puzzleId}/tile_${i + 1}.png`;
    return getImagePath(path);
  });
}

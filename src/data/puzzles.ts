// パズルデータの型定義
export interface PuzzleData {
  id: string
  name: string
  description: string
  isAvailable: boolean // 利用可能かどうか
  isHidden: boolean // パズル一覧に表示しない（URLでのみアクセス可能）
  isSecret: boolean // シークレットモード（画像を隠す）
  bestTime?: number | null
}

// パズル一覧データ
export const PUZZLE_DATA: PuzzleData[] = [
  { 
    id: '0001',
    name: 'デモ用パズル', 
    description: 'デモ用の3×3パズル',
    isAvailable: true,
    isHidden: false,
    isSecret: false,
    bestTime: null
  },
  { 
    id: '3001',
    name: 'かんたんパズル', 
    description: '初心者向けの3×3パズル',
    isAvailable: true,
    isHidden: false,
    isSecret: false,
    bestTime: null
  },
  { 
    id: '4002',
    name: 'チャレンジパズル', 
    description: '中級者向けの4×4パズル',
    isAvailable: true,
    isHidden: false,
    isSecret: false,
    bestTime: null
  },
  { 
    id: '5001',
    name: '上級パズル', 
    description: '上級者向けの5×5パズル',
    isAvailable: true,
    isHidden: false,
    isSecret: false,
    bestTime: null
  },
  { 
    id: '3002',
    name: 'ミステリーパズル', 
    description: '何の画像かは開いてからのお楽しみ！',
    isAvailable: true,
    isHidden: false,
    isSecret: true, // シークレットモード
    bestTime: null
  },
  { 
    id: '3003',
    name: '特別パズル', 
    description: '特別な人だけが挑戦できるパズル',
    isAvailable: true,
    isHidden: true, // 一覧に表示しない（URLでのみアクセス）
    isSecret: true,
    bestTime: null
  },
  { 
    id: '3004',
    name: 'かんたんパズル', 
    description: '初心者向けの3×3パズル',
    isAvailable: true,
    isHidden: false,
    isSecret: false,
    bestTime: null
  },
  { 
    id: '3005',
    name: 'かんたんパズル', 
    description: '初心者向けの3×3パズル',
    isAvailable: true,
    isHidden: false,
    isSecret: true,
    bestTime: null
  },
  // 将来追加予定のパズル（利用不可）
  { 
    id: '6001',
    name: '超上級パズル', 
    description: '6×6の超難関パズル',
    isAvailable: false, // まだ利用不可
    isHidden: false,
    isSecret: false,
    bestTime: null
  },
]

// 利用可能なパズルのみを取得（一覧表示用 - 隠しパズルを除外）
export function getAvailablePuzzles(): PuzzleData[] {
  return PUZZLE_DATA.filter(puzzle => puzzle.isAvailable && !puzzle.isHidden)
}

// パズルIDの配列を取得（generateStaticParams用 - 隠しパズルも含む）
export function getPuzzleIds(): string[] {
  return PUZZLE_DATA.filter(puzzle => puzzle.isAvailable).map(puzzle => puzzle.id)
}

// 特定のパズルデータを取得
export function getPuzzleData(id: string): PuzzleData | undefined {
  return PUZZLE_DATA.find(puzzle => puzzle.id === id)
}

// パズルIDからサイズを判定する関数
export function getPuzzleSize(puzzleId: string): number {
  const firstDigit = parseInt(puzzleId[0])
  return firstDigit >= 3 && firstDigit <= 9 ? firstDigit : 3
}

// サイズから難易度を判定
export function getDifficulty(size: number): string {
  if (size === 3) return 'かんたん'
  if (size === 4) return 'ふつう'
  if (size === 5) return 'むずかしい'
  if (size >= 6) return 'とてもむずかしい'
  return 'かんたん'
}

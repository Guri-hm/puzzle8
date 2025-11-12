import PuzzleGame from '@/components/PuzzleGame'
import { Metadata } from 'next'

// カスタムドメイン使用時は BASE_PATH 不要
// GitHub Pages サブディレクトリ使用時は '/puzzle' を設定
const BASE_PATH = ''

// 利用可能なパズルID一覧
const PUZZLE_IDS = ['0001', '4002', '3001']

// パズルIDからサイズを取得
function getPuzzleSize(puzzleId: string): number {
  const firstDigit = parseInt(puzzleId[0])
  return firstDigit >= 3 && firstDigit <= 9 ? firstDigit : 3
}

export async function generateStaticParams() {
  return PUZZLE_IDS.map((id) => ({
    id: id,
  }))
}

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const size = getPuzzleSize(params.id)
  const tileCount = size * size
  
  return {
    title: `パズル ${params.id} - ${size}×${size}スライドパズル`,
    description: `画像を並べ替える${tileCount}マスパズルゲーム - ID: ${params.id}`,
    openGraph: {
      title: `パズル ${params.id} - ${size}×${size}スライドパズル`,
      description: `画像を並べ替える${tileCount}マスパズルゲーム`,
      type: 'website',
    },
  }
}

export default function PuzzlePage({ params }: Props) {
  const { id } = params
  const size = getPuzzleSize(id)
  const tileCount = size * size

  // 画像パスを生成
  const imagePaths = Array.from({ length: tileCount }, (_, i) => {
    return `${BASE_PATH}/puzzles/${id}/tile_${i + 1}.png`
  })

  return (
    <div>
      <PuzzleGame puzzleId={id} imagePaths={imagePaths} size={size} />
    </div>
  )
}

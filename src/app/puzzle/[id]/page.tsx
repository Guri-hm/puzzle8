import PuzzleGame from '@/components/PuzzleGame'
import { Metadata } from 'next'
import { getPuzzleIds, getPuzzleSize, getPuzzleData } from '@/data/puzzles'
import { generatePuzzleImagePaths } from '@/utils/imageUtils'

// カスタムドメイン使用時は BASE_PATH 不要
// GitHub Pages サブディレクトリ使用時は '/puzzle' を設定
const BASE_PATH = ''

export async function generateStaticParams() {
  return getPuzzleIds().map((id) => ({
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
  const puzzleData = getPuzzleData(id)

  // 画像パスを生成（WebP対応）
  const imagePaths = generatePuzzleImagePaths(id, tileCount, BASE_PATH)

  return (
    <div>
      <PuzzleGame 
        puzzleId={id} 
        imagePaths={imagePaths} 
        size={size}
        isSecret={puzzleData?.isSecret ?? false}
      />
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

// パズルIDからサイズを判定する関数
// 命名規則: [サイズ][連番] 例: 3001 = 3x3の1番目、4001 = 4x4の1番目
function getPuzzleSize(puzzleId: string): number {
  const firstDigit = parseInt(puzzleId[0])
  return firstDigit >= 3 && firstDigit <= 9 ? firstDigit : 3
}

// サイズから難易度を判定
function getDifficulty(size: number): string {
  if (size === 3) return 'かんたん'
  if (size === 4) return 'ふつう'
  if (size === 5) return 'むずかしい'
  if (size >= 6) return 'とてもむずかしい'
  return 'かんたん'
}

// 利用可能なパズルセット（デモ用に増やす）
// puzzleId命名規則: 先頭の数字がグリッドサイズ（3=3x3, 4=4x4, 5=5x5）
const generatePuzzleSets = () => {
  const basePuzzles = [
    { 
      id: '0001',  // 3x3（旧命名規則）
      name: 'デモ用パズル', 
      description: 'デモ用の3×3パズル',
      bestTime: null as number | null
    },
    { 
      id: '3001',  // 3x3の1番目
      name: 'かんたんパズル', 
      description: '初心者向けの3×3パズル',
      bestTime: null as number | null
    },
    { 
      id: '4002',  // 4x4の2番目
      name: 'チャレンジパズル', 
      description: '中級者向けの4×4パズル',
      bestTime: null as number | null
    },
  ]

  // デモ用に同じパズルを複製（実際の画像は0001を使用）
  // const demoPuzzles = []
  // for (let i = 0; i < 20; i++) {
  //   const basePuzzle = basePuzzles[i % basePuzzles.length]
  //   demoPuzzles.push({
  //     ...basePuzzle,
  //     id: basePuzzle.id, // 実際の画像IDは変えない
  //     displayName: `${basePuzzle.name} #${i + 1}`,
  //     displayId: `demo-${i + 1}`
  //   })
  // }

  return basePuzzles
}

const PUZZLE_SETS = generatePuzzleSets()

// パズル情報を取得
function getPuzzleInfo(puzzleId: string) {
  const size = getPuzzleSize(puzzleId)
  const difficulty = getDifficulty(size)
  const tileCount = size * size
  
  return {
    size,
    difficulty,
    tileCount,
    gridSize: `${size}×${size}`
  }
}

// モザイク効果付きプレビュー（遅延ロード対応）
function PuzzlePreview({ puzzleId, size, isVisible }: { puzzleId: string; size: number; isVisible: boolean }) {
  const [revealedTiles, setRevealedTiles] = useState<Set<number>>(new Set())
  const [hasLoaded, setHasLoaded] = useState(false)
  const tiles = Array.from({ length: size * size }, (_, i) => i + 1)

  useEffect(() => {
    if (!isVisible || hasLoaded) return
    
    setHasLoaded(true)
    // ランダムな順序でタイルを表示
    const shuffled = [...tiles].sort(() => Math.random() - 0.5)
    shuffled.forEach((tile, index) => {
      setTimeout(() => {
        setRevealedTiles(prev => new Set([...prev, tile]))
      }, index * 80)
    })
  }, [isVisible, hasLoaded])

  if (!isVisible && !hasLoaded) {
    return (
      <div className="aspect-square bg-slate-800/50 rounded-lg overflow-hidden flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-slate-600">image</span>
      </div>
    )
  }

  return (
    <div className="grid gap-1 aspect-square bg-slate-800/50 rounded-lg overflow-hidden" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
      {tiles.map(tile => (
        <div
          key={tile}
          className={`relative transition-all duration-500 ${
            revealedTiles.has(tile) ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          <img
            src={`/puzzles/${puzzleId}/tile_${tile}.png`}
            alt={`Tile ${tile}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(0)
  const [visiblePuzzles, setVisiblePuzzles] = useState(3) // 初期表示数
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visiblePuzzles < PUZZLE_SETS.length) {
          setVisiblePuzzles(prev => Math.min(prev + 6, PUZZLE_SETS.length))
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [visiblePuzzles])

  const displayedPuzzles = PUZZLE_SETS.slice(0, visiblePuzzles)

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* ヘッダー */}
      <div className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-base sm:text-lg">extension</span>
            </div>
            <h1 className="text-base sm:text-xl font-bold">パズルギャラリー</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* タイトルセクション */}
        <div className="mb-12 sm:mb-16 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            8パズル
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            タイルをスライドさせて、画像を完成させよう
          </p>
        </div>

        {/* パズル選択グリッド */}
        <div className="mb-12">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 sm:mb-6">
            パズルを選択 ({visiblePuzzles} / {PUZZLE_SETS.length})
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {displayedPuzzles.map((puzzle, index) => {
              const info = getPuzzleInfo(puzzle.id)
              const displayName = (puzzle as any).displayName || puzzle.name
              return (
                <div
                  key={(puzzle as any).displayId || puzzle.id}
                  className="transition-all duration-300 hover:scale-105"
                  onMouseEnter={() => setSelectedPuzzle(index)}
                >
                  <Link href={`/puzzle/${puzzle.id}`}>
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-4 sm:p-6 hover:bg-slate-800/70 hover:border-cyan-500/50 transition-all duration-300 group h-full flex flex-col">
                      {/* プレビュー */}
                      <div className="mb-4">
                        <PuzzlePreview puzzleId={puzzle.id} size={info.size} isVisible={index < visiblePuzzles} />
                      </div>

                      {/* 情報 */}
                      <div className="space-y-2 sm:space-y-3 flex-1 flex flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-lg sm:text-xl font-bold truncate">{displayName}</h3>
                          <span className="px-2 sm:px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded-full border border-cyan-500/30 whitespace-nowrap">
                            {info.gridSize} · {info.difficulty}
                          </span>
                        </div>
                        
                        <p className="text-slate-400 text-xs sm:text-sm line-clamp-2">{puzzle.description}</p>

                        {puzzle.bestTime && (
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
                            <span>ベストタイム:</span>
                            <span className="font-mono text-cyan-400">
                              {Math.floor(puzzle.bestTime / 60000)}:{((puzzle.bestTime % 60000) / 1000).toFixed(2).padStart(5, '0')}
                            </span>
                          </div>
                        )}

                        {/* プレイボタン */}
                        <div className="pt-2 mt-auto">
                          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg group-hover:from-cyan-400 group-hover:to-blue-400 transition-all">
                            <span className="font-semibold text-sm sm:text-base">プレイする</span>
                            <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>

          {/* ローディングトリガー */}
          {visiblePuzzles < PUZZLE_SETS.length && (
            <div ref={loadMoreRef} className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <p className="text-slate-400 mt-2">読み込み中...</p>
            </div>
          )}
        </div>

        {/* ルール説明 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16">
          <div className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-xl p-4 sm:p-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <span className="material-symbols-outlined text-2xl sm:text-3xl text-cyan-400">flag</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold mb-2">目標</h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              シャッフルされたタイルを正しい順序に並べ替えて、画像を完成させましょう
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-xl p-4 sm:p-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <span className="material-symbols-outlined text-2xl sm:text-3xl text-blue-400">videogame_asset</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold mb-2">操作方法</h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              タイルをクリックまたはドラッグして、空いているマスに移動させます
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-xl p-4 sm:p-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <span className="material-symbols-outlined text-2xl sm:text-3xl text-purple-400">tips_and_updates</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold mb-2">ヒント機能</h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              困ったときはヒントボタンで次の最適な一手を確認できます
            </p>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="border-t border-slate-700/50 mt-16 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center text-slate-500 text-xs sm:text-sm">
          © 2025 Puzzle Gallery. All rights reserved.
        </div>
      </div>
    </main>
  )
}


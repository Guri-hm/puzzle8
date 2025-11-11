'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

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

// 利用可能なパズルセット
// puzzleId命名規則: 先頭の数字がグリッドサイズ（3=3x3, 4=4x4, 5=5x5）
const PUZZLE_SETS = [
  { 
    id: '3001',  // 3x3の1番目
    name: 'かんたんパズル', 
    description: '初心者向けの3×3パズル',
    bestTime: null as number | null
  },
  { 
    id: '0001',  // 3x3（旧命名規則）
    name: 'クラシックパズル', 
    description: 'デモ用の3×3パズル',
    bestTime: null as number | null
  },
  { 
    id: '4002',  // 4x4の2番目
    name: 'チャレンジパズル', 
    description: '中級者向けの4×4パズル',
    bestTime: null as number | null
  },
]

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

// モザイク効果付きプレビュー
function PuzzlePreview({ puzzleId, size }: { puzzleId: string; size: number }) {
  const [revealedTiles, setRevealedTiles] = useState<Set<number>>(new Set())
  const tiles = Array.from({ length: size * size }, (_, i) => i + 1)

  useEffect(() => {
    // ランダムな順序でタイルを表示
    const shuffled = [...tiles].sort(() => Math.random() - 0.5)
    shuffled.forEach((tile, index) => {
      setTimeout(() => {
        setRevealedTiles(prev => new Set([...prev, tile]))
      }, index * 80)
    })
  }, [])

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
          />
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(0)

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* ヘッダー */}
      <div className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">extension</span>
            </div>
            <h1 className="text-xl font-bold">パズルギャラリー</h1>
          </div>
          <div className="text-sm text-slate-400">
            選択してプレイ
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* タイトルセクション */}
        <div className="mb-16 text-center">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            スライドパズル
          </h2>
          <p className="text-slate-400 text-lg">
            タイルをスライドさせて、画像を完成させよう
          </p>
        </div>

        {/* パズル選択カルーセル */}
        <div className="mb-12">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            ステージを選択
          </h3>
          
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {PUZZLE_SETS.map((puzzle, index) => {
                const info = getPuzzleInfo(puzzle.id)
                return (
                  <div
                    key={puzzle.id}
                    className={`flex-shrink-0 w-80 snap-center transition-all duration-300 ${
                      selectedPuzzle === index ? 'scale-100' : 'scale-95 opacity-60'
                    }`}
                    onMouseEnter={() => setSelectedPuzzle(index)}
                  >
                    <Link href={`/puzzle/${puzzle.id}`}>
                      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 hover:border-cyan-500/50 transition-all duration-300 group">
                        {/* プレビュー */}
                        <div className="mb-4">
                          <PuzzlePreview puzzleId={puzzle.id} size={info.size} />
                        </div>

                        {/* 情報 */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">{puzzle.name}</h3>
                            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded-full border border-cyan-500/30">
                              {info.gridSize} · {info.difficulty}
                            </span>
                          </div>
                          
                          <p className="text-slate-400 text-sm">{puzzle.description}</p>

                          {puzzle.bestTime && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <span>ベストタイム:</span>
                              <span className="font-mono text-cyan-400">
                                {Math.floor(puzzle.bestTime / 60000)}:{((puzzle.bestTime % 60000) / 1000).toFixed(2).padStart(5, '0')}
                              </span>
                            </div>
                          )}

                          {/* プレイボタン */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg group-hover:from-cyan-400 group-hover:to-blue-400 transition-all">
                              <span className="font-semibold">プレイする</span>
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
          </div>
        </div>

        {/* ルール説明 */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-cyan-400">flag</span>
            </div>
            <h3 className="text-lg font-bold mb-2">目標</h3>
            <p className="text-slate-400 text-sm">
              シャッフルされたタイルを正しい順序に並べ替えて、画像を完成させましょう
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-blue-400">videogame_asset</span>
            </div>
            <h3 className="text-lg font-bold mb-2">操作方法</h3>
            <p className="text-slate-400 text-sm">
              タイルをクリックまたはドラッグして、空いているマスに移動させます
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-purple-400">tips_and_updates</span>
            </div>
            <h3 className="text-lg font-bold mb-2">ヒント機能</h3>
            <p className="text-slate-400 text-sm">
              困ったときはヒントボタンで次の最適な一手を確認できます
            </p>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="border-t border-slate-700/50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-slate-500 text-sm">
          © 2025 Puzzle Gallery. All rights reserved.
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  )
}


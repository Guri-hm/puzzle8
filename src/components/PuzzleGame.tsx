'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

interface PuzzleGameProps {
  puzzleId: string
  imagePaths: string[]
  size: number
}

interface LeaderboardEntry {
  time: number
  moves: number
  hints: number
  date: string
}

// 隣接マップを動的に生成
function generateNeighbors(size: number): { [key: number]: number[] } {
  const neighbors: { [key: number]: number[] } = {}
  const total = size * size

  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / size)
    const col = i % size
    const adj: number[] = []

    if (col > 0) adj.push(i - 1) // 左
    if (col < size - 1) adj.push(i + 1) // 右
    if (row > 0) adj.push(i - size) // 上
    if (row < size - 1) adj.push(i + size) // 下

    neighbors[i] = adj
  }

  return neighbors
}

// 逆順の数を数える（解法存在チェック用）
function countInversions(arr: number[], empty: number): number {
  let inversions = 0
  const filtered = arr.filter(x => x !== empty)
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      if (filtered[i] > filtered[j]) {
        inversions++
      }
    }
  }
  return inversions
}

// 解法が存在するか
function isSolvable(arr: number[], empty: number, size: number): boolean {
  const inversions = countInversions(arr, empty)
  
  if (size % 2 === 1) {
    // 奇数サイズ: 逆順が偶数なら解ける
    return inversions % 2 === 0
  } else {
    // 偶数サイズ: 空白の行位置も考慮
    const emptyRow = Math.floor(arr.indexOf(empty) / size)
    const emptyFromBottom = size - emptyRow
    return (inversions + emptyFromBottom) % 2 === 1
  }
}

export default function PuzzleGame({ puzzleId, imagePaths, size }: PuzzleGameProps) {
  const EMPTY = size * size
  const neighbors = useMemo(() => generateNeighbors(size), [size])

  // 初期シャッフル済み状態を生成
  const generateInitialState = useCallback(() => {
    let current = Array.from({ length: size * size }, (_, i) => i + 1)
    current[size * size - 1] = EMPTY
    let emptyIdx = current.indexOf(EMPTY)

    for (let i = 0; i < 200; i++) {
      const moveOptions = neighbors[emptyIdx] || []
      const randomIdx = moveOptions[Math.floor(Math.random() * moveOptions.length)]
      const temp = current[emptyIdx]
      current[emptyIdx] = current[randomIdx]
      current[randomIdx] = temp
      emptyIdx = randomIdx
    }

    return { state: current, emptyPos: emptyIdx }
  }, [EMPTY, neighbors, size])

  // 完成状態から開始（hydration対策）
  const [state, setState] = useState<number[]>(() => 
    Array.from({ length: size * size }, (_, i) => i + 1)
  )
  const [initialState, setInitialState] = useState<number[]>(() => 
    Array.from({ length: size * size }, (_, i) => i + 1)
  )
  const [emptyPos, setEmptyPos] = useState(() => EMPTY)
  const [moves, setMoves] = useState(0)
  const [hints, setHints] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isBlurred, setIsBlurred] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const [hintArrow, setHintArrow] = useState<{ pos: number; direction: string } | null>(null)
  const [isWon, setIsWon] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [draggedTile, setDraggedTile] = useState<number | null>(null)
  const [animatingTiles, setAnimatingTiles] = useState<Set<number>>(new Set())
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // クライアントサイドでのみ初期シャッフルを実行（hydration対策）
  useEffect(() => {
    const initialShuffle = generateInitialState()
    setState(initialShuffle.state)
    setInitialState(initialShuffle.state)
    setEmptyPos(initialShuffle.emptyPos)
  }, [generateInitialState])

  // タイマー更新
  useEffect(() => {
    if (!startTime || isWon || !isStarted) return
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 100)
    return () => clearInterval(timer)
  }, [startTime, isWon, isStarted])

  // リーダーボード読み込み
  useEffect(() => {
    const saved = localStorage.getItem(`puzzle-${puzzleId}-leaderboard`)
    if (saved) {
      setLeaderboard(JSON.parse(saved))
    }
  }, [puzzleId])

  // 勝利判定
  useEffect(() => {
    const isWinning = state.every((val, idx) => val === idx + 1)
    if (isWinning && moves > 0 && !isWon) {
      setIsWon(true)
      const entry: LeaderboardEntry = {
        time: elapsedTime,
        moves,
        hints,
        date: new Date().toISOString(),
      }
      const newLeaderboard = [...leaderboard, entry]
        .sort((a, b) => a.time - b.time)
        .slice(0, 10)
      setLeaderboard(newLeaderboard)
      localStorage.setItem(`puzzle-${puzzleId}-leaderboard`, JSON.stringify(newLeaderboard))
      showCongratulations()
    }
  }, [state, moves, isWon, elapsedTime, hints, leaderboard, puzzleId])

  const showCongratulations = () => {
    // 紙吹雪アニメーション
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div')
        confetti.className = 'confetti'
        confetti.style.left = Math.random() * 100 + '%'
        confetti.style.background = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f'][
          Math.floor(Math.random() * 6)
        ]
        document.body.appendChild(confetti)
        setTimeout(() => confetti.remove(), 3000)
      }, i * 50)
    }
  }

  // 転倒数を計算（空マスを除外）- 不要（上で定義済み）
  // const countInversions = (arr: number[]): number => {
  //   const filtered = arr.filter((num) => num !== EMPTY)
  //   let inversions = 0
  //   for (let i = 0; i < filtered.length; i++) {
  //     for (let j = i + 1; j < filtered.length; j++) {
  //       if (filtered[i] > filtered[j]) {
  //         inversions++
  //       }
  //     }
  //   }
  //   return inversions
  // }

  // 解法可能かチェック（転倒数が偶数なら解法可能）- 不要（上で定義済み）
  // const isSolvable = (arr: number[]): boolean => {
  //   return countInversions(arr) % 2 === 0
  // }

  // シャッフル実行（内部関数）
  const performShuffle = () => {
    let current = Array.from({ length: size * size }, (_, i) => i + 1)
    current[size * size - 1] = EMPTY
    let emptyIdx = current.indexOf(EMPTY) // 0-indexed位置

    // ランダムに200回移動してシャッフル
    // 有効な移動のみを行うため、転倒数の偶奇が変わらず、必ず解ける
    for (let i = 0; i < 200; i++) {
      const moveOptions = neighbors[emptyIdx] || []
      const randomIdx = moveOptions[Math.floor(Math.random() * moveOptions.length)]
      
      // タイルを交換
      const temp = current[emptyIdx]
      current[emptyIdx] = current[randomIdx]
      current[randomIdx] = temp
      emptyIdx = randomIdx
    }

    setState(current)
    setInitialState([...current])
    setEmptyPos(emptyIdx)
  }

  // シャッフルボタン
  const shuffle = useCallback(() => {
    performShuffle()
    setMoves(0)
    setHints(0)
    setStartTime(null)
    setElapsedTime(0)
    setIsBlurred(true)
    setIsStarted(false)
    setHintArrow(null)
    setIsWon(false)
  }, [])

  // 開始ボタン
  const handleStart = () => {
    setIsBlurred(false)
    setIsStarted(true)
    setStartTime(Date.now())
  }

  // やり直しボタン（配置のみ初期状態に戻す。タイマー・手数・ヒントは継続）
  const handleRestart = () => {
    setState([...initialState])
    setEmptyPos(initialState.indexOf(EMPTY))
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
    setHintArrow(null)
  }

  // タイル移動処理（アニメーション付き）
  const moveTile = (tileNum: number) => {
    const tileIdx = state.indexOf(tileNum)
    const emptyIdx = state.indexOf(EMPTY)

    // アニメーション中フラグを立てる
    setAnimatingTiles(prev => new Set(prev).add(tileNum))

    const newState = [...state]
    newState[tileIdx] = EMPTY
    newState[emptyIdx] = tileNum

    setState(newState)
    setEmptyPos(tileNum)
    setMoves(prev => prev + 1)

    // アニメーション完了後にフラグを解除
    setTimeout(() => {
      setAnimatingTiles(prev => {
        const next = new Set(prev)
        next.delete(tileNum)
        return next
      })
    }, 200) // CSSのtransition時間と一致
  }

  // タイルクリック（タイル自体をクリックして空マスに移動）
  const handleTileClickDirect = (tileNum: number) => {
    if (isWon || tileNum === EMPTY || !isStarted || animatingTiles.size > 0) return

    // タイルの位置を取得
    const tileIdx = state.indexOf(tileNum)
    const emptyIdx = state.indexOf(EMPTY)

    const tileRow = Math.floor(tileIdx / size)
    const tileCol = tileIdx % size
    const emptyRow = Math.floor(emptyIdx / size)
    const emptyCol = emptyIdx % size

    // 隣接チェック（上下左右のみ）
    const isAdjacent =
      (Math.abs(tileRow - emptyRow) === 1 && tileCol === emptyCol) ||
      (Math.abs(tileCol - emptyCol) === 1 && tileRow === emptyRow)

    if (!isAdjacent) return

    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
    setHintArrow(null)

    moveTile(tileNum)
  }

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, tileNum: number) => {
    if (isWon || tileNum === EMPTY || !isStarted) {
      e.preventDefault()
      return
    }
    setDraggedTile(tileNum)
    e.dataTransfer.effectAllowed = 'move'
  }

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent, tileNum: number) => {
    if (tileNum === EMPTY && draggedTile !== null) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  // ドロップ
  const handleDrop = (e: React.DragEvent, targetTileNum: number) => {
    e.preventDefault()
    if (draggedTile === null || targetTileNum !== EMPTY || animatingTiles.size > 0) return

    // ドラッグされたタイルと空マスが隣接しているか確認
    const tileIdx = state.indexOf(draggedTile)
    const emptyIdx = state.indexOf(EMPTY)

    const tileRow = Math.floor(tileIdx / size)
    const tileCol = tileIdx % size
    const emptyRow = Math.floor(emptyIdx / size)
    const emptyCol = emptyIdx % size

    const isAdjacent =
      (Math.abs(tileRow - emptyRow) === 1 && tileCol === emptyCol) ||
      (Math.abs(tileCol - emptyCol) === 1 && tileRow === emptyRow)

    if (isAdjacent) {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }
      setHintArrow(null)

      moveTile(draggedTile)
    }

    setDraggedTile(null)
  }

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedTile(null)
  }

  // ヒント計算（A*アルゴリズム）- script.jsに準拠
  const getHint = () => {
    const target = Array.from({ length: size * size }, (_, i) => i + 1)
    
    const startKey = state.join(',')
    const goalKey = target.join(',')
    
    if (startKey === goalKey) return

    // マンハッタン距離のヒューリスティック関数
    const manhattan = (s: number[]): number => {
      let h = 0
      for (let i = 0; i < s.length; i++) {
        const v = s[i]
        if (v === EMPTY) continue
        const goalIdx = v - 1 // タイルnは位置n-1が正解
        const r1 = Math.floor(i / size)
        const c1 = i % size
        const r2 = Math.floor(goalIdx / size)
        const c2 = goalIdx % size
        h += Math.abs(r1 - r2) + Math.abs(c1 - c2)
      }
      return h
    }

    interface Node {
      key: string
      state: number[]
      f: number
      g: number
    }

    interface ParentInfo {
      prevKey: string | null
      movedFrom: number | null // 移動元の位置インデックス（0-8）
    }

    const open: Node[] = []
    const gScore = new Map<string, number>()
    const parent = new Map<string, ParentInfo>()
    const closed = new Set<string>()

    const startH = manhattan(state)
    open.push({
      key: startKey,
      state: [...state],
      f: startH,
      g: 0,
    })
    gScore.set(startKey, 0)
    parent.set(startKey, { prevKey: null, movedFrom: null })

    const maxNodes = 100000
    let explored = 0

    while (open.length > 0 && explored < maxNodes) {
      // f値が最小のノードを選択
      let bestIdx = 0
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestIdx].f) bestIdx = i
      }
      const current = open.splice(bestIdx, 1)[0]
      explored++

      if (current.key === goalKey) {
        // ゴールに到達したので、最初の移動位置インデックスを取得
        let curKey = current.key
        let info = parent.get(curKey)!
        let firstMoveIndex = info.movedFrom

        // スタートの直後の手を見つける
        while (parent.get(curKey) && parent.get(curKey)!.prevKey !== startKey) {
          curKey = parent.get(curKey)!.prevKey!
          info = parent.get(curKey)!
          firstMoveIndex = info.movedFrom
        }

        if (firstMoveIndex !== null) {
          showHintArrowByIndex(firstMoveIndex)
        }
        return
      }

      closed.add(current.key)

      // 隣接する移動可能な位置を展開
      const emptyIdx = current.state.indexOf(EMPTY)
      const moveOptions = neighbors[emptyIdx] || [] // 0-indexed

      for (const nextIdx of moveOptions) {
        const newState = [...current.state]
        newState[emptyIdx] = current.state[nextIdx]
        newState[nextIdx] = EMPTY

        const nextKey = newState.join(',')
        if (closed.has(nextKey)) continue

        const tentativeG = current.g + 1
        const prevG = gScore.get(nextKey)

        if (prevG === undefined || tentativeG < prevG) {
          gScore.set(nextKey, tentativeG)
          parent.set(nextKey, { prevKey: current.key, movedFrom: nextIdx }) // 移動元の位置インデックス
          const h = manhattan(newState)
          const f = tentativeG + h

          open.push({
            key: nextKey,
            state: newState,
            f: f,
            g: tentativeG,
          })
        }
      }
    }

    console.warn('A* not found (explored:', explored, ')')
  }

  const showHintArrowByIndex = (fromIndex: number) => {
    const emptyIdx = state.indexOf(EMPTY)
    
    // 位置の差分から矢印を決定（動的サイズ対応）
    const delta = emptyIdx - fromIndex
    let direction = '→'
    if (delta === 1) direction = '→'
    else if (delta === -1) direction = '←'
    else if (delta === size) direction = '↓'
    else if (delta === -size) direction = '↑'

    const tileNum = state[fromIndex]
    
    // 既存のタイマーをクリア
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
    }
    
    setHintArrow({ pos: tileNum, direction })
    setHints(hints + 1)
    
    // 新しいタイマーをセット
    hintTimeoutRef.current = setTimeout(() => {
      setHintArrow(null)
      hintTimeoutRef.current = null
    }, 3000) // 3秒間表示
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    const millis = Math.floor((ms % 1000) / 10)
    return `${minutes}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">スライドパズル</h1>
          <div className="flex justify-center gap-8 text-lg mb-4">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xl">timer</span>
              {formatTime(elapsedTime)}
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xl">footprints</span>
              {moves} 手
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xl">lightbulb</span>
              {hints} ヒント
            </div>
          </div>
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={shuffle}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-bold transition"
            >
              シャッフル
            </button>
            <button
              onClick={handleStart}
              disabled={isStarted}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              開始
            </button>
            <button
              onClick={handleRestart}
              disabled={!isStarted}
              className="bg-orange-600 hover:bg-orange-700 px-6 py-2 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              やり直し
            </button>
            <button
              onClick={getHint}
              disabled={isWon || !isStarted}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ヒント
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* 見本ボード */}
          <div className="flex-shrink-0">
            <h2 className="text-xl font-bold mb-4 text-center">見本</h2>
            <div className="puzzle-grid puzzle-grid-sample mx-auto" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
              {Array.from({ length: size * size }, (_, i) => i + 1).map((tileNum, idx) => (
                <div
                  key={idx}
                  className={`puzzle-tile puzzle-tile-sample ${tileNum === EMPTY ? 'empty' : ''}`}
                >
                  {tileNum !== EMPTY && (
                    <>
                      <img src={imagePaths[tileNum - 1]} alt={`Tile ${tileNum}`} />
                      <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                        {tileNum}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ゲームボード */}
          <div className="flex-shrink-0">
            <h2 className="text-xl font-bold mb-4 text-center">プレイ</h2>
            <div className="puzzle-grid mx-auto" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
              {state.map((tileNum, idx) => {
                const row = Math.floor(idx / size) + 1
                const col = (idx % size) + 1
                return (
                  <div
                    key={tileNum}
                    className={`puzzle-tile ${tileNum === EMPTY ? 'empty' : ''} ${
                      isBlurred && tileNum !== EMPTY ? 'blurred' : ''
                    }`}
                    style={{
                      gridArea: `${row} / ${col} / ${row + 1} / ${col + 1}`,
                    }}
                    onClick={() => handleTileClickDirect(tileNum)}
                    draggable={tileNum !== EMPTY && isStarted && !isWon}
                    onDragStart={(e) => handleDragStart(e, tileNum)}
                    onDragOver={(e) => handleDragOver(e, tileNum)}
                    onDrop={(e) => handleDrop(e, tileNum)}
                    onDragEnd={handleDragEnd}
                  >
                    {tileNum !== EMPTY && (
                      <>
                        <img src={imagePaths[tileNum - 1]} alt={`Tile ${tileNum}`} />
                        <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                          {tileNum}
                        </div>
                      </>
                    )}
                    {hintArrow && hintArrow.pos === tileNum && (
                      <div className="hint-arrow">{hintArrow.direction}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* リーダーボード */}
          <div className="flex-1 max-w-md">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-yellow-400">emoji_events</span>
              リーダーボード
            </h2>
            {leaderboard.length === 0 ? (
              <p className="text-gray-400">まだ記録がありません</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800 p-3 rounded-lg flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-yellow-400">#{idx + 1}</span>
                      <div>
                        <div className="font-bold">{formatTime(entry.time)}</div>
                        <div className="text-sm text-gray-400">
                          {entry.moves}手 / {entry.hints}ヒント
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.date).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 勝利モーダル */}
      {isWon && (
        <div className="congratulations">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="material-symbols-outlined text-5xl text-yellow-400">celebration</span>
            <h2 className="text-3xl font-bold">おめでとうございます！</h2>
          </div>
          <p className="text-xl mb-2">タイム: {formatTime(elapsedTime)}</p>
          <p className="text-lg mb-2">手数: {moves}</p>
          <p className="text-lg mb-4">ヒント: {hints}</p>
          <button
            onClick={shuffle}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-bold transition"
          >
            もう一度プレイ
          </button>
        </div>
      )}
    </div>
  )
}

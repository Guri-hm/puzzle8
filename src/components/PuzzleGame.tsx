'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

interface PuzzleGameProps {
  puzzleId: string
  imagePaths: string[]
  size: number
  isSecret: boolean // シークレットモード
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

export default function PuzzleGame({ puzzleId, imagePaths, size, isSecret }: PuzzleGameProps) {
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
  const [emptyPos, setEmptyPos] = useState(() => size * size - 1) // 完成状態では最後の位置
  const [moves, setMoves] = useState(0)
  const [hints, setHints] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isStarted, setIsStarted] = useState(false)
  const [hasStartedOnce, setHasStartedOnce] = useState(false) // 一度でも開始したか
  const [hintArrow, setHintArrow] = useState<{ pos: number; direction: string } | null>(null)
  const [isWon, setIsWon] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [draggedTile, setDraggedTile] = useState<number | null>(null)
  const [animatingTiles, setAnimatingTiles] = useState<Set<number>>(new Set())
  const [showSample, setShowSample] = useState(false) // 見本ボードの表示状態（モバイル用）
  const [draggingTile, setDraggingTile] = useState<{ tileNum: number; x: number; y: number } | null>(null) // ドラッグ中のタイル位置
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; tileNum: number; direction: 'horizontal' | 'vertical' | null } | null>(null) // タッチ開始位置と許可方向
  const [isShuffling, setIsShuffling] = useState(false) // シャッフル中フラグ
  const [shuffleAnimations, setShuffleAnimations] = useState<Map<number, { fromRow: number; fromCol: number; toRow: number; toCol: number }>>(new Map()) // シャッフルアニメーション情報
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 初期状態は完成画像のまま（シャッフルしない）
  // シャッフルは「シャッフルして開始」ボタンを押した時のみ実行

  // タイマー更新（表示用のみ、1秒ごと）
  useEffect(() => {
    if (!startTime || isWon || !isStarted) return
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 1000)
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
    if (isWinning && moves > 0 && !isWon && startTime) {
      // 勝利時の正確な時間を計算
      const finalTime = Date.now() - startTime
      setElapsedTime(finalTime)
      setIsWon(true)
      
      const entry: LeaderboardEntry = {
        time: finalTime,
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
  }, [state, moves, isWon, startTime, hints, leaderboard, puzzleId])

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

  // シャッフル実行（内部関数・結果を一斉にアニメーション）
  const performShuffle = async () => {
    setIsShuffling(true)
    
    // シャッフル前の状態を保存
    const beforeState = Array.from({ length: size * size }, (_, i) => i + 1)
    
    let current = Array.from({ length: size * size }, (_, i) => i + 1)
    current[size * size - 1] = EMPTY
    let emptyIdx = current.indexOf(EMPTY)

    // シャッフルを一気に実行（演出なし）
    for (let i = 0; i < 200; i++) {
      const moveOptions = neighbors[emptyIdx] || []
      const randomIdx = moveOptions[Math.floor(Math.random() * moveOptions.length)]
      
      const temp = current[emptyIdx]
      current[emptyIdx] = current[randomIdx]
      current[randomIdx] = temp
      emptyIdx = randomIdx
    }

    // シャッフル後の状態
    const afterState = [...current]
    
    // 各タイルの移動情報を計算
    const animations = new Map<number, { fromRow: number; fromCol: number; toRow: number; toCol: number }>()
    
    for (let i = 0; i < afterState.length; i++) {
      const tileNum = afterState[i]
      if (tileNum === EMPTY) continue
      
      // このタイルがシャッフル前にどこにあったか
      const beforeIdx = beforeState.indexOf(tileNum)
      const afterIdx = i
      
      // 位置が変わったタイルのみアニメーション
      if (beforeIdx !== afterIdx) {
        const fromRow = Math.floor(beforeIdx / size)
        const fromCol = beforeIdx % size
        const toRow = Math.floor(afterIdx / size)
        const toCol = afterIdx % size
        
        animations.set(tileNum, { fromRow, fromCol, toRow, toCol })
      }
    }
    
    // アニメーション情報を設定
    setShuffleAnimations(animations)
    setAnimatingTiles(new Set(animations.keys()))
    
    // 状態を更新（シャッフル後の状態にする）
    setState(afterState)
    setEmptyPos(emptyIdx)
    setInitialState([...afterState])
    
    // アニメーション時間を待つ（0.5秒）
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // アニメーション情報をクリア
    setShuffleAnimations(new Map())
    setAnimatingTiles(new Set())
    setIsShuffling(false)
  }

  // シャッフルボタン（開始も兼ねる）
  const shuffle = useCallback(async () => {
    if (isShuffling) return
    
    setMoves(0)
    setHints(0)
    setElapsedTime(0)
    setHintArrow(null)
    setIsWon(false)
    setIsStarted(true)
    setHasStartedOnce(true)
    setStartTime(null) // タイマーをリセット
    
    // シャッフルアニメーションを実行
    await performShuffle()
    
    // アニメーション完了後にタイマー開始（操作可能になってから）
    setStartTime(Date.now())
  }, [neighbors, size, isShuffling])

  // 位置リセットボタン（配置のみ初期状態に戻す。タイマー・手数・ヒントは継続）
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
    if (isWon || tileNum === EMPTY || !isStarted || animatingTiles.size > 0 || isShuffling) return

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
    if (isWon || tileNum === EMPTY || !isStarted || isShuffling) {
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
    setDraggingTile(null)
  }

  // タッチ開始
  const handleTouchStart = (e: React.TouchEvent, tileNum: number) => {
    if (isWon || tileNum === EMPTY || !isStarted || animatingTiles.size > 0 || isShuffling) return
    
    const touch = e.touches[0]
    
    // タイルと空マスの位置関係を確認して、移動可能な方向を判定
    const tileIdx = state.indexOf(tileNum)
    const emptyIdx = state.indexOf(EMPTY)
    
    const tileRow = Math.floor(tileIdx / size)
    const tileCol = tileIdx % size
    const emptyRow = Math.floor(emptyIdx / size)
    const emptyCol = emptyIdx % size
    
    let allowedDirection: 'horizontal' | 'vertical' | null = null
    
    // 横方向に隣接している場合
    if (tileRow === emptyRow && Math.abs(tileCol - emptyCol) === 1) {
      allowedDirection = 'horizontal'
    }
    // 縦方向に隣接している場合
    else if (tileCol === emptyCol && Math.abs(tileRow - emptyRow) === 1) {
      allowedDirection = 'vertical'
    }
    
    setTouchStart({ x: touch.clientX, y: touch.clientY, tileNum, direction: allowedDirection })
    
    // 画面のスクロールを防止
    e.preventDefault()
  }

  // タッチ移動
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    
    // タイルと空マスの位置情報を取得
    const tileIdx = state.indexOf(touchStart.tileNum)
    const emptyIdx = state.indexOf(EMPTY)
    
    const tileRow = Math.floor(tileIdx / size)
    const tileCol = tileIdx % size
    const emptyRow = Math.floor(emptyIdx / size)
    const emptyCol = emptyIdx % size
    
    // 移動可能な方向のみに制限し、ボード内に収める（緩やかな制限）
    let constrainedX = 0
    let constrainedY = 0
    
    if (touchStart.direction === 'horizontal') {
      // 横方向のみ許可
      const maxDistance = Math.abs(emptyCol - tileCol) // タイル何個分離れているか
      
      // グリッド全体の幅を取得（親要素から）
      const gridElement = (e.target as HTMLElement).closest('.puzzle-grid-play')
      if (gridElement) {
        const gridWidth = gridElement.getBoundingClientRect().width
        const tileWidth = gridWidth / size
        const maxPixels = maxDistance * tileWidth
        
        // 空マスの方向に応じて制限
        if (emptyCol > tileCol) {
          // 右に空マスがある → 右方向のみ許可
          constrainedX = Math.max(0, Math.min(deltaX, maxPixels))
        } else {
          // 左に空マスがある → 左方向のみ許可
          constrainedX = Math.min(0, Math.max(deltaX, -maxPixels))
        }
      } else {
        constrainedX = deltaX // フォールバック
      }
      constrainedY = 0
    } else if (touchStart.direction === 'vertical') {
      // 縦方向のみ許可
      const maxDistance = Math.abs(emptyRow - tileRow)
      
      const gridElement = (e.target as HTMLElement).closest('.puzzle-grid-play')
      if (gridElement) {
        const gridHeight = gridElement.getBoundingClientRect().height
        const tileHeight = gridHeight / size
        const maxPixels = maxDistance * tileHeight
        
        // 空マスの方向に応じて制限
        if (emptyRow > tileRow) {
          // 下に空マスがある → 下方向のみ許可
          constrainedY = Math.max(0, Math.min(deltaY, maxPixels))
        } else {
          // 上に空マスがある → 上方向のみ許可
          constrainedY = Math.min(0, Math.max(deltaY, -maxPixels))
        }
      } else {
        constrainedY = deltaY // フォールバック
      }
      constrainedX = 0
    } else {
      // 移動不可の場合は何もしない
      return
    }
    
    // ドラッグ中の視覚的フィードバック（制限された方向のみ）
    if (Math.abs(constrainedX) > 5 || Math.abs(constrainedY) > 5) {
      setDraggingTile({
        tileNum: touchStart.tileNum,
        x: constrainedX,
        y: constrainedY
      })
    }
    
    // 画面のスクロールを防止
    e.preventDefault()
  }

  // タッチ終了
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    
    // スワイプ方向を判定
    const threshold = 30 // 最小スワイプ距離
    const tileNum = touchStart.tileNum
    const tileIdx = state.indexOf(tileNum)
    const emptyIdx = state.indexOf(EMPTY)
    
    const tileRow = Math.floor(tileIdx / size)
    const tileCol = tileIdx % size
    const emptyRow = Math.floor(emptyIdx / size)
    const emptyCol = emptyIdx % size
    
    let canMove = false
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 横方向のスワイプ
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          // 右スワイプ: 右に空マスがあるか
          canMove = emptyRow === tileRow && emptyCol === tileCol + 1
        } else {
          // 左スワイプ: 左に空マスがあるか
          canMove = emptyRow === tileRow && emptyCol === tileCol - 1
        }
      }
    } else {
      // 縦方向のスワイプ
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          // 下スワイプ: 下に空マスがあるか
          canMove = emptyCol === tileCol && emptyRow === tileRow + 1
        } else {
          // 上スワイプ: 上に空マスがあるか
          canMove = emptyCol === tileCol && emptyRow === tileRow - 1
        }
      }
    }
    
    if (canMove) {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }
      setHintArrow(null)
      moveTile(tileNum)
    }
    
    setTouchStart(null)
    setDraggingTile(null)
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
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* 一覧に戻るボタン */}
        <div className="mb-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm sm:text-base"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl">arrow_back</span>
            <span className="hidden sm:inline">パズル一覧に戻る</span>
            <span className="sm:hidden">一覧</span>
          </a>
        </div>

        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">8パズル</h1>
          <div className="flex justify-center gap-3 sm:gap-8 text-sm sm:text-lg mb-2 sm:mb-4 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base sm:text-xl">timer</span>
              {formatTime(elapsedTime)}
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base sm:text-xl">pan_tool_alt</span>
              {moves} 手
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base sm:text-xl">lightbulb</span>
              {hints} ヒント
            </div>
          </div>
          <div className="flex justify-center gap-2 sm:gap-4 flex-wrap px-2">
            <button
              onClick={shuffle}
              disabled={isShuffling}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 sm:px-6 sm:py-2 rounded-lg font-bold transition text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isShuffling ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  <span>シャッフル中...</span>
                </>
              ) : (
                <span>{hasStartedOnce ? 'シャッフル' : 'シャッフルして開始'}</span>
              )}
            </button>
            <button
              onClick={handleRestart}
              disabled={!isStarted || isShuffling}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 sm:px-6 sm:py-2 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              位置リセット
            </button>
            <button
              onClick={getHint}
              disabled={isWon || !isStarted || isShuffling}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 sm:px-6 sm:py-2 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              ヒント
            </button>
            {/* モバイル用：見本表示ボタン（シークレットモード時は非表示） */}
            {!isSecret && (
              <button
                onClick={() => setShowSample(true)}
                disabled={isShuffling}
                className="lg:hidden bg-purple-600 hover:bg-purple-700 px-4 py-2 sm:px-6 sm:py-2 rounded-lg font-bold transition text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                見本を表示
              </button>
            )}
          </div>
        </div>

        {/* シークレットモード時はゲームボードを中央配置、それ以外は通常の3列レイアウト */}
        <div className={`flex flex-col gap-4 sm:gap-8 items-center ${isSecret ? 'lg:flex-col' : 'lg:flex-row lg:items-start justify-center'}`}>
          {/* 見本ボード - デスクトップ表示（シークレットモード時は非表示） */}
          {!isSecret && (
            <div className="hidden lg:block flex-shrink-0">
              <h2 className="text-xl font-bold mb-4 text-center">見本</h2>
              <div className="puzzle-grid puzzle-grid-sample mx-auto" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
                {Array.from({ length: size * size }, (_, i) => i + 1).map((tileNum, idx) => (
                  <div
                    key={idx}
                    className="puzzle-tile puzzle-tile-sample"
                  >
                    <img src={imagePaths[tileNum - 1]} alt={`Tile ${tileNum}`} />
                    <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                      {tileNum}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ゲームボード */}
          <div className="flex-shrink-0 w-full lg:w-auto max-w-[95vw] lg:max-w-none">
            <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4 text-center">プレイ</h2>
            
            {/* シークレットモード時、開始前はボード全体を覆う形で？を表示 */}
            {isSecret && !isStarted ? (
              <div 
                className="puzzle-grid puzzle-grid-play mx-auto relative"
                style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
              >
                {/* 背景として完成画像を配置（透明度0） */}
                {state.map((tileNum, idx) => {
                  const row = Math.floor(idx / size) + 1
                  const col = (idx % size) + 1
                  return (
                    <div
                      key={tileNum}
                      className="puzzle-tile opacity-0"
                      style={{
                        gridArea: `${row} / ${col} / ${row + 1} / ${col + 1}`,
                      }}
                    >
                      <img src={imagePaths[tileNum === EMPTY ? size * size - 1 : tileNum - 1]} alt="" />
                    </div>
                  )
                })}
                {/* ？アイコンのオーバーレイ（ボード全体を覆う） */}
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center border-2 border-purple-500/30 rounded-lg"
                  style={{ margin: '0' }}
                >
                  <div className="text-center">
                    <span className="material-symbols-outlined text-8xl sm:text-9xl text-purple-400 animate-pulse mb-4">help</span>
                    <p className="text-purple-400 text-xl sm:text-2xl font-semibold">シークレットパズル</p>
                    <p className="text-purple-300 text-sm sm:text-base mt-2">何が出るかはお楽しみ！</p>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className={`puzzle-grid puzzle-grid-play mx-auto ${!isStarted ? 'not-started' : ''}`} 
                style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
              >
              {state.map((tileNum, idx) => {
                const row = Math.floor(idx / size) + 1
                const col = (idx % size) + 1
                const isDragging = draggingTile?.tileNum === tileNum
                
                // シャッフルアニメーション情報を取得
                const shuffleAnim = shuffleAnimations.get(tileNum)
                const isShuffleAnimating = shuffleAnim !== undefined
                
                // シャッフルアニメーション用のスタイル計算
                let animationStyle: React.CSSProperties = {}
                if (isShuffleAnimating && shuffleAnim) {
                  // 元の位置（fromRow, fromCol）から現在の位置（toRow, toCol）への移動
                  // CSS変数で移動距離を指定
                  const deltaRow = shuffleAnim.toRow - shuffleAnim.fromRow
                  const deltaCol = shuffleAnim.toCol - shuffleAnim.fromCol
                  
                  // CSS変数として移動距離を設定（タイル1つ分 = 100%）
                  animationStyle = {
                    '--from-x': `${-deltaCol * 100}%`,
                    '--from-y': `${-deltaRow * 100}%`,
                  } as React.CSSProperties
                }
                
                return (
                  <div
                    key={tileNum}
                    className={`puzzle-tile ${tileNum === EMPTY && isStarted ? 'empty' : ''} ${
                      !isStarted && tileNum !== EMPTY ? 'puzzle-tile-complete' : ''
                    } ${isDragging ? 'dragging' : ''} ${isShuffleAnimating ? 'shuffle-animating' : ''}`}
                    style={{
                      gridArea: `${row} / ${col} / ${row + 1} / ${col + 1}`,
                      transform: isDragging ? `translate(${draggingTile.x}px, ${draggingTile.y}px)` : undefined,
                      zIndex: isDragging ? 1000 : isShuffleAnimating ? 1000 : undefined,
                      ...animationStyle,
                    }}
                    onClick={() => handleTileClickDirect(tileNum)}
                    draggable={tileNum !== EMPTY && isStarted && !isWon && !isShuffling}
                    onDragStart={(e) => handleDragStart(e, tileNum)}
                    onDragOver={(e) => handleDragOver(e, tileNum)}
                    onDrop={(e) => handleDrop(e, tileNum)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, tileNum)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {(tileNum !== EMPTY || !isStarted) && (
                      <>
                        <img src={imagePaths[tileNum === EMPTY ? size * size - 1 : tileNum - 1]} alt={`Tile ${tileNum}`} />
                        {isStarted && tileNum !== EMPTY && (
                          <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 bg-black bg-opacity-60 text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded font-bold">
                            {tileNum}
                          </div>
                        )}
                      </>
                    )}
                    {hintArrow && hintArrow.pos === tileNum && (
                      <div className="hint-arrow">{hintArrow.direction}</div>
                    )}
                  </div>
                )
              })}
            </div>
            )}
          </div>

          {/* リーダーボード */}
          <div className="w-full lg:flex-shrink-0 lg:w-80 px-2 sm:px-0">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4 flex items-center justify-center lg:justify-start gap-2">
              <span className="material-symbols-outlined text-2xl sm:text-3xl text-yellow-400">emoji_events</span>
              リーダーボード
            </h2>
            {leaderboard.length === 0 ? (
              <p className="text-gray-400 text-center lg:text-left text-sm sm:text-base">まだ記録がありません</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800 p-2 sm:p-3 rounded-lg flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-lg sm:text-2xl font-bold text-yellow-400">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-sm sm:text-base">{formatTime(entry.time)}</div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          {entry.moves}手 / {entry.hints}ヒント
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500">
                      {new Date(entry.date).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* モバイル用：見本ボードのオーバーレイ（シークレットモード時は表示しない） */}
      {showSample && !isSecret && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowSample(false)}
        >
          <div 
            className="bg-gray-800 rounded-2xl p-4 sm:p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">見本</h2>
              <button
                onClick={() => setShowSample(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>
            <div className="puzzle-grid puzzle-grid-sample-mobile mx-auto" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
              {Array.from({ length: size * size }, (_, i) => i + 1).map((tileNum, idx) => (
                <div
                  key={idx}
                  className="puzzle-tile puzzle-tile-sample"
                >
                  <img src={imagePaths[tileNum - 1]} alt={`Tile ${tileNum}`} />
                  <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                    {tileNum}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 勝利モーダル */}
      {isWon && (
        <div className="congratulations">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="material-symbols-outlined text-4xl sm:text-5xl text-yellow-400">celebration</span>
            <h2 className="text-2xl sm:text-3xl font-bold">おめでとうございます！</h2>
          </div>
          <p className="text-lg sm:text-xl mb-2">タイム: {formatTime(elapsedTime)}</p>
          <p className="text-base sm:text-lg mb-2">手数: {moves}</p>
          <p className="text-base sm:text-lg mb-4">ヒント: {hints}</p>
          <button
            onClick={shuffle}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 sm:px-8 sm:py-3 rounded-lg font-bold transition text-sm sm:text-base"
          >
            もう一度プレイ
          </button>
        </div>
      )}
    </div>
  )
}

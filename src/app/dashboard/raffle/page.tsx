"use client"

import { useEffect, useState } from "react"
import {
  Gift,
  Trophy,
  Send,
  Loader2,
  UserCheck,
  UserX,
  Sparkles,
  CheckCircle2,
} from "lucide-react"

interface PostOption {
  id: string
  account_id: string
  media_id: string
  caption: string | null
  is_active: boolean
  accounts: { ig_username: string } | null
}

interface Winner {
  id: string
  username: string | null
  comment_text: string | null
  user_igsid: string
  is_following: boolean | null
}

interface SendResult {
  id: string
  ok: boolean
  error?: string
}

const DEFAULT_MESSAGE =
  "🎉 축하합니다! 이벤트에 당첨되셨습니다.\n\n상품 수령을 위해 이 메시지에 회신하여\n성함 / 연락처 / 배송지를 남겨주세요.\n\n다시 한번 축하드립니다 🙌"

export default function RafflePage() {
  const [posts, setPosts] = useState<PostOption[]>([])
  const [postId, setPostId] = useState<string>("")
  const [keyword, setKeyword] = useState<string>("")
  const [mustFollow, setMustFollow] = useState<boolean>(false)
  const [winnerCount, setWinnerCount] = useState<number>(5)

  const [loadingPosts, setLoadingPosts] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [winners, setWinners] = useState<Winner[]>([])
  const [poolSize, setPoolSize] = useState<number | null>(null)

  const [message, setMessage] = useState<string>(DEFAULT_MESSAGE)
  const [sending, setSending] = useState(false)
  const [sendSummary, setSendSummary] = useState<{ sent: number; total: number } | null>(null)
  const [results, setResults] = useState<SendResult[]>([])

  useEffect(() => {
    async function loadPosts() {
      try {
        const res = await fetch("/api/posts?is_active=true")
        const json = (await res.json()) as { data?: PostOption[]; error?: string }
        if (json.data) {
          setPosts(json.data)
          if (json.data.length > 0) setPostId(json.data[0].id)
        }
      } catch {
        // ignore
      } finally {
        setLoadingPosts(false)
      }
    }
    loadPosts()
  }, [])

  const drawWinners = async () => {
    if (!postId) {
      alert("게시물을 선택해주세요.")
      return
    }
    setDrawing(true)
    setWinners([])
    setPoolSize(null)
    setSendSummary(null)
    setResults([])
    try {
      const params = new URLSearchParams({
        post_id: postId,
        count: String(winnerCount),
      })
      if (mustFollow) params.set("must_follow", "true")
      if (keyword.trim()) params.set("keyword", keyword.trim())

      const res = await fetch(`/api/raffle?${params.toString()}`)
      const json = (await res.json()) as {
        data?: { winners: Winner[]; pool_size: number }
        error?: string
      }
      if (!res.ok) {
        alert(json.error || "추첨에 실패했습니다.")
        return
      }
      setWinners(json.data?.winners ?? [])
      setPoolSize(json.data?.pool_size ?? 0)
    } catch {
      alert("추첨에 실패했습니다.")
    } finally {
      setDrawing(false)
    }
  }

  const sendDms = async () => {
    if (winners.length === 0) return
    if (!message.trim()) {
      alert("축하 메시지를 입력해주세요.")
      return
    }
    setSending(true)
    setSendSummary(null)
    setResults([])
    try {
      const res = await fetch("/api/raffle/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          conversation_ids: winners.map((w) => w.id),
        }),
      })
      const json = (await res.json()) as {
        data?: { sent: number; total: number; results: SendResult[] }
        error?: string
      }
      if (!res.ok) {
        alert(json.error || "DM 발송에 실패했습니다.")
        return
      }
      setSendSummary({ sent: json.data?.sent ?? 0, total: json.data?.total ?? 0 })
      setResults(json.data?.results ?? [])
    } catch {
      alert("DM 발송에 실패했습니다.")
    } finally {
      setSending(false)
    }
  }

  const resultFor = (id: string) => results.find((r) => r.id === id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">댓글 이벤트 추첨</h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          등록된 게시물의 댓글 참여자 중에서 조건에 맞춰 당첨자를 무작위로 추첨합니다.
        </p>
      </div>

      {/* Setup */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Sparkles className="h-4 w-4 text-primary" /> 추첨 조건
        </h3>

        {loadingPosts ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm text-zinc-500">
            등록된 게시물이 없습니다. 먼저 Posts 페이지에서 게시물을 등록해주세요.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                게시물
              </label>
              <select
                value={postId}
                onChange={(e) => setPostId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {posts.map((p) => (
                  <option key={p.id} value={p.id}>
                    @{p.accounts?.ig_username ?? "unknown"} —{" "}
                    {(p.caption || p.media_id).slice(0, 24)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                키워드 포함 (선택)
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 참여, 응모"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                당첨자 수
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={winnerCount}
                onChange={(e) => setWinnerCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={mustFollow}
                  onChange={(e) => setMustFollow(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                />
                팔로워만 당첨 대상에 포함
              </label>
            </div>
          </div>
        )}

        {posts.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={drawWinners}
              disabled={drawing || !postId}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {drawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
              {drawing ? "추첨 중..." : "당첨자 추첨"}
            </button>
          </div>
        )}
      </div>

      {/* Winners */}
      {winners.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                당첨자 {winners.length}명
              </h3>
            </div>
            {poolSize !== null && (
              <span className="text-xs text-zinc-500">전체 참여자 {poolSize}명</span>
            )}
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {winners.map((w, idx) => {
              const r = resultFor(w.id)
              return (
                <div key={w.id} className="flex items-start gap-4 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light dark:bg-primary/10">
                    <span className="text-xs font-bold text-primary">{idx + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        @{w.username || "unknown"}
                      </span>
                      {w.is_following === true && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                          <UserCheck className="h-3 w-3" /> 팔로잉
                        </span>
                      )}
                      {w.is_following === false && (
                        <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          <UserX className="h-3 w-3" /> 비팔로우
                        </span>
                      )}
                      {r && (r.ok ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> 발송 완료
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-red-500">발송 실패</span>
                      ))}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {w.comment_text || <span className="text-zinc-400">(댓글 없음)</span>}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Send DM */}
      {winners.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Send className="h-4 w-4 text-primary" /> 당첨 축하 DM
          </h3>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="당첨자에게 보낼 축하 메시지를 입력하세요..."
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-zinc-500">
              {sendSummary
                ? `발송 완료: ${sendSummary.sent}/${sendSummary.total}명`
                : `당첨자 ${winners.length}명에게 발송됩니다.`}
            </div>
            <button
              onClick={sendDms}
              disabled={sending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "발송 중..." : "당첨자에게 DM 발송"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

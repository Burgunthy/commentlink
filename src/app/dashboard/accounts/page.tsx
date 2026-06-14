"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Plus,
  Trash2,
  RefreshCw,
  AtSign,
  Users,
  Link2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

interface Account {
  id: string
  instagram_username: string
  is_active: boolean
  connected_at: string
  last_synced_at: string | null
  follower_count: number | null
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [username, setUsername] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from("accounts")
        .select("*")
        .order("connected_at", { ascending: false })
      if (data) setAccounts(data as Account[])
    } catch {
      // table may not exist
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!username.trim()) {
      alert("인스타그램 사용자명을 입력해주세요.")
      return
    }

    setSaving(true)
    const supabase = createClient()
    try {
      await supabase.from("accounts").insert({
        instagram_username: username.trim(),
        is_active: true,
      })
      setShowModal(false)
      setUsername("")
      await fetchAccounts()
    } catch {
      alert("계정 추가에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까? 연동이 해제됩니다.")) return
    const supabase = createClient()
    try {
      await supabase.from("accounts").delete().eq("id", id)
      await fetchAccounts()
    } catch {
      alert("삭제에 실패했습니다.")
    }
  }

  const handleSync = async (account: Account) => {
    const supabase = createClient()
    try {
      await supabase
        .from("accounts")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", account.id)
      await fetchAccounts()
    } catch {
      alert("동기화에 실패했습니다.")
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
  }

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "미동기화"
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "방금 전"
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm text-zinc-500 dark:text-zinc-400">
            연동된 계정
          </h2>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {accounts.length}개
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          계정 추가
        </button>
      </div>

      {/* Account cards */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-900">
          <Users className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            아직 연동된 계정이 없습니다.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            인스타그램 계정을 연동하면 댓글을 자동으로 감지합니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                <AtSign className="h-6 w-6 text-white" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    @{account.instagram_username}
                  </h3>
                  {account.is_active ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-zinc-400" />
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                  <span>연동: {formatDate(account.connected_at)}</span>
                  {account.follower_count !== null && (
                    <span>
                      팔로워: {account.follower_count.toLocaleString()}명
                    </span>
                  )}
                </div>
              </div>

              {/* Sync status */}
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{timeAgo(account.last_synced_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSync(account)}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-primary dark:hover:bg-zinc-800"
                  title="동기화"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="연동 해제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-primary-light p-2 dark:bg-primary/10">
                <AtSign className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                인스타그램 계정 연동
              </h2>
            </div>

            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              연동할 인스타그램 계정의 사용자명을 입력하세요.
              공식 API 연동이 필요할 수 있습니다.
            </p>

            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="instagram_username"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {saving ? "연동 중..." : "연동하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

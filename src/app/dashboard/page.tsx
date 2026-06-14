"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  BarChart3,
  MessageSquare,
  Users,
  Package,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

interface Stats {
  totalComments: number
  totalClicks: number
  totalProducts: number
  totalAccounts: number
  commentsChange: number
  clicksChange: number
}

interface RecentComment {
  id: string
  username: string
  content: string
  product_name: string
  created_at: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalComments: 0,
    totalClicks: 0,
    totalProducts: 0,
    totalAccounts: 0,
    commentsChange: 0,
    clicksChange: 0,
  })
  const [recentComments, setRecentComments] = useState<RecentComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      const supabase = createClient()
      try {
        // Fetch comment counts
        const { count: totalComments } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })

        // Fetch product counts
        const { count: totalProducts } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })

        // Fetch account counts
        const { count: totalAccounts } = await supabase
          .from("accounts")
          .select("*", { count: "exact", head: true })

        // Fetch recent comments with product info
        const { data: comments } = await supabase
          .from("comments")
          .select("id, username, content, created_at, products(name)")
          .order("created_at", { ascending: false })
          .limit(5)

        setStats({
          totalComments: totalComments ?? 0,
          totalClicks: 0,
          totalProducts: totalProducts ?? 0,
          totalAccounts: totalAccounts ?? 0,
          commentsChange: 12.5,
          clicksChange: 8.3,
        })

        if (comments) {
          setRecentComments(
            comments.map((c) => ({
              id: c.id,
              username: c.username,
              content: c.content,
              product_name: (c.products as unknown as { name: string })?.name ?? "-",
              created_at: c.created_at,
            }))
          )
        }
      } catch {
        // Table may not exist yet — use defaults
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const statCards = [
    {
      label: "총 댓글 수",
      value: stats.totalComments,
      change: stats.commentsChange,
      icon: MessageSquare,
    },
    {
      label: "총 클릭 수",
      value: stats.totalClicks,
      change: stats.clicksChange,
      icon: BarChart3,
    },
    {
      label: "등록된 상품",
      value: stats.totalProducts,
      change: null,
      icon: Package,
    },
    {
      label: "연동된 계정",
      value: stats.totalAccounts,
      change: null,
      icon: Users,
    },
  ]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
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
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {card.label}
                </p>
                <div className="rounded-lg bg-primary-light p-2 dark:bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {card.value.toLocaleString()}
              </p>
              {card.change !== null && (
                <div className="mt-1 flex items-center gap-1 text-xs font-medium">
                  {card.change >= 0 ? (
                    <>
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500">
                        +{card.change}%
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-red-500">{card.change}%</span>
                    </>
                  )}
                  <span className="text-zinc-400">지난 7일</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              최근 댓글 활동
            </h2>
          </div>
          <span className="text-xs text-zinc-500">최근 5개</span>
        </div>

        {recentComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <MessageSquare className="mb-3 h-10 w-10" />
            <p className="text-sm">아직 댓글 데이터가 없습니다.</p>
            <p className="mt-1 text-xs">인스타그램 계정을 연동하고 상품을 등록해보세요.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentComments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-4 px-5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light dark:bg-primary/10">
                  <span className="text-xs font-bold text-primary">
                    {comment.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      @{comment.username}
                    </span>
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/10">
                      {comment.product_name}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {comment.content}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">
                  {formatDate(comment.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Save, RotateCcw, MessageSquare, Sparkles } from "lucide-react"

interface MessageConfig {
  id?: string
  dm_template: string
  comment_keyword: string
  welcome_message: string
  auto_reply_enabled: boolean
}

const defaultConfig: MessageConfig = {
  dm_template:
    "안녕하세요! 문의해주셔서 감사합니다 😊\n\n{product_name}에 관심을 가져주셨네요.\n더 자세한 정보가 필요하시면 아래 링크를 확인해주세요!\n\n🔗 {product_url}\n\n궁금한 점이 있으시면 언제든 DM 주세요!",
  comment_keyword: "링크, 정보, 가격, 구매",
  welcome_message:
    "반갑습니다! 🎉\n저희 상품에 관심이 있으시면 댓글로 남겨주세요.\n키워드를 입력하시면 자동으로 DM이 발송됩니다.",
  auto_reply_enabled: true,
}

const variableDescriptions: Record<string, string> = {
  "{product_name}": "상품 이름",
  "{product_url}": "상품 링크",
  "{username}": "댓글 작성자 ID",
  "{post_url}": "게시물 링크",
}

export default function SettingsPage() {
  const [config, setConfig] = useState<MessageConfig>(defaultConfig)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadConfig() {
      const supabase = createClient()
      try {
        const { data } = await supabase
          .from("settings")
          .select("*")
          .single()

        if (data) {
          setConfig({
            id: data.id,
            dm_template: data.dm_template ?? defaultConfig.dm_template,
            comment_keyword: data.comment_keyword ?? defaultConfig.comment_keyword,
            welcome_message: data.welcome_message ?? defaultConfig.welcome_message,
            auto_reply_enabled: data.auto_reply_enabled ?? true,
          })
        }
      } catch {
        // use defaults
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    const supabase = createClient()
    try {
      const payload = {
        dm_template: config.dm_template,
        comment_keyword: config.comment_keyword,
        welcome_message: config.welcome_message,
        auto_reply_enabled: config.auto_reply_enabled,
      }

      if (config.id) {
        await supabase.from("settings").update(payload).eq("id", config.id)
      } else {
        await supabase.from("settings").insert(payload)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert("설정 저장에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(defaultConfig)
  }

  const insertVariable = (variable: string) => {
    setConfig((prev) => ({
      ...prev,
      dm_template: prev.dm_template + variable,
    }))
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Auto-reply toggle */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-light p-2 dark:bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                자동 답장
              </h3>
              <p className="text-xs text-zinc-500">
                댓글 키워드 감지 시 자동으로 DM을 발송합니다
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              setConfig((prev) => ({
                ...prev,
                auto_reply_enabled: !prev.auto_reply_enabled,
              }))
            }
            className={`relative h-6 w-11 rounded-full transition-colors ${
              config.auto_reply_enabled ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                config.auto_reply_enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* DM Template */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            DM 템플릿
          </h3>
        </div>

        {/* Variables */}
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium text-zinc-500">변수 삽입</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(variableDescriptions).map(([variable, description]) => (
              <button
                key={variable}
                onClick={() => insertVariable(variable)}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-mono text-primary transition-colors hover:bg-primary-light dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-primary/10"
                title={description}
              >
                {variable}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={config.dm_template}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, dm_template: e.target.value }))
          }
          rows={8}
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="DM 메시지 템플릿을 입력하세요..."
        />
      </div>

      {/* Comment Keywords */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          댓글 키워드
        </h3>
        <p className="mb-3 text-xs text-zinc-500">
          쉼표로 구분하여 여러 키워드를 입력하세요. 댓글에 해당 키워드가 포함되면 자동 답장이 발송됩니다.
        </p>
        <input
          type="text"
          value={config.comment_keyword}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, comment_keyword: e.target.value }))
          }
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="예: 링크, 정보, 가격, 구매"
        />
      </div>

      {/* Welcome Message */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          웰컴 메시지
        </h3>
        <p className="mb-3 text-xs text-zinc-500">
          새로운 팔로워에게 전송되는 환영 메시지입니다.
        </p>
        <textarea
          value={config.welcome_message}
          onChange={(e) =>
            setConfig((prev) => ({
              ...prev,
              welcome_message: e.target.value,
            }))
          }
          rows={4}
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="웰컴 메시지를 입력하세요..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <RotateCcw className="h-4 w-4" />
          초기화
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "저장 중..." : saved ? "저장 완료 ✓" : "설정 저장"}
        </button>
      </div>
    </div>
  )
}

# DMify 결제 시스템 구축 — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** DMify에 구독 기반 결제 시스템을 구축하여, 무료/프로/비즈니스 3티어 요금제를 운영할 수 있게 한다.

**Architecture:** Stripe Checkout (Subscription) → Stripe Webhook → Supabase subscriptions 테이블 동기화 → middleware/layout에서 plan 기반 기능 제한. 프론트엔드는 요금제 비교 페이지 + 대시보드 사용량 UI + Customer Portal 연동.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + RLS), Stripe (Checkout Sessions + Webhooks + Customer Portal), TypeScript strict.

---

## Assumptions & Constraints

| 항목 | 값 |
|------|-----|
| 결제 서비스 | **Stripe** (구독 관리 표준, Webhook 안정성) |
| 대상 시장 | 한국 (KRW 결제) + 글로벌 (USD 결제) |
| 기존 users.plan | `free` / `pro` / `business` (이미 존재) |
| Stripe 계정 | **Taehyeon이 생성 필요** (Business 계정) |
| 배포 | Vercel 자동배포 (git push) |
| DB 마이그레이션 | Supabase SQL Editor 또은 migration 파일 |

---

## 요금제 정의 (초안 — 확정 필요)

| 기능 | Free | Pro | Business |
|------|------|-----|----------|
| 가격 | ₩0 | ₩19,900/월 | ₩49,900/월 |
| Instagram 계정 수 | 1개 | 3개 | 무제한 |
| 댓글→DM 처리 | 100건/월 | 1,000건/월 | 무제한 |
| 공개 댓글 답장 | ✅ | ✅ | ✅ |
| 키워드별 자동 DM | ❌ | ✅ | ✅ |
| 랜덤 추첨 (Raffle) | ❌ | ✅ | ✅ |
| 우선 지원 | ❌ | ❌ | ✅ |
| 분석 리포트 | 기본 | 기본 | 상세 |
| DM 링크 클릭 추적 | 기본 | 상세 | 상세 |

---

## Phase 1: 인프라 — DB 스키마 + Stripe 설정

### Task 1.1: `subscriptions` 테이블 생성

**Objective:** Stripe 구독 상태를 저장할 테이블 생성

**Files:**
- Create: `supabase/migrations/20260620_subscriptions.sql`
- 참고: `supabase/schema.sql:7-18` (users 테이블)

**SQL:**
```sql
-- subscriptions: Stripe 결제 구독 기록
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired'
    )),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, stripe_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions" ON subscriptions FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth.uid() = id)
);

-- updated_at trigger
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Verification:** Supabase SQL Editor에서 실행 후 `SELECT * FROM subscriptions LIMIT 1` 에러 없음.

**Commit:** `feat: add subscriptions table for Stripe billing`

---

### Task 1.2: `usage` 테이블 생성

**Objective:** 월별 사용량 추적 (DM 발송 수, 댓글 처리 수) — plan 제한 체크용

**Files:**
- Create: `supabase/migrations/20260620_usage.sql`

**SQL:**
```sql
-- usage: 월별 사용량 카운터
CREATE TABLE IF NOT EXISTS usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    month TEXT NOT NULL,          -- 'YYYY-MM' 형식
    comments_received INTEGER DEFAULT 0,
    dms_sent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_usage_user_month ON usage(user_id, month);

ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage" ON usage FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth.uid() = id)
);

CREATE TRIGGER usage_updated_at BEFORE UPDATE ON usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Verification:** Supabase SQL Editor 실행 후 `SELECT * FROM usage LIMIT 1` 에러 없음.

**Commit:** `feat: add usage tracking table`

---

### Task 1.3: `stripe_products` + `stripe_prices` 참조 테이블 생성

**Objective:** plan → Stripe Price ID 매핑 (서버에서 하드코딩 대신 DB에서 관리)

**Files:**
- Create: `supabase/migrations/20260620_stripe_config.sql`

**SQL:**
```sql
-- plan_config: plan별 Stripe price 매핑 (단행, 운영자만 편집)
CREATE TABLE IF NOT EXISTS plan_config (
    plan TEXT PRIMARY KEY CHECK (plan IN ('free', 'pro', 'business')),
    stripe_price_id TEXT,                -- Stripe Price ID (free는 NULL)
    max_accounts INTEGER NOT NULL DEFAULT 1,
    max_dms_per_month INTEGER NOT NULL DEFAULT 100,
    features JSONB NOT NULL DEFAULT '{}', -- {"keyword_dm": true, "raffle": true, ...}
    display_price TEXT NOT NULL DEFAULT '₩0',  -- UI 표시용
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 데이터 (Stripe Price ID는 Task 2.1에서 채움)
INSERT INTO plan_config (plan, max_accounts, max_dms_per_month, features, display_price) VALUES
    ('free',     1,   100,   '{"keyword_dm": false, "raffle": false, "analytics": "basic"}',     '₩0'),
    ('pro',      3,   1000,  '{"keyword_dm": true,  "raffle": true,  "analytics": "basic"}',     '₩19,900/월'),
    ('business', -1,  -1,    '{"keyword_dm": true,  "raffle": true,  "analytics": "detailed"}',   '₩49,900/월')
ON CONFLICT (plan) DO NOTHING;

-- RLS: 모든 로그인 사용자 읽기 가능 (public data)
ALTER TABLE plan_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read plan_config" ON plan_config FOR SELECT USING (auth.uid() IS NOT NULL);
```

**Verification:** `SELECT * FROM plan_config` → 3행 반환.

**Commit:** `feat: add plan_config table with tier limits`

---

### Task 1.4: Stripe 계정 생성 + API 키 발급 (Taehyeon 전용)

**Objective:** Stripe Dashboard에서 Business 계정 생성 후 키 획득

**Taehyeon이 직접 수행:**

1. https://dashboard.stripe.com/register 접속
2. Business 계정 생성 (한국 사업자 정보)
3. Products 생성:
   - Product 1: "DMify Pro" → Monthly ₩19,900 → Price ID 복사
   - Product 2: "DMify Business" → Monthly ₩49,900 → Price ID 복사
4. API Keys에서:
   - **Publishable Key** (pk_...) 복사
   - **Secret Key** (sk_...) 복사
5. Webhook signing secret은 Task 2.4에서 생성

**Deliverables (Taehyeon → Hermes):**
```
STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_BUSINESS_PRICE_ID=price_xxx
```

**Vercel 환경변수 설정 (Hermes):**
```bash
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_SECRET_KEY
# .env.local도 업데이트
```

---

## Phase 2: Stripe 결제 연동 (Backend)

### Task 2.1: Stripe SDK 설치

**Objective:** stripe npm 패키지 추가

**Files:**
- Modify: `package.json`

**Step 1: Install**
```bash
cd /home/jth/projects/auto-instagram/dmify
npm install stripe @stripe/stripe-js
```

**Step 2: Verify**
```bash
npm ls stripe @stripe/stripe-js
```
Expected: `stripe@latest`, `@stripe/stripe-js@latest`

**Commit:** `chore: add stripe and @stripe/stripe-js dependencies`

---

### Task 2.2: Stripe client 초기화 유틸

**Objective:** 서버 전용 Stripe 인스턴스 생성

**Files:**
- Create: `src/lib/stripe/server.ts`
- Create: `src/lib/stripe/client.ts`

**`src/lib/stripe/server.ts`:**
```typescript
import Stripe from 'stripe'

export function getStripeServer() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-04-30.basil', // 최신 API 버전
    typescript: true,
  })
}
```

**`src/lib/stripe/client.ts`:**
```typescript
import { loadStripe } from '@stripe/stripe-js'

let stripePromise: ReturnType<typeof loadStripe> | null = null

export function getStripeClient() {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
    )
  }
  return stripePromise
}
```

**Commit:** `feat: add Stripe server and client initialization`

---

### Task 2.3: Checkout Session 생성 API

**Objective:** `/api/stripe/checkout` — 선택한 plan에 대한 Stripe Checkout Session 생성

**Files:**
- Create: `src/app/api/stripe/checkout/route.ts`

**Step 1: Plan → Price ID 매핑**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

// plan → Stripe Price ID
const PLAN_PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  business: process.env.STRIPE_BUSINESS_PRICE_ID || '',
}

const PLAN_TO_STRIPE_PLAN: Record<string, string> = {
  pro: 'pro',
  business: 'business',
}

export async function POST(request: NextRequest) {
  const { plan } = await request.json() as { plan: string }

  if (!plan || !PLAN_PRICE_IDS[plan]) {
    return NextResponse.json(
      { error: `Invalid plan: ${plan}. Use 'pro' or 'business'.` },
      { status: 400 }
    )
  }

  // 1. Get current user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripe = getStripeServer()

  // 2. Get or create Stripe customer
  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = userData?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  // 3. Create Checkout Session
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://commentlink-xi.vercel.app'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      { price: PLAN_PRICE_IDS[plan], quantity: 1 },
    ],
    success_url: `${origin}/dashboard?upgraded=true&plan=${plan}`,
    cancel_url: `${origin}/dashboard/pricing?canceled=true`,
    metadata: {
      supabase_user_id: user.id,
      plan: PLAN_TO_STRIPE_PLAN[plan],
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan: PLAN_TO_STRIPE_PLAN[plan],
      },
    },
  })

  return NextResponse.json({ url: session.url, sessionId: session.id })
}
```

**Verification:** (Stripe 키 설정 후) `curl -X POST /api/stripe/checkout -d '{"plan":"pro"}'` → `{ "url": "https://checkout.stripe.com/..." }`

**Commit:** `feat: add Stripe checkout session API`

---

### Task 2.4: Stripe Webhook 엔드포인트

**Objective:** `/api/stripe/webhook` — Stripe 이벤트 수신 → DB 동기화

**Files:**
- Create: `src/app/api/stripe/webhook/route.ts`

**이벤트 처리 목록:**
| Stripe 이벤트 | 동작 |
|---------------|------|
| `checkout.session.completed` | subscriptions 테이블 insert + users.plan 업데이트 |
| `customer.subscription.updated` | 구독 상태/기간 업데이트 |
| `customer.subscription.deleted` | users.plan = 'free' + 구독 비활성화 |
| `invoice.payment_failed` | 구독 상태 = 'past_due' |

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import * as crypto from 'crypto'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return true // dev mode
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

function getStripeEvent(payload: string, signature: string): Stripe.Event {
  const stripe = getStripeServer()
  return stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET)
}

// Plan mapping: Stripe price_id → DMify plan
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRO_PRICE_ID || '']: 'pro',
  [process.env.STRIPE_BUSINESS_PRICE_ID || '']: 'business',
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature') || ''
  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = getStripeEvent(payload, signature)
  } catch (err) {
    console.error('[stripe:webhook] verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = await createClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      const plan = session.metadata?.plan
      const subscriptionId = session.subscription as string
      const customerId = session.customer as string

      if (!userId || !plan || !subscriptionId) break

      // Fetch subscription details from Stripe
      const stripe = getStripeServer()
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      // Insert subscription record
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: subscription.items.data[0]?.price?.id || '',
        status: 'active',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }, { onConflict: 'user_id,stripe_subscription_id' })

      // Update user plan
      await supabase.from('users').update({ plan }).eq('id', userId)

      console.log(`[stripe:webhook] activated ${plan} for user ${userId}`)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.supabase_user_id
      if (!userId) break

      await supabase.from('subscriptions').update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      }).eq('stripe_subscription_id', subscription.id)

      console.log(`[stripe:webhook] updated subscription ${subscription.id} → ${subscription.status}`)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.supabase_user_id
      if (!userId) break

      await supabase.from('subscriptions').update({
        status: 'canceled',
      }).eq('stripe_subscription_id', subscription.id)

      await supabase.from('users').update({ plan: 'free' }).eq('id', userId)

      console.log(`[stripe:webhook] canceled subscription for user ${userId}`)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription as string
      if (!subscriptionId) break

      await supabase.from('subscriptions').update({
        status: 'past_due',
      }).eq('stripe_subscription_id', subscriptionId)

      console.log(`[stripe:webhook] payment failed for subscription ${subscriptionId}`)
      break
    }

    default:
      console.log(`[stripe:webhook] unhandled event: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
```

**Verification:** Stripe CLI로 테스트: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

**Commit:** `feat: add Stripe webhook endpoint for subscription lifecycle`

---

### Task 2.5: Customer Portal API

**Objective:** `/api/stripe/portal` — 구독 관리/해지를 위한 Stripe Customer Portal 세션 생성

**Files:**
- Create: `src/app/api/stripe/portal/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!userData?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
  }

  const stripe = getStripeServer()
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://commentlink-xi.vercel.app'

  const session = await stripe.billingPortal.sessions.create({
    customer: userData.stripe_customer_id,
    return_url: `${origin}/dashboard/settings`,
  })

  return NextResponse.json({ url: session.url })
}
```

**Verification:** `curl -X POST /api/stripe/portal` → `{ "url": "https://billing.stripe.com/..." }`

**Commit:** `feat: add Stripe customer portal API`

---

### Task 2.6: Webhook에서 사용량 카운트

**Objective:** DM 발송 시 usage 테이블 업데이트

**Files:**
- Modify: `src/app/api/webhook/route.ts:312-335` (DM 전송 성공 후)

**webhook route.ts에 추가 (DM 전송 성공 직후):**
```typescript
// After successful DM send (inside the try block around igApi 'me/messages'):
// Increment monthly DM counter
const month = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
const { error: usageErr } = await supabase.rpc('increment_usage', {
  p_user_id: /* user_id from account join */,
  p_account_id: account.id,
  p_month: month,
  p_field: 'dms_sent',
})
```

**추가 필요 — RPC 함수 (migration):**
```sql
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_account_id UUID,
  p_month TEXT,
  p_field TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO usage (user_id, account_id, month, dms_sent, comments_received)
  VALUES (p_user_id, p_account_id, p_month, 0, 0)
  ON CONFLICT (user_id, month) DO NOTHING;

  EXECUTE format(
    'UPDATE usage SET %I = %I + 1, updated_at = NOW() WHERE user_id = $1 AND month = $2',
    p_field, p_field
  ) USING p_user_id, p_month;
END;
$$ LANGUAGE plpgsql;
```

**Commit:** `feat: add DM usage tracking in webhook`

---

### Task 2.7: Webhook에서 plan 제한 체크

**Objective:** DM 발송 전에 plan 한도 확인 → 초과 시 차단 + 에러 메시지

**Files:**
- Create: `src/lib/plan-guard.ts`
- Modify: `src/app/api/webhook/route.ts`

**`src/lib/plan-guard.ts`:**
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

interface PlanLimits {
  plan: string
  max_accounts: number
  max_dms_per_month: number
}

export async function canSendDm(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; reason?: string; used: number; limit: number }> {
  // 1. Get user plan
  const { data: user } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single()

  const plan = user?.plan || 'free'

  // 2. Get plan limits
  const { data: config } = await supabase
    .from('plan_config')
    .select('max_dms_per_month')
    .eq('plan', plan)
    .single()

  const limit = config?.max_dms_per_month ?? 100

  // -1 = unlimited
  if (limit === -1) {
    return { allowed: true, used: 0, limit: -1 }
  }

  // 3. Get current month usage
  const month = new Date().toISOString().slice(0, 7)
  const { data: usageRow } = await supabase
    .from('usage')
    .select('dms_sent')
    .eq('user_id', userId)
    .eq('month', month)
    .single()

  const used = usageRow?.dms_sent ?? 0

  if (used >= limit) {
    return {
      allowed: false,
      reason: `Monthly DM limit reached (${used}/${limit}). Upgrade your plan.`,
      used,
      limit,
    }
  }

  return { allowed: true, used, limit }
}
```

**webhook route.ts에 guard 추가:**
```typescript
import { canSendDm } from '@/lib/plan-guard'

// In handleComment(), before DM sending block:
const accountId = account.user_id // need to join users table
const dmCheck = await canSendDm(supabase, accountId)
if (!dmCheck.allowed) {
  console.log(`[webhook] DM blocked: ${dmCheck.reason}`)
  await supabase.from('conversations')
    .update({ status: 'failed', error_message: dmCheck.reason })
    .eq('comment_id', commentId)
  return
}
```

**Commit:** `feat: add plan-based DM limit enforcement`

---

## Phase 3: 프론트엔드 — 결제 UI

### Task 3.1: 요금제 비교 페이지

**Objective:** `/dashboard/pricing` — 3개 티어 카드 비교 + 결제 버튼

**Files:**
- Create: `src/app/dashboard/pricing/page.tsx`
- Modify: `src/app/dashboard/layout.tsx` (nav에 Pricing 추가)

**UI 구조:**
```
┌─────────────────────────────────────────────────┐
│  Choose Your Plan                                │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  FREE    │  │  PRO ★  │  │ BUSINESS │      │
│  │  ₩0      │  │  ₩19,900 │  │  ₩49,900 │      │
│  │          │  │   /월    │  │   /월    │      │
│  │  1 계정  │  │  3 계정  │  │  무제한  │      │
│  │  100 DM  │  │  1,000DM │  │  무제한  │      │
│  │          │  │          │  │          │      │
│  │ 현재 요금│  │ [결제하기]│  │ [결제하기]│      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

**Commit:** `feat: add pricing page with tier comparison`

---

### Task 3.2: 대시보드 사용량 표시

**Objective:** Dashboard 상단에 현재 plan + 월간 사용량 바 표시

**Files:**
- Modify: `src/app/dashboard/page.tsx` (statCards에 usage card 추가)

**UI:**
```
┌────────────────────────────────────────┐
│  📊 Plan: Pro  │  DM 사용량           │
│                 │  ████████░░░ 430/1000│
│                 │  남은 일수: 12일      │
└────────────────────────────────────────┘
```

**Commit:** `feat: add usage meter to dashboard`

---

### Task 3.3: 업그레이드 배너

**Objective:** 무료 사용자 대시보드 상단에 업그레이드 유도 배너

**Files:**
- Modify: `src/app/dashboard/page.tsx` (plan이 free일 때 배너 표시)

**UI:**
```
┌──────────────────────────────────────────────┐
│  🚀 DM 한도에 도달하면 자동차단됩니다.        │
│  Pro로 업그레이드하여 한도를 늘리세요!  [Pro로 업그레이드 →]  │
└──────────────────────────────────────────────┘
```

**Commit:** `feat: add upgrade banner for free users`

---

### Task 3.4: Settings에 구독 관리 버튼

**Objective:** Settings 페이지에 "구독 관리" 버튼 → Stripe Customer Portal로 이동

**Files:**
- Modify: `src/app/dashboard/settings/page.tsx`

**Commit:** `feat: add subscription management link to settings`

---

### Task 3.5: 계정 연결 시 plan 제한 체크

**Objective:** 계정 연결 시 plan의 max_accounts 초과 방지

**Files:**
- Modify: `src/app/api/accounts/connect/route.ts`

**로직:**
```typescript
// Before creating account:
const { data: user } = await supabase.from('users').select('plan').eq('id', userId).single()
const { data: config } = await supabase.from('plan_config').select('max_accounts').eq('plan', user?.plan).single()
const { count } = await supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('user_id', userId)

if (config && config.max_accounts !== -1 && (count ?? 0) >= config.max_accounts) {
  return NextResponse.json(
    { error: `무료 플랜은 ${config.max_accounts}개까지만 연결 가능합니다. Pro로 업그레이드하세요.` },
    { status: 403 }
  )
}
```

**Commit:** `feat: enforce account limit based on plan`

---

## Phase 4: Vercel 배포 + 환경변수

### Task 4.1: Vercel 환경변수 설정

**Objective:** Stripe 키 + Webhook secret을 Vercel에 설정

**Files:** 없음 (API/CLI 작업)

**명령어:**
```bash
cd /home/jth/projects/auto-instagram/dmify

# Stripe keys (Taehyeon이 주면 실행)
echo "STRIPE_SECRET_KEY" | vercel env add STRIPE_SECRET_KEY production
echo "STRIPE_WEBHOOK_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET production
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

# Preview/Development에도 동일하게
# vercel env add ... preview
# vercel env add ... development
```

**Verification:** `vercel env ls` → Stripe 관련 변수 3개 표시

---

### Task 4.2: Stripe Webhook 엔드포인트 등록

**Objective:** Stripe Dashboard에 Webhook URL 등록

**Taehyeon이 직접 수행 (또는 API로):**

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://commentlink-xi.vercel.app/api/stripe/webhook`
3. Events to listen:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Signing secret 복사 → `STRIPE_WEBHOOK_SECRET`으로 설정

---

### Task 4.3: Stripe Customer Portal 설정

**Objective:** Stripe Dashboard에서 Customer Portal 구성

**Taehyeon이 직접 수행:**

1. Stripe Dashboard → Settings → Billing → Customer Portal
2. Features 구성: 구독 취소, 결제 수단 변경 활성화
3. Business info, branding 설정

---

### Task 4.4: Stripe test mode로 E2E 테스트

**Objective:** 전체 흐름 테스트 (Checkout → Webhook → DB → UI)

**테스트 시나리오:**
1. 대시보드 → Pricing → Pro 결제하기 클릭
2. Stripe Checkout 페이지 (test mode) → 4242 4242 4242 4242 입력
3. 결제 완료 → `/dashboard?upgraded=true` 리다이렉트
4. DB 확인: `users.plan = 'pro'`, `subscriptions` row 생성
5. 대시보드: usage meter가 Pro로 표시
6. Settings → 구독 관리 → Customer Portal 열림
7. Customer Portal에서 구독 취소
8. Webhook 수신 → `users.plan = 'free'`로 복원

**Commit:** N/A (테스트 전용)

---

## Task Summary

| # | Task | Phase | Files | Est. |
|---|------|-------|-------|------|
| 1.1 | subscriptions 테이블 | 1 | migration SQL | 10m |
| 1.2 | usage 테이블 | 1 | migration SQL | 10m |
| 1.3 | plan_config 테이블 | 1 | migration SQL | 10m |
| 1.4 | **Stripe 계정 생성 (Taehyeon)** | 1 | — | 30m |
| 2.1 | Stripe SDK 설치 | 2 | package.json | 5m |
| 2.2 | Stripe client 유틸 | 2 | src/lib/stripe/* | 15m |
| 2.3 | Checkout API | 2 | api/stripe/checkout | 30m |
| 2.4 | Webhook 엔드포인트 | 2 | api/stripe/webhook | 45m |
| 2.5 | Customer Portal API | 2 | api/stripe/portal | 20m |
| 2.6 | usage 카운트 연동 | 2 | webhook + RPC | 20m |
| 2.7 | plan 제한 guard | 2 | lib/plan-guard + webhook | 30m |
| 3.1 | 요금제 비교 페이지 | 3 | pricing/page | 45m |
| 3.2 | 대시보드 사용량 UI | 3 | dashboard/page | 30m |
| 3.3 | 업그레이드 배너 | 3 | dashboard/page | 15m |
| 3.4 | Settings 구독 관리 | 3 | settings/page | 15m |
| 3.5 | 계정 연결 제한 | 3 | api/accounts/connect | 20m |
| 4.1 | Vercel 환경변수 | 4 | — | 10m |
| 4.2 | Webhook 등록 (Taehyeon) | 4 | — | 15m |
| 4.3 | Portal 설정 (Taehyeon) | 4 | — | 15m |
| 4.4 | E2E 테스트 | 4 | — | 30m |

**총 예상 시간:** ~7-8시간 (개발 5-6시간 + Taehyeon 작업 1-2시간)

---

## Risks & Open Questions

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Stripe 한국 결제 활성화 지연 | 결제 연동 불가 | Stripe Korea 지원팀 컨택, 대안으로 포트원 |
| 요금제 가격 미확정 | Price ID 생성 불가 | 가격 확정 후 Task 1.4 진행 |
| `users` 테이블에 `stripe_customer_id` 컬럼 없음 | migration 추가 필요 | Task 1.1과 함께 추가 |
| 현재 webhook이 service_role로 전체 BYPASS | plan 제한이 무시될 수 있음 | service_role 사용은 유지하되, plan-guard에서 명시적 체크 |
| 무료 → Pro 전환 시 일할 계산 | Stripe가 자동 처리 | Stripe 기본 동작 의존 |

**Open Questions (Taehyeon 결정 필요):**
1. ~~결제 서비스: Stripe? 포트원? 토스?~~ → **Stripe** (가정)
2. **요금제 가격**: ₩19,900 / ₩49,900 확정?
3. **무료 플랜 DM 한도**: 100건/월 적절?
4. **Stripe 계정**: 개인이름 or 법인명?

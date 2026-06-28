import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'

// Instagram DM buttons are capped at 3, so enforce the same per post.
const MAX_PRODUCTS_PER_POST = 3

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/posts/[id]/products — list a post's products, ordered by sort_order.
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await getServiceClient()

  const { data, error } = await supabase
    .from('products')
    .select('id, product_name, affiliate_url, sort_order')
    .eq('post_id', id)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ data })
}

// POST /api/posts/[id]/products — add a product (max 3 per post).
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const { product_name, affiliate_url } = (await request.json()) as {
    product_name?: string
    affiliate_url?: string
  }

  if (!product_name?.trim() || !affiliate_url?.trim()) {
    return NextResponse.json(
      { error: 'product_name and affiliate_url are required.' },
      { status: 400 }
    )
  }
  // Instagram only accepts https URLs.
  if (!/^https:\/\//i.test(affiliate_url)) {
    return NextResponse.json(
      { error: 'affiliate_url must start with https://.' },
      { status: 400 }
    )
  }

  const supabase = await getServiceClient()

  // Enforce the 3-product cap; also use the count as the next sort_order.
  const { count, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', id)

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 })
  }
  if ((count ?? 0) >= MAX_PRODUCTS_PER_POST) {
    return NextResponse.json(
      { error: `제품은 게시물당 최대 ${MAX_PRODUCTS_PER_POST}개까지 등록할 수 있습니다.` },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      post_id: id,
      product_name: product_name.trim(),
      affiliate_url: affiliate_url.trim(),
      sort_order: count ?? 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ data }, { status: 201 })
}

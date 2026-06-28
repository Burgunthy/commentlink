import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string; productId: string }> }

// PATCH /api/posts/[id]/products/[productId] — update name and/or url.
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { productId } = await context.params
  const { product_name, affiliate_url } = (await request.json()) as {
    product_name?: string
    affiliate_url?: string
  }

  const update: Record<string, unknown> = {}
  if (product_name !== undefined) update.product_name = product_name.trim()
  if (affiliate_url !== undefined) {
    if (!/^https:\/\//i.test(affiliate_url)) {
      return NextResponse.json(
        { error: 'affiliate_url must start with https://.' },
        { status: 400 }
      )
    }
    update.affiliate_url = affiliate_url.trim()
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const supabase = await getServiceClient()
  const { data, error } = await supabase
    .from('products')
    .update(update)
    .eq('id', productId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ data })
}

// DELETE /api/posts/[id]/products/[productId] — remove a product.
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { productId } = await context.params
  const supabase = await getServiceClient()

  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

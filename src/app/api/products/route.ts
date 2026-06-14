import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'

// GET /api/products — list all products
export async function GET() {
  try {
    const supabase = await getServiceClient()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[products GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/products — create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      link_url,
      image_url,
      price,
      discount_rate,
    } = body as {
      name?: string
      description?: string
      link_url?: string
      image_url?: string
      price?: number
      discount_rate?: number
    }

    // Validate required fields
    if (!name || !link_url) {
      return NextResponse.json(
        { error: 'name and link_url fields are required.' },
        { status: 400 }
      )
    }

    const supabase = await getServiceClient()

    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        description: description || null,
        link_url,
        image_url: image_url || null,
        price: price || null,
        discount_rate: discount_rate || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[products POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

// LemonSqueezy does not expose a hosted customer-portal URL the way Polar does.
// For now, point managing subscribers at the pricing page (the L/S dashboard
// handles cancellation/billing on their side). Upgrade this to a real portal
// session once the L/S customer-portal API is wired.
export async function GET() {
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pricing`)
}

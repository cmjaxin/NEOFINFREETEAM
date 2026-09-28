import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Fetch all plans for this email
    const { data: plans, error } = await supabase
      .from('calculator_plans')
      .select('*')
      .eq('email', email.toLowerCase())
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Plans fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }

    return NextResponse.json({ plans: plans || [] })
  } catch (error) {
    console.error('Plans API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, planData } = await request.json()

    if (!email || !planData) {
      return NextResponse.json({ error: 'Email and plan data required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Insert or update plan
    const { data: plan, error } = await supabase
      .from('calculator_plans')
      .insert({
        email: email.toLowerCase(),
        name: name || `Plan ${new Date().toLocaleDateString()}`,
        plan_data: planData,
      })
      .select()
      .single()

    if (error) {
      console.error('Plan save error:', error)
      return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error('Save plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, email, name, planData } = await request.json()

    if (!id || !email || !planData) {
      return NextResponse.json({ error: 'ID, email, and plan data required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Update plan
    const { data: plan, error } = await supabase
      .from('calculator_plans')
      .update({
        name,
        plan_data: planData,
        updated_at: new Date(),
      })
      .eq('id', id)
      .eq('email', email.toLowerCase())
      .select()
      .single()

    if (error) {
      console.error('Plan update error:', error)
      return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error('Update plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, email } = await request.json()

    if (!id || !email) {
      return NextResponse.json({ error: 'ID and email required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase
      .from('calculator_plans')
      .delete()
      .eq('id', id)
      .eq('email', email.toLowerCase())

    if (error) {
      console.error('Plan delete error:', error)
      return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

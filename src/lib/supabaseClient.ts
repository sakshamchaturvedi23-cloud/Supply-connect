import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definition for database rows
export type DisruptionRow = {
  id: string
  title: string
  category: string
  severity: string
  location: string
  description: string
  impact: string
  created_at: string
}

export interface Env {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

export interface KeyFact {
  label: string
  value: string
}

export interface ProviderFaq {
  q: string
  a: string
}

export interface ProviderRow {
  id: string
  slug: string
  review_slug: string | null
  name: string
  badge: string
  rating: number | null
  review_count: number | null
  starting_price: number | null
  plan_label: string | null
  best_for: string | null
  coverage_level: string | null
  safari_coverage: string | null
  setup_time: string | null
  short_description: string | null
  pros: string[]
  cons: string[]
  networks: string[]
  review_ideal_for: string[]
  review_not_ideal_for: string[]
  review_summary: string | null
  review_verdict: string | null
  review_faqs: ProviderFaq[]
  key_facts: KeyFact[]
}

export interface ProviderPlanRow {
  id: string
  provider_id: string
  data_amount: string | null
  duration_days: number | null
  price: number | null
  is_unlimited: boolean
  display_order: number
}

export interface DestinationRow {
  slug: string
  name: string
  location_type: string
  top_provider_slugs: string[]
  coverage_overview: string | null
  network_advice: string | null
}

export interface ParkCoverageRow {
  park_slug: string
  provider_id: string
  coverage_level: string
  notes: string | null
}

export interface ComparisonCategory {
  name: string
  winner: 'a' | 'b' | 'tie'
  detail: string
}

export interface ComparisonRow {
  slug: string
  provider_a_id: string
  provider_b_id: string
  title: string
  intro: string | null
  categories: ComparisonCategory[]
  verdict: string | null
  verdict_winner: 'a' | 'b' | 'tie'
  verdict_summary: string | null
}

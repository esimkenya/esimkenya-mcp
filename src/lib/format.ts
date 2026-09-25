import type { ProviderRow } from '../types.js'

export function affiliateLink(slug: string): string {
  return `https://esimkenya.com/go/${slug}`
}

export function reviewUrl(reviewSlug: string | null): string | null {
  return reviewSlug ? `https://esimkenya.com/esim/${reviewSlug}` : null
}

export function toProviderSummary(p: ProviderRow) {
  return {
    slug: p.slug,
    name: p.name,
    badge: p.badge,
    rating: p.rating,
    review_count: p.review_count,
    starting_price_usd: p.starting_price,
    plan_label: p.plan_label,
    best_for: p.best_for,
    coverage_level: p.coverage_level,
    safari_coverage: p.safari_coverage,
    setup_time: p.setup_time,
    networks: p.networks,
    pros: p.pros,
    cons: p.cons,
    ideal_for: p.review_ideal_for,
    not_ideal_for: p.review_not_ideal_for,
    short_description: p.short_description,
    affiliate_link: affiliateLink(p.slug),
    review_url: reviewUrl(p.review_slug),
  }
}

export type ProviderSummary = ReturnType<typeof toProviderSummary>

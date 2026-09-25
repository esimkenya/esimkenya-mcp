import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Env, ProviderRow, DestinationRow, ParkCoverageRow } from '../types.js'
import { getSupabase } from '../supabase.js'
import { toProviderSummary } from '../lib/format.js'
import { PROVIDER_COLUMNS } from '../lib/columns.js'

export function registerListProviders(server: McpServer, env: Env) {
  server.registerTool(
    'list_esim_providers',
    {
      title: 'List eSIM providers for Kenya',
      description:
        'Search and list eSIM providers available in Kenya, with pricing, ratings, coverage, and descriptive fields (best_for, ideal_for/not_ideal_for, pros/cons). Optionally filter by a Kenya destination slug (national park, city, airport, beach, or island) to see providers editorially recommended there, with park-level coverage notes when available. This is the primary lookup tool — reason over the returned structured fields yourself to answer "best for X" style questions rather than expecting a pre-computed ranking.',
      inputSchema: {
        destination_slug: z
          .string()
          .optional()
          .describe('Slug of a Kenya destination, e.g. "maasai-mara", "nairobi", "diani-beach". Filters to providers recommended for that location.'),
        badge: z.enum(['top_pick', 'popular', 'budget', 'unlimited']).optional(),
        safari_coverage: z.enum(['yes', 'partial', 'no']).optional(),
        min_rating: z.number().min(0).max(5).optional(),
        max_price_usd: z.number().positive().optional(),
        sort_by: z.enum(['rating', 'price', 'display_order']).default('display_order'),
        limit: z.number().int().positive().max(50).default(20),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      try {
        const supabase = getSupabase(env)

        let destinationContext: { slug: string; name: string; coverage_overview: string | null; network_advice: string | null } | null = null
        let allowedSlugs: string[] | null = null
        let parkCoverageByProviderId: Map<string, { coverage_level: string; notes: string | null }> | null = null

        if (args.destination_slug) {
          const { data: destinationData } = await supabase
            .from('destinations')
            .select('slug,name,location_type,top_provider_slugs,coverage_overview,network_advice')
            .eq('slug', args.destination_slug)
            .eq('is_active', true)
            .single()

          if (!destinationData) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    count: 0,
                    destination_context: null,
                    providers: [],
                    warning: `Unknown destination_slug "${args.destination_slug}"`,
                  }),
                },
              ],
            }
          }

          const destination = destinationData as DestinationRow
          destinationContext = {
            slug: destination.slug,
            name: destination.name,
            coverage_overview: destination.coverage_overview,
            network_advice: destination.network_advice,
          }
          allowedSlugs = destination.top_provider_slugs

          if (destination.location_type === 'national_park') {
            const { data: coverageData } = await supabase
              .from('park_coverage')
              .select('park_slug,provider_id,coverage_level,notes')
              .eq('park_slug', args.destination_slug)
            const coverage = (coverageData ?? []) as ParkCoverageRow[]
            if (coverage.length) {
              parkCoverageByProviderId = new Map(coverage.map((c) => [c.provider_id, { coverage_level: c.coverage_level, notes: c.notes }]))
            }
          }
        }

        let query = supabase.from('providers').select(PROVIDER_COLUMNS).eq('is_active', true).order('display_order')
        if (allowedSlugs) query = query.in('slug', allowedSlugs)

        const { data, error } = await query
        if (error) throw new Error(error.message)

        let providers = ((data ?? []) as ProviderRow[]).map((p) => {
          const summary = toProviderSummary(p)
          const note = parkCoverageByProviderId?.get(p.id)
          return note ? { ...summary, park_coverage_note: note } : summary
        })

        if (args.badge) providers = providers.filter((p) => p.badge === args.badge)
        if (args.safari_coverage) providers = providers.filter((p) => p.safari_coverage === args.safari_coverage)
        if (args.min_rating !== undefined) {
          const minRating = args.min_rating
          providers = providers.filter((p) => (p.rating ?? 0) >= minRating)
        }
        if (args.max_price_usd !== undefined) {
          const maxPrice = args.max_price_usd
          providers = providers.filter((p) => (p.starting_price_usd ?? Infinity) <= maxPrice)
        }

        if (args.sort_by === 'rating') {
          providers.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        } else if (args.sort_by === 'price') {
          providers.sort((a, b) => (a.starting_price_usd ?? Infinity) - (b.starting_price_usd ?? Infinity))
        }

        providers = providers.slice(0, args.limit)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ count: providers.length, destination_context: destinationContext, providers }),
            },
          ],
        }
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `list_esim_providers failed: ${err instanceof Error ? err.message : String(err)}` }],
        }
      }
    },
  )
}

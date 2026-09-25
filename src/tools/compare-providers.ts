import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Env, ProviderRow, ComparisonRow } from '../types.js'
import { getSupabase } from '../supabase.js'
import { affiliateLink, toProviderSummary } from '../lib/format.js'
import { PROVIDER_COLUMNS } from '../lib/columns.js'

export function registerCompareProviders(server: McpServer, env: Env) {
  server.registerTool(
    'compare_esim_providers',
    {
      title: 'Compare two eSIM providers for Kenya',
      description:
        'Compare two eSIM providers by slug. Returns esimkenya.com\'s curated head-to-head verdict when one exists for that pair, otherwise returns both providers\' full details side by side so you can compare them yourself. Use list_esim_providers first to find provider slugs.',
      inputSchema: {
        provider_a_slug: z.string().describe('First provider slug, e.g. "airalo".'),
        provider_b_slug: z.string().describe('Second provider slug, e.g. "holafly".'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      try {
        const supabase = getSupabase(env)

        const [providerAResult, providerBResult] = await Promise.all([
          supabase.from('providers').select(PROVIDER_COLUMNS).eq('slug', args.provider_a_slug).eq('is_active', true).single(),
          supabase.from('providers').select(PROVIDER_COLUMNS).eq('slug', args.provider_b_slug).eq('is_active', true).single(),
        ])

        const missing: string[] = []
        if (providerAResult.error || !providerAResult.data) missing.push(args.provider_a_slug)
        if (providerBResult.error || !providerBResult.data) missing.push(args.provider_b_slug)
        if (missing.length) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: `No active provider found for slug(s): ${missing.join(', ')}.` }],
          }
        }

        const providerA = providerAResult.data as ProviderRow
        const providerB = providerBResult.data as ProviderRow

        const { data: comparisonData, error: comparisonError } = await supabase
          .from('comparisons')
          .select('slug,provider_a_id,provider_b_id,title,intro,categories,verdict,verdict_winner,verdict_summary')
          .eq('is_published', true)
          .or(
            `and(provider_a_id.eq.${providerA.id},provider_b_id.eq.${providerB.id}),and(provider_a_id.eq.${providerB.id},provider_b_id.eq.${providerA.id})`,
          )
          .maybeSingle()

        if (comparisonError) throw new Error(comparisonError.message)

        const providerARef = { slug: providerA.slug, name: providerA.name, affiliate_link: affiliateLink(providerA.slug) }
        const providerBRef = { slug: providerB.slug, name: providerB.name, affiliate_link: affiliateLink(providerB.slug) }

        if (comparisonData) {
          const comparison = comparisonData as ComparisonRow
          // The comparison row's "a"/"b" may not match the caller's argument order — resolve to actual slugs.
          const slugForSide = (side: 'a' | 'b' | 'tie'): string | 'tie' => {
            if (side === 'tie') return 'tie'
            const sideProviderId = side === 'a' ? comparison.provider_a_id : comparison.provider_b_id
            return sideProviderId === providerA.id ? providerA.slug : providerB.slug
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  provider_a: providerARef,
                  provider_b: providerBRef,
                  curated: true,
                  comparison: {
                    title: comparison.title,
                    intro: comparison.intro,
                    categories: comparison.categories.map((cat) => ({
                      name: cat.name,
                      winner_slug: slugForSide(cat.winner),
                      detail: cat.detail,
                    })),
                    verdict: comparison.verdict,
                    verdict_winner_slug: slugForSide(comparison.verdict_winner),
                    verdict_summary: comparison.verdict_summary,
                  },
                }),
              },
            ],
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                provider_a: providerARef,
                provider_b: providerBRef,
                curated: false,
                providers: [toProviderSummary(providerA), toProviderSummary(providerB)],
              }),
            },
          ],
        }
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `compare_esim_providers failed: ${err instanceof Error ? err.message : String(err)}` }],
        }
      }
    },
  )
}

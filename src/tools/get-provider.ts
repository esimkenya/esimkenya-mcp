import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Env, ProviderRow, ProviderPlanRow } from '../types.js'
import { getSupabase } from '../supabase.js'
import { toProviderSummary } from '../lib/format.js'
import { PROVIDER_COLUMNS } from '../lib/columns.js'

export function registerGetProvider(server: McpServer, env: Env) {
  server.registerTool(
    'get_esim_provider',
    {
      title: 'Get eSIM provider details and plans',
      description:
        'Get full details for a single eSIM provider by slug, including its review summary/verdict, key facts, FAQs, and every available plan (data amount, duration, price in USD). Use list_esim_providers first to find a provider slug.',
      inputSchema: {
        slug: z.string().describe('Provider slug, e.g. "airalo", "holafly", "safari-esim".'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      try {
        const supabase = getSupabase(env)

        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select(PROVIDER_COLUMNS)
          .eq('slug', args.slug)
          .eq('is_active', true)
          .single()

        if (providerError || !providerData) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: `No active provider found for slug "${args.slug}".` }],
          }
        }

        const provider = providerData as ProviderRow

        const { data: plansData, error: plansError } = await supabase
          .from('provider_plans')
          .select('id,provider_id,data_amount,duration_days,price,is_unlimited,display_order')
          .eq('provider_id', provider.id)
          .order('display_order')

        if (plansError) throw new Error(plansError.message)

        const plans = ((plansData ?? []) as ProviderPlanRow[]).map((plan) => ({
          data_amount: plan.data_amount,
          duration_days: plan.duration_days,
          price_usd: plan.price,
          is_unlimited: plan.is_unlimited,
          label: `${plan.data_amount ?? '?'} / ${plan.duration_days ?? '?'} days`,
        }))

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                provider: {
                  ...toProviderSummary(provider),
                  review_summary: provider.review_summary,
                  review_verdict: provider.review_verdict,
                  key_facts: provider.key_facts,
                  review_faqs: provider.review_faqs,
                },
                plans,
              }),
            },
          ],
        }
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `get_esim_provider failed: ${err instanceof Error ? err.message : String(err)}` }],
        }
      }
    },
  )
}

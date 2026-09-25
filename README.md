# eSIM Kenya MCP Server

A read-only [MCP](https://modelcontextprotocol.io) server exposing live eSIM provider, plan, pricing, and coverage data for Kenya from [esimkenya.com](https://esimkenya.com). It lets AI assistants answer questions like "what's the best eSIM for Kenya / Maasai Mara / Nairobi" with current data instead of stale scraped content, and hand back a ready affiliate link.

Live endpoint: `https://mcp.esimkenya.com/mcp`
Also listed in the [official MCP Registry](https://registry.modelcontextprotocol.io) as `com.esimkenya/mcp`.

## Tools

- **`list_esim_providers`** — search/filter providers by Kenya destination, badge, safari coverage, rating, or price. Optionally enriches results with park-level coverage notes.
- **`get_esim_provider`** — full detail and plan tiers for a single provider by slug.
- **`compare_esim_providers`** — returns esimkenya.com's curated head-to-head verdict for a pair of providers when one exists, otherwise both providers' full details side by side.

Every provider response includes an `affiliate_link` (`https://esimkenya.com/go/{slug}`).

## Stack

`McpServer` + `WebStandardStreamableHTTPServerTransport` from [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk), running stateless in a Cloudflare Worker `fetch` handler — no Durable Object needed since every request is independent. Data comes from the same Supabase project as the main site, read via the public anon key (RLS-gated; no write access, no service-role key).

## Development

```bash
npm install
npm run dev        # wrangler dev, serves at http://localhost:8787
npm run typecheck
```

Smoke test with the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector@latest
# connect via Streamable HTTP to http://localhost:8787/mcp
```

## Deployment

```bash
npm run deploy      # wrangler deploy
```

Requires `SUPABASE_URL` / `SUPABASE_ANON_KEY` (set in `wrangler.toml` `[vars]` — safe to commit, this is the anon key already shipped in the main site's browser bundle and gated by RLS).

## License

MIT

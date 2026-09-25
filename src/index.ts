import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { Env } from './types.js'
import { buildServer } from './server.js'
import { corsPreflight, withCors } from './lib/cors.js'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return corsPreflight()

    const url = new URL(request.url)

    if (url.pathname === '/') {
      return withCors(Response.json({ name: 'esim-kenya-mcp', status: 'ok', mcp_endpoint: '/mcp' }))
    }

    if (url.pathname !== '/mcp') {
      return withCors(new Response('Not found', { status: 404 }))
    }

    const server = buildServer(env)
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    await server.connect(transport)

    const response = await transport.handleRequest(request)
    return withCors(response)
  },
} satisfies ExportedHandler<Env>

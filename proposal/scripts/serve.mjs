import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

const file = new URL('../dist/index.html', import.meta.url)
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  if (!['/', '/index.html', '/favicon.ico'].includes(path)) { response.writeHead(404); response.end('Not found'); return }
  if (path === '/favicon.ico') { response.writeHead(204); response.end(); return }
  try {
    const html = await readFile(file)
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(request.method === 'HEAD' ? undefined : html)
  } catch { response.writeHead(503); response.end('Build the proposal first: npm run build') }
})
server.listen(5196, '127.0.0.1', () => console.log('Echo proposal preview: http://127.0.0.1:5196/'))

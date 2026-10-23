import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appUrl } from '../source/demo-model.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = path => readFile(resolve(root, path), 'utf8')
const jpeg = async path => `data:image/jpeg;base64,${(await readFile(resolve(root, path))).toString('base64')}`
const png = async path => `data:image/png;base64,${(await readFile(resolve(root, path))).toString('base64')}`
const model = (await read('source/demo-model.mjs')).replace(/^export /gm, '')
const script = `${model}\n${await read('source/app.js')}`.replace(/<\/script/gi, '<\\/script')
const values = {
  '{{STYLES}}': await read('source/styles.css'),
  '{{SCRIPT}}': script,
  '{{HERO_IMAGE}}': await jpeg('assets/studio-after-hours.jpg'),
  '{{PRODUCT_IMAGE}}': await png('assets/echo-actual-interface.png'),
  '{{APP_URL}}': appUrl,
}
let html = await read('source/index.html')
for (const [key, value] of Object.entries(values)) html = html.replaceAll(key, () => value)
if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error('存在未替换的构建标记')
await mkdir(resolve(root, 'dist'), { recursive: true })
await writeFile(resolve(root, 'dist/index.html'), html)
console.log(`Built standalone proposal HTML: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`)

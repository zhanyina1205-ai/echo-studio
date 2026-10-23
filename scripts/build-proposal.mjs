import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import '../proposal/scripts/build.mjs'

await mkdir(new URL('../dist/proposal/', import.meta.url), { recursive: true })
await copyFile(new URL('../proposal/dist/index.html', import.meta.url), new URL('../dist/proposal/index.html', import.meta.url))
await writeFile(new URL('../dist/.nojekyll', import.meta.url), '')
console.log('App and proposal ready in dist/ and dist/proposal/')

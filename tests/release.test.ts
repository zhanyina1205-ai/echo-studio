import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('public release configuration', () => {
  it('routes proposal entry points back to the public GitHub Pages app', () => {
    const model = readFileSync('proposal/source/demo-model.mjs', 'utf8')
    const build = readFileSync('proposal/scripts/build.mjs', 'utf8')
    const styles = readFileSync('proposal/source/styles.css', 'utf8')
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(model).toContain("appUrl = 'https://zhanyina1205-ai.github.io/echo-studio/'")
    expect(build).toContain("'{{APP_URL}}': appUrl")
    expect(styles).toContain('zhanyina1205-ai.github.io/echo-studio/')
    expect(`${model}${build}${styles}`).not.toContain('.chatgpt.site')
    expect(app).toContain('href="./proposal/"')
  })

  it('excludes private hosting identity and runtime files from the release copy', () => {
    expect(existsSync('.openai')).toBe(false)
    expect(existsSync('proposal/.openai')).toBe(false)
    const ignore = readFileSync('.gitignore', 'utf8').split('\n')
    for (const entry of ['.openai/', '.env*', 'qa/', 'backups/', 'node_modules/', 'dist/']) expect(ignore).toContain(entry)
  })

  it('builds both static entry points with a project-relative app base', () => {
    const config = readFileSync('vite.config.ts', 'utf8')
    const script = readFileSync('scripts/build-proposal.mjs', 'utf8')
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(config).toContain("base: './'")
    expect(script).toContain('../dist/proposal/index.html')
    expect(pkg.scripts.build).toContain('node scripts/build-proposal.mjs')
    expect(pkg.scripts.test).toContain('npm --prefix proposal test')
  })
})

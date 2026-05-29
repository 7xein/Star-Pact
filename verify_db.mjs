import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'dev.db')
const db = new Database(dbPath)

const countries = db.prepare('SELECT name, color FROM Country ORDER BY name').all()

console.log('Countries in database:')
countries.forEach(c => {
  console.log(`  ${c.name}: ${c.color}`)
})

console.log(`\nTotal countries: ${countries.length}`)

db.close()

/**
 * Migration Script: Add mobile numbers to existing authorized_emails documents
 *
 * Usage:
 *   1. Fill in the USERS array below with { email, mobile } pairs
 *      OR provide a CSV file path as argument: node migrate-to-mobile.js users.csv
 *
 *   CSV format (no header row needed):
 *     email,mobile
 *     student1@gmail.com,9876543210
 *     student2@gmail.com,9123456780
 *
 *   2. Run: node migrate-to-mobile.js
 */

require('dotenv').config()
const { MongoClient } = require('mongodb')
const fs   = require('fs')
const path = require('path')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error('❌ MONGODB_URI not set in .env'); process.exit(1) }

// ── Option A: hardcode here ───────────────────────────────────────────────────
// Fill this array if you don't want to use a CSV file
const USERS = [
  // { email: 'student1@gmail.com', mobile: '9876543210' },
  // { email: 'student2@gmail.com', mobile: '9123456780' },
]

// ── Option B: CSV file ────────────────────────────────────────────────────────
function loadFromCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  return lines
    .map(line => {
      const parts = line.split(',').map(p => p.trim())
      // Support both "email,mobile" and "mobile,email" — detect by @ sign
      const email  = parts.find(p => p.includes('@')) || ''
      const mobile = parts.find(p => !p.includes('@') && p.length >= 10) || ''
      return { email, mobile }
    })
    .filter(u => u.email && u.mobile)
}

async function migrate(users) {
  if (users.length === 0) {
    console.error('❌ No users to migrate. Fill USERS array or provide a CSV file.')
    process.exit(1)
  }

  console.log(`\n🔄 Starting migration for ${users.length} users...\n`)

  const client = await MongoClient.connect(MONGODB_URI)
  const col    = client.db().collection('authorized_emails')

  let updated  = 0
  let notFound = 0
  let skipped  = 0

  for (const { email, mobile } of users) {
    const existing = await col.findOne({ email: email.toLowerCase() })

    if (!existing) {
      console.log(`  ⚠️  Not found: ${email}`)
      notFound++
      continue
    }

    if (existing.mobile) {
      console.log(`  ⏭️  Already has mobile (${existing.mobile}): ${email}`)
      skipped++
      continue
    }

    await col.updateOne(
      { email: email.toLowerCase() },
      { $set: { mobile: mobile.trim() } }
    )
    console.log(`  ✅ Updated: ${email} → ${mobile}`)
    updated++
  }

  await client.close()

  console.log(`\n📊 Migration complete:`)
  console.log(`   ✅ Updated  : ${updated}`)
  console.log(`   ⏭️  Skipped  : ${skipped} (already had mobile)`)
  console.log(`   ⚠️  Not found: ${notFound} (email not in DB)\n`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
const csvArg = process.argv[2]
let users = USERS

if (csvArg) {
  const filePath = path.resolve(csvArg)
  if (!fs.existsSync(filePath)) {
    console.error(`❌ CSV file not found: ${filePath}`)
    process.exit(1)
  }
  users = loadFromCSV(filePath)
  console.log(`📂 Loaded ${users.length} users from ${filePath}`)
}

migrate(users).catch(err => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})

require('dotenv').config()
const express  = require('express')
const { MongoClient } = require('mongodb')
const cors     = require('cors')
const path     = require('path')

const app  = express()
const PORT = process.env.PORT || 4000
const MONGODB_URI     = process.env.MONGODB_URI
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD || 'admin123'

if (!MONGODB_URI) { console.error('❌ MONGODB_URI not set in .env'); process.exit(1) }

// ── MongoDB ───────────────────────────────────────────────────────────────────
let db
MongoClient.connect(MONGODB_URI)
  .then(client => {
    db = client.db()
    console.log('✅ MongoDB connected')
  })
  .catch(err => { console.error('MongoDB error:', err); process.exit(1) })

const getCol = () => db.collection('authorized_emails')

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// ── Simple admin auth middleware ──────────────────────────────────────────────
function adminAuth(req, res, next) {
  const pwd = req.headers['x-admin-password']
  if (pwd !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET all authorized emails
app.get('/api/emails', adminAuth, async (req, res) => {
  try {
    const emails = await getCol().find({}).sort({ addedAt: -1 }).toArray()
    res.json(emails)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST add email(s)
app.post('/api/emails', adminAuth, async (req, res) => {
  try {
    const { emails } = req.body  // array of email strings
    if (!Array.isArray(emails) || emails.length === 0)
      return res.status(400).json({ error: 'emails array required' })

    const normalized = emails.map(e => e.trim().toLowerCase()).filter(Boolean)
    const ops = normalized.map(email => ({
      updateOne: {
        filter: { email },
        update: { $setOnInsert: { email, addedAt: new Date() } },
        upsert: true
      }
    }))
    const result = await getCol().bulkWrite(ops)
    res.json({ added: result.upsertedCount, existing: result.matchedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE email
app.delete('/api/emails/:email', adminAuth, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase()
    const result = await getCol().deleteOne({ email })
    res.json({ deleted: result.deletedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// UPDATE download limit
app.patch('/api/emails/:email/limit', adminAuth, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase()
    const { downloadLimit } = req.body
    if (typeof downloadLimit !== 'number' || downloadLimit < 0) 
      return res.status(400).json({ error: 'Invalid download limit' })
    
    const result = await getCol().updateOne(
      { email },
      { $set: { downloadLimit } }
    )
    res.json({ modified: result.modifiedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUBLIC: verify email (called from main website) ───────────────────────────
app.post('/api/verify', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ authorized: false })
    const found = await getCol().findOne({ email: email.trim().toLowerCase() })
    res.json({ authorized: !!found })
  } catch (e) { res.status(500).json({ authorized: false }) }
})

// ── Serve index.html for root path ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Admin panel running on http://localhost:${PORT}`))

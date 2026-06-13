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

const getCol = () => db.collection('authorized_users')

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

// GET all authorized users
app.get('/api/emails', adminAuth, async (req, res) => {
  try {
    const users = await getCol().find({}).sort({ addedAt: -1 }).toArray()
    res.json(users)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST add mobile number(s)
app.post('/api/emails', adminAuth, async (req, res) => {
  try {
    const { emails } = req.body  // array of mobile number strings (kept key as 'emails' for compatibility)
    if (!Array.isArray(emails) || emails.length === 0)
      return res.status(400).json({ error: 'mobile numbers array required' })

    const normalized = emails.map(m => m.trim().replace(/\D/g, '')).filter(m => m.length >= 10)
    if (normalized.length === 0)
      return res.status(400).json({ error: 'No valid mobile numbers found' })

    const ops = normalized.map(mobile => ({
      updateOne: {
        filter: { mobile },
        update: { $setOnInsert: { mobile, addedAt: new Date(), downloadLimit: 5, downloads: 0 } },
        upsert: true
      }
    }))
    const result = await getCol().bulkWrite(ops)
    res.json({ added: result.upsertedCount, existing: result.matchedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE user by mobile
app.delete('/api/emails/:mobile', adminAuth, async (req, res) => {
  try {
    const mobile = decodeURIComponent(req.params.mobile)
    const result = await getCol().deleteOne({ mobile })
    res.json({ deleted: result.deletedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// UPDATE download limit by mobile
app.patch('/api/emails/:mobile/limit', adminAuth, async (req, res) => {
  try {
    const mobile = decodeURIComponent(req.params.mobile)
    const { downloadLimit } = req.body
    if (typeof downloadLimit !== 'number' || downloadLimit < 0) 
      return res.status(400).json({ error: 'Invalid download limit' })
    
    const result = await getCol().updateOne(
      { mobile },
      { $set: { downloadLimit } }
    )
    res.json({ modified: result.modifiedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUBLIC: verify mobile number (called from main website) ───────────────────
app.post('/api/verify', async (req, res) => {
  try {
    const { mobile } = req.body
    if (!mobile) return res.status(400).json({ authorized: false })
    const cleaned = mobile.trim().replace(/\D/g, '')
    const found = await getCol().findOne({ mobile: cleaned })
    if (!found) return res.json({ authorized: false })

    // Check download limit
    const limit = found.downloadLimit ?? 5
    const used  = found.downloads   ?? 0
    if (used >= limit) return res.json({ authorized: false, reason: 'limit_exceeded' })

    res.json({ authorized: true })
  } catch (e) { res.status(500).json({ authorized: false }) }
})

// ── Serve index.html for root path ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Admin panel running on http://localhost:${PORT}`))

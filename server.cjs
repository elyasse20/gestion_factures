/**
 * server.cjs — Serveur JSON personnalisé avec IDs auto-incrémentés
 * Remplace json-server beta qui génère des nanoids aléatoires
 */
const http = require('http')
const fs   = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, 'db.json')
const PORT    = 3001

// ── Lecture / écriture de la BDD ──────────────────────────────────────────
function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
}
function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

// Calcule le prochain ID entier pour une collection
function nextId(collection) {
  if (!collection.length) return 1
  return Math.max(...collection.map(item => Number(item.id) || 0)) + 1
}

// ── Parsing du body ───────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => (data += chunk))
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) }
      catch (e) { reject(e) }
    })
  })
}

// ── Helpers HTTP ──────────────────────────────────────────────────────────
function send(res, status, body) {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(json)
}

// ── Routeur simple ────────────────────────────────────────────────────────
// Ressources supportées : articles, categories, parametres
const COLLECTIONS = ['articles', 'categories']

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  const url    = new URL(req.url, `http://localhost:${PORT}`)
  const parts  = url.pathname.split('/').filter(Boolean)  // ['categories'] ou ['categories','3']
  const resource = parts[0]
  const idParam  = parts[1]

  // ── /parametres (ressource unique) ───────────────────────────────────────
  if (resource === 'parametres') {
    const db = readDb()
    if (req.method === 'GET')  return send(res, 200, db.parametres || {})
    if (req.method === 'PUT') {
      const body = await readBody(req)
      db.parametres = body
      writeDb(db)
      return send(res, 200, db.parametres)
    }
    return send(res, 405, { error: 'Method Not Allowed' })
  }

  // ── Collections ──────────────────────────────────────────────────────────
  if (!COLLECTIONS.includes(resource)) {
    return send(res, 404, { error: 'Resource not found' })
  }

  const db = readDb()

  // GET /collection
  if (req.method === 'GET' && !idParam) {
    return send(res, 200, db[resource])
  }

  // GET /collection/:id
  if (req.method === 'GET' && idParam) {
    const item = db[resource].find(i => String(i.id) === idParam)
    if (!item) return send(res, 404, { error: 'Not found' })
    return send(res, 200, item)
  }

  // POST /collection  → crée avec ID auto-incrémenté
  if (req.method === 'POST' && !idParam) {
    const body = await readBody(req)
    const newItem = { ...body, id: nextId(db[resource]) }
    db[resource].push(newItem)
    writeDb(db)
    return send(res, 201, newItem)
  }

  // PUT /collection/:id  → remplace
  if (req.method === 'PUT' && idParam) {
    const idx = db[resource].findIndex(i => String(i.id) === idParam)
    if (idx === -1) return send(res, 404, { error: 'Not found' })
    const body = await readBody(req)
    db[resource][idx] = { ...body, id: db[resource][idx].id }
    writeDb(db)
    return send(res, 200, db[resource][idx])
  }

  // PATCH /collection/:id → mise à jour partielle
  if (req.method === 'PATCH' && idParam) {
    const idx = db[resource].findIndex(i => String(i.id) === idParam)
    if (idx === -1) return send(res, 404, { error: 'Not found' })
    const body = await readBody(req)
    db[resource][idx] = { ...db[resource][idx], ...body, id: db[resource][idx].id }
    writeDb(db)
    return send(res, 200, db[resource][idx])
  }

  // DELETE /collection/:id
  if (req.method === 'DELETE' && idParam) {
    const idx = db[resource].findIndex(i => String(i.id) === idParam)
    if (idx === -1) return send(res, 404, { error: 'Not found' })
    db[resource].splice(idx, 1)
    writeDb(db)
    return send(res, 204, null)
  }

  send(res, 405, { error: 'Method Not Allowed' })
})

server.listen(PORT, () => {
  console.log(`\n🚀  Serveur JSON démarré sur http://localhost:${PORT}`)
  console.log(`   Endpoints :`)
  COLLECTIONS.forEach(c => console.log(`   http://localhost:${PORT}/${c}`))
  console.log(`   http://localhost:${PORT}/parametres\n`)
})

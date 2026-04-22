// Base de l'API JSON (json-server par défaut).
// Permet de basculer vers une autre URL via .env.
const JSON_API_BASE = import.meta.env.VITE_JSON_API_BASE || 'http://localhost:3001'

async function request(path, options) {
  // Petit wrapper fetch:
  // - normalise l'URL
  // - applique Content-Type
  // - remonte un message d'erreur lisible
  const res = await fetch(`${JSON_API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    // Certains backends renvoient un texte utile (ex: json-server).
    const text = await res.text().catch(() => '')
    throw new Error(text || `Erreur API JSON (${res.status})`)
  }
  // 204 = No Content (pas de JSON à parser).
  return res.status === 204 ? null : await res.json()
}

export const jsonService = {
  // ── Articles ─────────────────────────────────────────────────────────────
  listArticles: () => request('/articles'),
  createArticle: async (data) => {
    // json-server n'auto-génère pas forcément un id numérique comme on veut.
    // Ici on force un id séquentiel en lisant l'existant puis +1.
    const existing = await request('/articles')
    const maxId = existing.reduce((m, a) => Math.max(m, Number(a.id) || 0), 0)
    return request('/articles', {
      method: 'POST',
      body: JSON.stringify({ ...data, id: maxId + 1 }),
    })
  },
  updateArticle: (id, data) =>
    // PUT remplace la ressource: on ré-injecte l'id pour cohérence côté API.
    request(`/articles/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, id }) }),
  deleteArticle: (id) => request(`/articles/${id}`, { method: 'DELETE' }),

  // ── Catégories ────────────────────────────────────────────────────────────
  listCategories: () => request('/categories'),
  createCategory: async (data) => {
    // Même stratégie d'id séquentiel pour les catégories.
    const existing = await request('/categories')
    const maxId = existing.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0)
    return request('/categories', {
      method: 'POST',
      body: JSON.stringify({ ...data, id: maxId + 1 }),
    })
  },
  updateCategory: (id, data) =>
    request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, id }) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // ── Paramètres ────────────────────────────────────────────────────────────
  // Paramètres "singleton": une seule ressource (ex: infos société pour PDF).
  getParams: () => request('/parametres'),
  updateParams: (data) => request('/parametres', { method: 'PUT', body: JSON.stringify(data) }),
}


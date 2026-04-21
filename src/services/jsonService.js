const JSON_API_BASE = import.meta.env.VITE_JSON_API_BASE || 'http://localhost:3001'

async function request(path, options) {
  const res = await fetch(`${JSON_API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Erreur API JSON (${res.status})`)
  }
  return res.status === 204 ? null : await res.json()
}

export const jsonService = {
  // ── Articles ─────────────────────────────────────────────────────────────
  listArticles: () => request('/articles'),
  createArticle: async (data) => {
    // Calcule le prochain ID numérique séquentiel
    const existing = await request('/articles')
    const maxId = existing.reduce((m, a) => Math.max(m, Number(a.id) || 0), 0)
    return request('/articles', {
      method: 'POST',
      body: JSON.stringify({ ...data, id: maxId + 1 }),
    })
  },
  updateArticle: (id, data) =>
    request(`/articles/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, id }) }),
  deleteArticle: (id) => request(`/articles/${id}`, { method: 'DELETE' }),

  // ── Catégories ────────────────────────────────────────────────────────────
  listCategories: () => request('/categories'),
  createCategory: async (data) => {
    // Calcule le prochain ID numérique séquentiel
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
  getParams: () => request('/parametres'),
  updateParams: (data) => request('/parametres', { method: 'PUT', body: JSON.stringify(data) }),
}


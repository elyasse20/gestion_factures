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
  listArticles: () => request('/articles'),
  createArticle: (data) => request('/articles', { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (id, data) =>
    request(`/articles/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, id }) }),
  deleteArticle: (id) => request(`/articles/${id}`, { method: 'DELETE' }),

  listCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) =>
    request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, id }) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  getParams: () => request('/parametres'),
  updateParams: (data) => request('/parametres', { method: 'PUT', body: JSON.stringify(data) }),
}


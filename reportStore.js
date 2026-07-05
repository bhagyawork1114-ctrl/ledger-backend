// In-memory store: fine for a prototype / small user base testing on real
// devices. For production, swap this Map for Redis or a database table so
// reports survive server restarts and work across multiple server instances.
const store = new Map();

function save(id, data) {
  store.set(id, { ...data, savedAt: Date.now() });
}
function get(id) {
  return store.get(id);
}
function remove(id) {
  store.delete(id);
}

// Clear anything older than 6 hours so memory doesn't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [id, val] of store.entries()) {
    if (val.savedAt < cutoff) store.delete(id);
  }
}, 30 * 60 * 1000).unref();

module.exports = { save, get, remove };

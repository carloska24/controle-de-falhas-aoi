// Cache simples em memória para relatórios
// Uso: cache.set(key, value, ttlMs); cache.get(key)
const cache = {
  _data: new Map(),
  set(key, value, ttlMs = 60000) {
    const expires = Date.now() + ttlMs;
    this._data.set(key, { value, expires });
  },
  get(key) {
    const entry = this._data.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this._data.delete(key);
      return undefined;
    }
    return entry.value;
  },
  clear() {
    this._data.clear();
  }
};

module.exports = cache;

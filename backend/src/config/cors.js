function getCorsOptions(env = process.env) {
  const origins = (env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean);
  if (env.NODE_ENV === 'production') {
    if (origins.length === 0) {
      throw new Error('CORS_ORIGIN é obrigatório em produção.');
    }
    for (const origin of origins) {
      let url;
      try { url = new URL(origin); } catch { /* Validado abaixo. */ }
      if (!url || !['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
        throw new Error('CORS_ORIGIN deve conter origens HTTP/HTTPS exatas, sem caminho ou barra final.');
      }
    }
  }
  return { origin: origins.length ? origins : env.NODE_ENV !== 'production', credentials: true };
}

module.exports = { getCorsOptions };

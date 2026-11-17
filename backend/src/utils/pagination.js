function getPagination(query) {
  const parse = (value, fallback, maximum) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw Object.assign(new Error('page e limit devem ser inteiros positivos; limit máximo 200.'), { status: 400 });
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > maximum) {
      throw Object.assign(new Error('Paginação fora do intervalo permitido.'), { status: 400 });
    }
    return number;
  };
  const page = parse(query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = parse(query.limit, 50, 200);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip) || skip > 2147483647) {
    throw Object.assign(new Error('Página fora do intervalo permitido.'), { status: 400 });
  }
  return { page, limit, skip };
}

module.exports = { getPagination };

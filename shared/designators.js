'use strict';

// A grouped occurrence may describe several physical components of the same PN.
// Missing designators exist in legacy records: preserve their original one-unit demand.
function parseDesignators(value) {
  if (value === undefined || value === null) return { designators: [], quantity: 1, error: null };
  const invalid = { designators: [], quantity: 0,
    error: 'Informe os designadores separados por vírgula, ponto e vírgula ou espaço (ex.: R1, R2, R3). Intervalos não são aceitos.' };
  if (typeof value !== 'string' || value.length > 20000) return invalid;
  const tokens = value.trim().toUpperCase().split(/[,;\s]+/).filter(Boolean);
  if (!tokens.length || tokens.length > 1000 || tokens.some(token =>
    !/^[A-Z][A-Z0-9_.-]*$/.test(token) || /\d-[A-Z]*\d/.test(token))) return invalid;
  const designators = [...new Set(tokens)];
  return { designators, quantity: designators.length, error: null };
}

module.exports = { parseDesignators };

const { parseDesignators } = require('../../shared/designators');
const { registrosBatchSchema, registroUpdateSchema } = require('../src/utils/schemas');

test.each(['R1,R2,R3', ' R1;R2 R3 ', 'r1,R1,r2,R3'])('three unique positions are counted for %s', value => {
  expect(parseDesignators(value)).toEqual({ designators: ['R1', 'R2', 'R3'], quantity: 3, error: null });
});

test.each(['', ' , ; ', 'R1-R3', 'R1/R2', 'R1 & R2', 'R1,'.repeat(1001)])('ambiguous or unbounded lists cannot become a one-unit request: %s', value => {
  expect(parseDesignators(value).error).toBeTruthy();
  expect(parseDesignators(value).quantity).toBe(0);
});

test('legacy missing positions retain their original demand while explicit positions preserve leading zeros', () => {
  expect(parseDesignators(null).quantity).toBe(1);
  expect(parseDesignators(undefined).quantity).toBe(1);
  expect(parseDesignators('R01,R1,TP1.1,U12A').quantity).toBe(4);
});

test('creation and edit accept the same list and store unique canonical designators', () => {
  const value = { om: '011452', omVersion: 0, qtdlote: 10, designador: 'r1;r2 r3 R1', tipodefeito: 'Ausente' };
  expect(registrosBatchSchema.parse([value])[0].designador).toBe('R1, R2, R3');
  expect(registroUpdateSchema.parse({ version: 0, designador: value.designador }).designador).toBe('R1, R2, R3');
  expect(registrosBatchSchema.safeParse([{ ...value, designador: 'R1-R3' }]).success).toBe(false);
  expect(registroUpdateSchema.safeParse({ version: 0, designador: 'R1/R2' }).success).toBe(false);
});

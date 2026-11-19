const { z } = require('zod');

// Schemas
const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

const userCreateSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  role: z
    .enum(['admin', 'operator', 'reparo', 'qualidade', 'almoxarifado', 'lider_smt'])
    .default('operator'),
});

const userUpdateSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1),
  role: z.enum(['admin', 'operator', 'reparo', 'qualidade', 'almoxarifado', 'lider_smt']),
  password: z.string().min(1).optional(),
});

const userPasswordSchema = z.object({
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.')
    .refine(value => value.trim().length > 0, 'Informe uma senha válida.')
    .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'A senha deve ter até 72 bytes em UTF-8.'),
}).strict();
const userIdSchema = z.object({
  id: z.string().regex(/^[1-9]\d*$/).refine(value => Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647),
});

const registroBase = {
  id: z.string().min(1),
  om: z.string().min(1),
  qtdlote: z.coerce.number().int().min(1).max(2147483647),
  serial: z.string().optional().nullable(),
  designador: z.string().min(1),
  tipodefeito: z.string().min(1),
  pn: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  createdat: z.string().min(1),
  status: z.string().min(1),
  operador: z.string().min(1),
  prioridade: z.string().optional().nullable(),
};

const registroCreateSchema = z.object(registroBase);

const registroStatusValue = z.enum(['pendente', 'em_analise', 'reparado', 'cancelado', 'sucata']);
const registroVersion = z.number().int().nonnegative();
const serialPlaca = z.string().trim().max(200);
const inspecaoPlacaSchema = z.object({
  serial: serialPlaca.min(1),
  omVersion: registroVersion,
});

const registroUpdateSchema = z.object({
  version: registroVersion,
  om: z.string().min(1).optional(),
  qtdlote: z.coerce.number().int().min(1).max(2147483647).optional(),

  // Strings opcionais: permitimos string vazia/null/undefined
  serial: z.string().optional().nullable(),
  designador: z.string().min(1).optional(),
  tipodefeito: z.string().min(1).optional(),
  pn: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  prioridade: z.string().optional().nullable(),
});

const registroBatchItemSchema = z.object({
  id: z.string().optional(),
  om: z.string().min(1),
  omVersion: z.number().int().nonnegative(),
  qtdlote: z.coerce.number().int().min(1).max(2147483647),
  serial: serialPlaca.optional().nullable(),
  designador: z.string().min(1),
  tipodefeito: z.string().min(1),
  pn: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  prioridade: z.string().optional().nullable(),
});

const registrosBatchSchema = z.array(registroBatchItemSchema).min(1).max(200);

const idsArraySchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) });
const registroStatusSchema = z.object({ status: registroStatusValue, version: registroVersion });
const registroStatusParamsSchema = z.object({ status: registroStatusValue });
const registroStatusBatchSchema = idsArraySchema.extend({ versions: z.record(registroVersion) })
  .refine(({ ids, versions }) => new Set(ids).size === ids.length && ids.every(id => Object.hasOwn(versions, id)),
    { message: 'Envie IDs únicos e a versão de cada registro.' });
const registrosDeleteSchema = registroStatusBatchSchema;
const registroDeleteSchema = z.object({ version: registroVersion });
const requisicoesCreateSchema = z.object({ registroIds: z.array(z.string().min(1)).min(1).max(200) })
  .refine(({ registroIds }) => new Set(registroIds).size === registroIds.length,
    { message: 'IDs de registros devem ser únicos.' });
const requisicaoStatusSchema = z.object({
  status: z.enum(['pendente', 'parcialmente_entregue', 'entregue']),
});
const requisicaoItensSchema = z.object({
  items: z
    .array(
      z.object({
        pn: z.string().min(1),
        descricao: z.string().optional().nullable(),
        quantidade_requisitada: z.coerce.number().int().min(0),
        quantidade_entregue: z.coerce.number().int().min(0),
      })
    )
    .min(1).max(200),
});

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source]; // ex: req.body ou req.query
    const result = schema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
      console.error('Issues:', JSON.stringify(issues, null, 2));
      return res.status(400).json({ error: 'Dados inválidos', details: issues });
    }
    // Substitui pelo objeto validado/coercido
    req[source] = result.data;
    next();
  };
}

module.exports = {
  validate,
  inspecaoPlacaSchema,
  loginSchema,
  userCreateSchema,
  userUpdateSchema,
  userPasswordSchema,
  userIdSchema,
  registroCreateSchema,
  registroUpdateSchema,
  registrosBatchSchema,
  idsArraySchema,
  registroStatusSchema,
  registroStatusParamsSchema,
  registroStatusBatchSchema,
  registrosDeleteSchema,
  registroDeleteSchema,
  requisicoesCreateSchema,
  requisicaoStatusSchema,
  requisicaoItensSchema,
};

const { z } = require('zod');

// Schemas
const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

const userCreateSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(['admin', 'operator', 'reparo', 'qualidade', 'almoxarifado']).default('operator'),
});

const userUpdateSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1),
  role: z.enum(['admin', 'operator', 'reparo', 'qualidade', 'almoxarifado']),
  password: z.string().min(1).optional(),
});

const registroBase = {
  id: z.string().min(1),
  om: z.string().min(1),
  qtdlote: z.coerce.number().int().min(1),
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
const registroUpdateSchema = z.object({
  om: z.string().min(1),
  qtdlote: z.coerce.number().int().min(1),
  serial: z.string().optional().nullable(),
  designador: z.string().min(1),
  tipodefeito: z.string().min(1),
  pn: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  prioridade: z.string().optional().nullable(),
});
const registroBatchItemSchema = z.object({
  id: z.string().optional(),
  om: z.string().min(1),
  qtdlote: z.coerce.number().int().min(1),
  serial: z.string().optional().nullable(),
  designador: z.string().min(1),
  tipodefeito: z.string().min(1),
  pn: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  prioridade: z.string().optional().nullable(),
});

const registrosBatchSchema = z.array(registroBatchItemSchema).min(1);

const idsArraySchema = z.object({ ids: z.array(z.string().min(1)).min(1) });
const registroStatusSchema = z.object({ status: z.string().min(1) });
const requisicoesCreateSchema = z.object({ registroIds: z.array(z.string().min(1)).min(1) });
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
    .min(1),
});

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source]; // ex: req.body ou req.query
    const result = schema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
      return res.status(400).json({ error: 'Dados inválidos', details: issues });
    }
    // Substitui pelo objeto validado/coercido
    req[source] = result.data;
    next();
  };
}

module.exports = {
  validate,
  loginSchema,
  userCreateSchema,
  userUpdateSchema,
  registroCreateSchema,
  registroUpdateSchema,
  registrosBatchSchema,
  idsArraySchema,
  registroStatusSchema,
  requisicoesCreateSchema,
  requisicaoStatusSchema,
  requisicaoItensSchema,
};

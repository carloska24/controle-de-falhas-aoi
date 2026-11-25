jest.mock('../src/config/prisma', () => ({
  $transaction: jest.fn(), $queryRaw: jest.fn(), registros: { create: jest.fn() },
  placas_inspecionadas: { upsert: jest.fn() },
}));
const prisma = require('../src/config/prisma');
const {createRegistros} = require('../src/services/registroCreationService');
const actor = {id:7,name:'Teste',role:'admin'};
const row = {id:'DEMO-REG-1',om:'DEMO-001',omVersion:0,serial:'SN-001',qtdlote:50,designador:'R1',tipodefeito:'Ausente'};
const date = new Date(Date.now()-7*86400000).toISOString();
const options = {demoCreatedAt:new Map([[row.id,date]])};
beforeEach(()=>{
  delete process.env.DEMO_ENABLED;
  jest.resetAllMocks();
  process.env.NODE_ENV='development';process.env.DEBUG_ROUTES_ENABLED='true';
  prisma.$transaction.mockImplementation(callback=>callback(prisma));
  prisma.$queryRaw.mockResolvedValue([{omNumber:row.om,status:'em_andamento',version:0,rastreamentoInspecao:true}]);
});
afterEach(()=>{process.env.NODE_ENV='test';process.env.DEBUG_ROUTES_ENABLED='false';delete process.env.DEMO_ENABLED;});

test('internal demo dates are persisted with the same inspection date in the normal transaction',async()=>{
  await createRegistros([row],actor,options);
  expect(prisma.registros.create).toHaveBeenCalledWith({data:expect.objectContaining({createdat:date,status:'pendente',operador:actor.name})});
  expect(prisma.placas_inspecionadas.upsert).toHaveBeenCalledWith(expect.objectContaining({
    create:expect.objectContaining({registradaEm:new Date(date),registradaPor:7}),update:{temFalha:true},
  }));
});

test('opted-in production allows internal admin DEMO dates while still rejecting real OMs and other roles', async () => {
  process.env.NODE_ENV = 'production';
  process.env.DEBUG_ROUTES_ENABLED = 'false';
  process.env.DEMO_ENABLED = 'true';
  await createRegistros([row], actor, options);
  expect(prisma.registros.create).toHaveBeenCalledWith({ data: expect.objectContaining({ createdat: date }) });
  for (const [candidate, user] of [[{ ...row, om: '011452' }, actor], [row, { ...actor, role: 'operator' }]]) {
    await expect(createRegistros([candidate], user, options)).rejects.toMatchObject({ status: 403 });
  }
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
});

test.each([['production','true','admin','DEMO-001'],['development','false','admin','DEMO-001'],
  ['development','true','operator','DEMO-001'],['development','true','admin','12345678']])(
  'backdating is blocked for env=%s flag=%s role=%s OM=%s before any write',async(env,flag,role,om)=>{
    process.env.NODE_ENV=env;process.env.DEBUG_ROUTES_ENABLED=flag;
    await expect(createRegistros([{...row,om}],{...actor,role},options)).rejects.toMatchObject({status:403});
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

test.each([new Map(),new Map([[row.id,'invalid']]),new Map([[row.id,new Date(Date.now()+86400000).toISOString()]]),
  new Map([[row.id,new Date(Date.now()-31*86400000).toISOString()]])])('invalid or missing simulated dates are rejected',async dates=>{
  await expect(createRegistros([row],actor,{demoCreatedAt:dates})).rejects.toMatchObject({status:400});
  expect(prisma.registros.create).not.toHaveBeenCalled();
});

test('normal operator submissions ignore client-provided dates and keep the server timestamp',async()=>{
  const before=Date.now();
  await createRegistros([{...row,createdat:date}],{...actor,role:'operator'});
  const saved=prisma.registros.create.mock.calls[0][0].data;
  expect(Date.parse(saved.createdat)).toBeGreaterThanOrEqual(before);
  expect(saved.createdat).not.toBe(date);
  expect(prisma.placas_inspecionadas.upsert.mock.calls[0][0].create).not.toHaveProperty('registradaEm');
});

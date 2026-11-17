-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "oms_ativas" (
    "omNumber" TEXT NOT NULL,
    "startTime" BIGINT,
    "pausedTime" BIGINT DEFAULT 0,
    "qtdlote" INTEGER,

    CONSTRAINT "oms_ativas_pkey" PRIMARY KEY ("omNumber")
);

-- CreateTable
CREATE TABLE "oms_finalizadas" (
    "omNumber" TEXT NOT NULL,
    "startTime" BIGINT,
    "endTime" BIGINT,
    "pausedTime" BIGINT,
    "qtdlote" INTEGER,

    CONSTRAINT "oms_finalizadas_pkey" PRIMARY KEY ("omNumber")
);

-- CreateTable
CREATE TABLE "oms_pausadas" (
    "omNumber" TEXT NOT NULL,
    "startTime" BIGINT,
    "pausedTime" BIGINT,
    "pauseStartedAt" BIGINT,
    "elapsedAtPause" BIGINT,
    "qtdlote" INTEGER,

    CONSTRAINT "oms_pausadas_pkey" PRIMARY KEY ("omNumber")
);

-- CreateTable
CREATE TABLE "registros" (
    "id" TEXT NOT NULL,
    "om" TEXT NOT NULL,
    "qtdlote" INTEGER,
    "serial" TEXT,
    "designador" TEXT,
    "tipodefeito" TEXT,
    "pn" TEXT,
    "descricao" TEXT,
    "obs" TEXT,
    "createdat" TEXT NOT NULL,
    "status" TEXT,
    "operador" TEXT,
    "prioridade" TEXT,

    CONSTRAINT "registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisicoes" (
    "id" SERIAL NOT NULL,
    "om" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pendente',
    "created_at" TEXT DEFAULT 'CURRENT_TIMESTAMP',
    "created_by" TEXT,

    CONSTRAINT "requisicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_registros_om" ON "registros"("om");

-- CreateIndex
CREATE INDEX "idx_registros_status" ON "registros"("status");

-- CreateIndex
CREATE INDEX "idx_registros_createdat" ON "registros"("createdat");

-- CreateIndex
CREATE INDEX "idx_registros_operador" ON "registros"("operador");

-- CreateIndex
CREATE INDEX "idx_registros_om_status" ON "registros"("om", "status");

-- CreateIndex
CREATE INDEX "idx_requisicoes_om" ON "requisicoes"("om");

-- CreateIndex
CREATE INDEX "idx_requisicoes_status" ON "requisicoes"("status");

-- CreateIndex
CREATE INDEX "idx_requisicoes_created_at" ON "requisicoes"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

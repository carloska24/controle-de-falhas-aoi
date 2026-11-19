BEGIN;
ALTER TABLE "requisicoes" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "eventos_entrega" (
  "id" TEXT NOT NULL,
  "requisicaoId" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "actorId" INTEGER NOT NULL,
  "actorName" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "motivo" TEXT,
  "antes" JSONB NOT NULL,
  "depois" JSONB NOT NULL,
  CONSTRAINT "eventos_entrega_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eventos_entrega_requisicaoId_fkey" FOREIGN KEY ("requisicaoId") REFERENCES "requisicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eventos_entrega_requisicaoId_version_key" ON "eventos_entrega"("requisicaoId", "version");
COMMIT;

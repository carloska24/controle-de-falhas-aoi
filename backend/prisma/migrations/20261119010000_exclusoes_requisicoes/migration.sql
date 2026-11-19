BEGIN;
CREATE TABLE "exclusoes_requisicoes" (
  "id" TEXT PRIMARY KEY,
  "requisicaoId" INTEGER NOT NULL,
  "actorId" INTEGER NOT NULL,
  "actorName" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "motivo" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL
);
CREATE INDEX "exclusoes_requisicoes_requisicaoId_occurredAt_idx"
  ON "exclusoes_requisicoes"("requisicaoId", "occurredAt");
COMMIT;

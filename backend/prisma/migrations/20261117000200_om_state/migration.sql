BEGIN;

CREATE TYPE "StatusOM" AS ENUM ('em_andamento', 'pausada', 'finalizada');
CREATE TABLE "ordens_manufatura" (
  "omNumber" TEXT PRIMARY KEY,
  "status" "StatusOM" NOT NULL,
  "startTime" BIGINT NOT NULL,
  "endTime" BIGINT,
  "pausedTime" BIGINT NOT NULL DEFAULT 0 CHECK ("pausedTime" >= 0),
  "pauseStartedAt" BIGINT,
  "elapsedAtPause" BIGINT,
  "qtdlote" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "ordens_manufatura_status_idx" ON "ordens_manufatura"("status");
CREATE TABLE "eventos_om" (
  "id" TEXT PRIMARY KEY,
  "omNumber" TEXT NOT NULL REFERENCES "ordens_manufatura"("omNumber") ON DELETE RESTRICT ON UPDATE CASCADE,
  "action" TEXT NOT NULL,
  "actorId" INTEGER NOT NULL,
  "actorName" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "snapshot" JSONB NOT NULL
);
CREATE INDEX "eventos_om_omNumber_occurredAt_idx" ON "eventos_om"("omNumber", "occurredAt");

-- Interrompe a migração em vez de escolher silenciosamente entre estados ambíguos.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "oms_ativas" a JOIN "oms_pausadas" p USING ("omNumber")) THEN
    RAISE EXCEPTION 'OM presente como ativa e pausada. Reconcilie os estados na copia de homologacao antes de migrar.';
  END IF;
  IF EXISTS (SELECT 1 FROM "oms_ativas" WHERE "startTime" IS NULL)
    OR EXISTS (SELECT 1 FROM "oms_pausadas" WHERE "startTime" IS NULL OR "pauseStartedAt" IS NULL)
    OR EXISTS (SELECT 1 FROM "oms_finalizadas" WHERE "startTime" IS NULL OR "endTime" IS NULL) THEN
    RAISE EXCEPTION 'OM legada com timestamps incompletos. Revise os dados antes de migrar.';
  END IF;
END $$;

INSERT INTO "ordens_manufatura" ("omNumber", "status", "startTime", "endTime", "pausedTime", "qtdlote")
  SELECT "omNumber", 'finalizada'::"StatusOM", "startTime", "endTime", COALESCE("pausedTime", 0), "qtdlote" FROM "oms_finalizadas";

-- O legado permitia reiniciar OMs. Preserva a execução aberta e mantém as tabelas antigas intactas.
INSERT INTO "ordens_manufatura" ("omNumber", "status", "startTime", "pausedTime", "qtdlote")
  SELECT "omNumber", 'em_andamento'::"StatusOM", "startTime", COALESCE("pausedTime", 0), "qtdlote" FROM "oms_ativas"
  ON CONFLICT ("omNumber") DO UPDATE SET "status" = EXCLUDED."status", "startTime" = EXCLUDED."startTime",
    "endTime" = NULL, "pausedTime" = EXCLUDED."pausedTime", "qtdlote" = EXCLUDED."qtdlote";
INSERT INTO "ordens_manufatura" ("omNumber", "status", "startTime", "pausedTime", "pauseStartedAt", "elapsedAtPause", "qtdlote")
  SELECT "omNumber", 'pausada'::"StatusOM", "startTime", COALESCE("pausedTime", 0), "pauseStartedAt",
    COALESCE("elapsedAtPause", "pauseStartedAt" - "startTime" - COALESCE("pausedTime", 0)), "qtdlote" FROM "oms_pausadas"
  ON CONFLICT ("omNumber") DO UPDATE SET "status" = EXCLUDED."status", "startTime" = EXCLUDED."startTime",
    "endTime" = NULL, "pausedTime" = EXCLUDED."pausedTime", "pauseStartedAt" = EXCLUDED."pauseStartedAt",
    "elapsedAtPause" = EXCLUDED."elapsedAtPause", "qtdlote" = EXCLUDED."qtdlote";

COMMIT;

-- Adições preservam registros e requisições existentes.
ALTER TABLE "registros" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "requisicao_registros" (
  "registro_id" TEXT NOT NULL,
  "requisicao_id" INTEGER NOT NULL,
  CONSTRAINT "requisicao_registros_pkey" PRIMARY KEY ("registro_id"),
  CONSTRAINT "requisicao_registros_registro_id_fkey" FOREIGN KEY ("registro_id") REFERENCES "registros"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "requisicao_registros_requisicao_id_fkey" FOREIGN KEY ("requisicao_id") REFERENCES "requisicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "requisicao_registros_requisicao_id_idx" ON "requisicao_registros"("requisicao_id");

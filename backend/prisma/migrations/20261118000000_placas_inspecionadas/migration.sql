-- OMs anteriores podem ter inspeções que nunca foram registradas por serial.
ALTER TABLE "ordens_manufatura" ADD COLUMN "rastreamentoInspecao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ordens_manufatura" ALTER COLUMN "rastreamentoInspecao" SET DEFAULT true;

CREATE TABLE "placas_inspecionadas" (
    "omNumber" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "temFalha" BOOLEAN NOT NULL,
    "registradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradaPor" INTEGER NOT NULL,
    CONSTRAINT "placas_inspecionadas_pkey" PRIMARY KEY ("omNumber", "serial"),
    CONSTRAINT "placas_inspecionadas_omNumber_fkey" FOREIGN KEY ("omNumber")
      REFERENCES "ordens_manufatura"("omNumber") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "placas_inspecionadas_registradaEm_idx" ON "placas_inspecionadas"("registradaEm");

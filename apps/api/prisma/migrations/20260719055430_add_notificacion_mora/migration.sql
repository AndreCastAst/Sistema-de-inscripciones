-- CreateTable
CREATE TABLE "NotificacionMora" (
    "id" SERIAL NOT NULL,
    "colegiadoId" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "notificado" BOOLEAN NOT NULL DEFAULT true,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacionMora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificacionMora_colegiadoId_periodo_key" ON "NotificacionMora"("colegiadoId", "periodo");

-- AddForeignKey
ALTER TABLE "NotificacionMora" ADD CONSTRAINT "NotificacionMora_colegiadoId_fkey" FOREIGN KEY ("colegiadoId") REFERENCES "Colegiado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

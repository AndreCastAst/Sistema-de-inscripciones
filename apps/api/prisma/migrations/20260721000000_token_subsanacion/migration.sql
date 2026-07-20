-- AlterTable
ALTER TABLE "Postulacion" ADD COLUMN     "tokenSubsanacion" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Postulacion_tokenSubsanacion_key" ON "Postulacion"("tokenSubsanacion");

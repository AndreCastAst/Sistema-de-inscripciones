-- DropForeignKey
ALTER TABLE "Postulacion" DROP CONSTRAINT "Postulacion_carreraId_fkey";

-- AlterTable
ALTER TABLE "Postulacion" ALTER COLUMN "carreraId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE SET NULL ON UPDATE CASCADE;

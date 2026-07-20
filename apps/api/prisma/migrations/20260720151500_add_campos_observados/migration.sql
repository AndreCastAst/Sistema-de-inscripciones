-- AlterTable
ALTER TABLE "Observacion" ADD COLUMN     "campos" TEXT[] DEFAULT ARRAY[]::TEXT[];

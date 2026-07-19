-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "regionId" INTEGER;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration: expandir de 25 a 28 sedes.
-- Los renombrados preservan los FKs existentes (postulaciones/colegiados/revisores/secuencias);
-- las 3 sedes nuevas se insertan sin uso previo.

-- Rename id=1 "Lima" -> "Departamental Lima" (preserva 5 postulaciones, 1 colegiado)
UPDATE "Region" SET "nombre" = 'Departamental Lima' WHERE "id" = 1;

-- Rename id=9 "Áncash" -> "Ancash - Chimbote" (0 uso, rename seguro)
UPDATE "Region" SET "nombre" = 'Ancash - Chimbote' WHERE "id" = 9;

-- Rename id=15 "San Martín" -> "Tingo María" (0 uso, rename seguro)
UPDATE "Region" SET "nombre" = 'Tingo María' WHERE "id" = 15;

-- Insertar las 3 sedes nuevas
INSERT INTO "Region" ("nombre") VALUES ('Ancash - Huaraz');
INSERT INTO "Region" ("nombre") VALUES ('Moyobamba');
INSERT INTO "Region" ("nombre") VALUES ('Tarapoto');

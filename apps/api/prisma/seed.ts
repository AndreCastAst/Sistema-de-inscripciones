import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const regiones = [
  "Lima", "Arequipa", "Cusco", "La Libertad", "Piura",
  "Lambayeque", "Junín", "Áncash", "Tacna", "Ica",
];

const carreras = [
  "Civil", "Sistemas", "Industrial", "Mecánica", "Eléctrica",
  "Electrónica", "Ambiental", "Minas", "Geológica", "Química",
];

async function main() {
  for (const nombre of regiones) {
    await prisma.region.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  for (const nombre of carreras) {
    await prisma.carrera.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  console.log("Catálogos sembrados: regiones y carreras.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

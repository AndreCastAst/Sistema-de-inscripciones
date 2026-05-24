import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const regiones = [
  "Lima",
  "Callao",
  "Arequipa",
  "Cusco",
  "La Libertad",
  "Piura",
  "Lambayeque",
  "Junín",
  "Áncash",
  "Tacna",
  "Ica",
  "Puno",
  "Cajamarca",
  "Loreto",
  "San Martín",
  "Ucayali",
  "Madre de Dios",
  "Apurímac",
  "Ayacucho",
  "Huancavelica",
  "Huánuco",
  "Amazonas",
  "Moquegua",
  "Tumbes",
  "Pasco",
];

const carreras = [
  "Civil",
  "Sistemas e Informática",
  "Industrial",
  "Mecánica",
  "Eléctrica",
  "Electrónica",
  "Mecánica Eléctrica",
  "Ambiental",
  "Minas",
  "Geológica",
  "Química",
  "Sanitaria",
  "Agrícola",
  "Aeronáutica",
  "Naval",
  "Metalúrgica",
  "Petróleo y Gas",
  "Mecatrónica",
  "Biomédica",
  "Geomática",
];

const revisores = [
  { nombres: "Carlos Mendoza Ríos", regionNombre: "Lima" },
  { nombres: "Rosa Huanca Flores", regionNombre: "Arequipa" },
  { nombres: "Jorge Quispe Mamani", regionNombre: "Cusco" },
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

  for (const rev of revisores) {
    const region = await prisma.region.findUnique({ where: { nombre: rev.regionNombre } });
    if (!region) continue;
    const existe = await prisma.revisor.findFirst({
      where: { nombres: rev.nombres, regionId: region.id },
    });
    if (!existe) {
      await prisma.revisor.create({ data: { nombres: rev.nombres, regionId: region.id } });
    }
  }

  console.log("Catálogos sembrados: 25 regiones, 20 carreras, 3 revisores.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

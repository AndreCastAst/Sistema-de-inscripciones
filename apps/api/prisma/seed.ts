import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const regiones = [
  "Amazonas",
  "Ancash - Chimbote",
  "Ancash - Huaraz",
  "Apurímac",
  "Arequipa",
  "Ayacucho",
  "Cajamarca",
  "Callao",
  "Ica",
  "Cusco",
  "Huancavelica",
  "Huánuco",
  "Tingo María",
  "La Libertad",
  "Junín",
  "Lambayeque",
  "Departamental Lima",
  "Loreto",
  "Madre de Dios",
  "Moquegua",
  "Pasco",
  "Piura",
  "Puno",
  "Moyobamba",
  "Tarapoto",
  "Tacna",
  "Tumbes",
  "Ucayali",
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
  { nombres: "Carlos Mendoza Ríos", regionNombre: "Departamental Lima" },
  { nombres: "Rosa Huanca Flores", regionNombre: "Arequipa" },
  { nombres: "Jorge Quispe Mamani", regionNombre: "Cusco" },
];

// Convierte el nombre de una sede en un slug PascalCase para el username
// (sin tildes, espacios ni guiones): "Ancash - Chimbote" -> "AncashChimbote".
function slugSede(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
    .join("");
}

const TEMP_PASSWORD = process.env.SEED_TEMP_PASSWORD ?? "12345";

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

  // Usuario super-admin (sin sede, ve todas las sedes)
  const superAdminHash = await bcrypt.hash("12345", 10);
  await prisma.usuario.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash: superAdminHash, nombre: "Administrador", rol: "admin" },
  });

  // 28 sedes x (admin + cajero) = 56 usuarios, todos con la misma contraseña temporal
  const tempPasswordHash = await bcrypt.hash(TEMP_PASSWORD, 10);
  for (const nombreSede of regiones) {
    const region = await prisma.region.findUnique({ where: { nombre: nombreSede } });
    if (!region) continue;
    const slug = slugSede(nombreSede);

    await prisma.usuario.upsert({
      where: { username: `admin${slug}` },
      update: {},
      create: {
        username: `admin${slug}`,
        passwordHash: tempPasswordHash,
        nombre: `Admin ${nombreSede}`,
        rol: "admin",
        regionId: region.id,
      },
    });

    await prisma.usuario.upsert({
      where: { username: `cajero${slug}` },
      update: {},
      create: {
        username: `cajero${slug}`,
        passwordHash: tempPasswordHash,
        nombre: `Cajero ${nombreSede}`,
        rol: "cajero",
        regionId: region.id,
      },
    });
  }

  console.log(
    "Catálogos sembrados: 28 regiones, 20 carreras, 3 revisores, 57 usuarios (1 super-admin + 28 admin + 28 cajero)."
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

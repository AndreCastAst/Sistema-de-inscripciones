import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function generarCodigo(regionId: number, carreraId: number): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const seq = await tx.$queryRaw<{ ultimo: number }[]>`
      SELECT ultimo FROM "Secuencia"
      WHERE "regionId" = ${regionId} AND "carreraId" = ${carreraId}
      FOR UPDATE
    `;

    if (seq.length === 0) {
      await tx.secuencia.create({ data: { regionId, carreraId, ultimo: 1 } });
      return "00001";
    }

    const siguiente = seq[0].ultimo + 1;
    await tx.secuencia.updateMany({
      where: { regionId, carreraId },
      data: { ultimo: siguiente },
    });

    return String(siguiente).padStart(5, "0");
  });
}

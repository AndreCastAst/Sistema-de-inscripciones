import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function generarCodigo(regionId: number, carreraId: number): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // Buscamos la secuencia para esta combinación región+carrera
    const seq = await tx.$queryRaw<{ ultimo: number }[]>`
      SELECT ultimo FROM "Secuencia"
      WHERE "regionId" = ${regionId} AND "carreraId" = ${carreraId}
      FOR UPDATE
    `;

    let siguiente: number;

    if (seq.length === 0) {
      // Primera vez para esta combinación: calculamos el máximo código existente
      // en toda la tabla Colegiado para arrancar después del último usado globalmente.
      const maxRow = await tx.$queryRaw<{ maxval: string | null }[]>`
        SELECT MAX(CAST(codigo AS INTEGER)) AS maxval FROM "Colegiado"
      `;
      const maxActual = maxRow[0]?.maxval ? parseInt(maxRow[0].maxval, 10) : 0;
      siguiente = maxActual + 1;
      await tx.secuencia.create({ data: { regionId, carreraId, ultimo: siguiente } });
    } else {
      // La secuencia existe: incrementamos normalmente
      siguiente = seq[0].ultimo + 1;

      // Verificamos que el código generado no exista ya (por si la secuencia quedó desincronizada)
      const existe = await tx.$queryRaw<{ cnt: number }[]>`
        SELECT COUNT(*) as cnt FROM "Colegiado" WHERE CAST(codigo AS INTEGER) >= ${siguiente}
      `;
      if (Number(existe[0]?.cnt) > 0) {
        const maxRow = await tx.$queryRaw<{ maxval: string | null }[]>`
          SELECT MAX(CAST(codigo AS INTEGER)) AS maxval FROM "Colegiado"
        `;
        const maxActual = maxRow[0]?.maxval ? parseInt(maxRow[0].maxval, 10) : 0;
        siguiente = maxActual + 1;
      }

      await tx.secuencia.updateMany({
        where: { regionId, carreraId },
        data: { ultimo: siguiente },
      });
    }

    return String(siguiente).padStart(5, "0");
  });
}

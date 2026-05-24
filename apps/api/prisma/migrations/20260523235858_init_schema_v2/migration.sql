-- CreateEnum
CREATE TYPE "EstadoPostulacion" AS ENUM ('PENDIENTE', 'EN_REVISION', 'OBSERVADO', 'SUBSANADO', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('MERCADOPAGO', 'VOUCHER');

-- CreateTable
CREATE TABLE "Region" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrera" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Carrera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Postulacion" (
    "id" SERIAL NOT NULL,
    "dni" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT NOT NULL,
    "gmail" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "tituloUrl" TEXT,
    "voucherUrl" TEXT,
    "estado" "EstadoPostulacion" NOT NULL DEFAULT 'PENDIENTE',
    "esFisico" BOOLEAN NOT NULL DEFAULT false,
    "regionId" INTEGER NOT NULL,
    "carreraId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Postulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observacion" (
    "id" SERIAL NOT NULL,
    "postulacionId" INTEGER NOT NULL,
    "mensaje" TEXT NOT NULL,
    "revisorId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colegiado" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT NOT NULL,
    "gmail" TEXT NOT NULL,
    "postulacionId" INTEGER NOT NULL,
    "regionId" INTEGER NOT NULL,
    "carreraId" INTEGER NOT NULL,
    "fotoUrl" TEXT,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Colegiado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensualidad" (
    "id" SERIAL NOT NULL,
    "colegiadoId" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "pagadoEn" TIMESTAMP(3),
    "metodoPago" "MetodoPago",
    "voucherUrl" TEXT,
    "mpPaymentId" TEXT,

    CONSTRAINT "Mensualidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revisor" (
    "id" SERIAL NOT NULL,
    "nombres" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL,

    CONSTRAINT "Revisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secuencia" (
    "id" SERIAL NOT NULL,
    "regionId" INTEGER NOT NULL,
    "carreraId" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Secuencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "detalle" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_nombre_key" ON "Region"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Carrera_nombre_key" ON "Carrera"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Colegiado_codigo_key" ON "Colegiado"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Colegiado_dni_key" ON "Colegiado"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Colegiado_postulacionId_key" ON "Colegiado"("postulacionId");

-- CreateIndex
CREATE UNIQUE INDEX "Mensualidad_colegiadoId_periodo_key" ON "Mensualidad"("colegiadoId", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "Secuencia_regionId_carreraId_key" ON "Secuencia"("regionId", "carreraId");

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observacion" ADD CONSTRAINT "Observacion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observacion" ADD CONSTRAINT "Observacion_revisorId_fkey" FOREIGN KEY ("revisorId") REFERENCES "Revisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colegiado" ADD CONSTRAINT "Colegiado_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colegiado" ADD CONSTRAINT "Colegiado_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colegiado" ADD CONSTRAINT "Colegiado_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensualidad" ADD CONSTRAINT "Mensualidad_colegiadoId_fkey" FOREIGN KEY ("colegiadoId") REFERENCES "Colegiado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revisor" ADD CONSTRAINT "Revisor_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secuencia" ADD CONSTRAINT "Secuencia_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secuencia" ADD CONSTRAINT "Secuencia_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

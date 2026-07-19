-- Cambia el valor por defecto de la cuota mensual de S/20 a S/1.
-- No afecta filas existentes; solo aplica a nuevas mensualidades sin monto explícito.
ALTER TABLE "Mensualidad" ALTER COLUMN "monto" SET DEFAULT 1;

import PDFDocument from "pdfkit";

export interface DatosBoleta {
  nombreCompleto: string;
  dni: string;
  monto: number;
  banco: string;
  numOp: string;
  codigoVoucher: string;
  numeroBoleta: string;
  fecha: string;
  hora: string;
}

export function generarBoletaPDF(datos: DatosBoleta): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const valorVenta = Math.round((datos.monto / 1.18) * 100) / 100;
    const igv = Math.round((datos.monto - valorVenta) * 100) / 100;
    const left = 40;
    const right = doc.page.width - 40;
    const colDerecha = right - 70;

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.fontSize(13).font("Helvetica-Bold")
      .text("COLEGIO DE INGENIEROS DEL PERÚ", { align: "center" });
    doc.fontSize(9).font("Helvetica")
      .text("RUC: 20100149286", { align: "center" })
      .text("Av. Arequipa 4947, Miraflores, Lima 15074", { align: "center" })
      .text("Tel: (01) 445-9800", { align: "center" });

    doc.moveDown(0.4);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).dash(3, { space: 3 }).stroke().undash();
    doc.moveDown(0.4);

    // ── Tipo de documento ────────────────────────────────────────────────────
    doc.fontSize(12).font("Helvetica-Bold")
      .text("BOLETA DE VENTA ELECTRÓNICA", { align: "center" });
    doc.fontSize(10).font("Helvetica")
      .text(`Serie: B001     Número: ${datos.numeroBoleta}`, { align: "center" })
      .text(`${datos.fecha}  ${datos.hora}`, { align: "center" });

    doc.moveDown(0.4);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).dash(3, { space: 3 }).stroke().undash();
    doc.moveDown(0.4);

    // ── Datos del cliente ────────────────────────────────────────────────────
    doc.fontSize(9).font("Helvetica-Bold").text("DATOS DEL CLIENTE");
    doc.fontSize(10).font("Helvetica")
      .text(`Apellidos y Nombres: ${datos.nombreCompleto}`)
      .text(`DNI: ${datos.dni}`);

    doc.moveDown(0.4);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).dash(3, { space: 3 }).stroke().undash();
    doc.moveDown(0.4);

    // ── Detalle ──────────────────────────────────────────────────────────────
    doc.fontSize(9).font("Helvetica-Bold").text("DETALLE");
    const detailY = doc.y;
    doc.fontSize(10).font("Helvetica")
      .text("Inscripción – Colegiatura CIP", left, detailY, { width: colDerecha - left });
    doc.text(`S/ ${valorVenta.toFixed(2)}`, colDerecha, detailY, { width: 70, align: "right" });

    doc.moveDown(0.4);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke();
    doc.moveDown(0.3);

    // ── Totales ──────────────────────────────────────────────────────────────
    const gravadaY = doc.y;
    doc.fontSize(10).font("Helvetica").fillColor("#555555")
      .text("OP. GRAVADA:", left, gravadaY, { width: colDerecha - left });
    doc.text(`S/ ${valorVenta.toFixed(2)}`, colDerecha, gravadaY, { width: 70, align: "right" });

    const igvY = doc.y;
    doc.text("IGV (18%):", left, igvY, { width: colDerecha - left });
    doc.text(`S/ ${igv.toFixed(2)}`, colDerecha, igvY, { width: 70, align: "right" });

    doc.fillColor("black");
    doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(2).stroke().lineWidth(1);

    const totalY = doc.y + 3;
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#003DA5")
      .text("IMPORTE TOTAL:", left, totalY, { width: colDerecha - left });
    doc.text(`S/ ${datos.monto.toFixed(2)}`, colDerecha, totalY, { width: 70, align: "right" });
    doc.fillColor("black");

    doc.moveDown(0.6);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).dash(3, { space: 3 }).stroke().undash();
    doc.moveDown(0.4);

    // ── Datos del pago ───────────────────────────────────────────────────────
    doc.fontSize(9).font("Helvetica-Bold").text("DATOS DEL PAGO");
    doc.fontSize(10).font("Helvetica")
      .text(`Entidad: ${datos.banco}`)
      .text(`N° Operación: ${datos.numOp}`)
      .text(`Cód. Voucher Digital: ${datos.codigoVoucher}`);

    doc.moveDown(0.4);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).dash(3, { space: 3 }).stroke().undash();
    doc.moveDown(0.5);

    // ── Estado PAGADO ────────────────────────────────────────────────────────
    doc.fontSize(14).font("Helvetica-Bold").text("✓ PAGADO", { align: "center" });

    doc.moveDown(0.6);
    doc.fontSize(7).font("Helvetica").fillColor("#888888")
      .text("Representación impresa de Boleta de Venta Electrónica", { align: "center" })
      .text("COMPROBANTE DE SIMULACIÓN – Sistema de Inscripciones CIP – Curso Agile Development", { align: "center" });

    doc.end();
  });
}

import axios from "axios";

const culqiApi = axios.create({
  baseURL: "https://api.culqi.com/v2",
  headers: {
    Authorization: `Bearer ${process.env.CULQI_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

export interface CulqiCargo {
  id: string;
  amount: number;
  outcome: { type: string };
}

export interface CulqiOrden {
  id: string;
  cip: string;
  cip_url: string;
}

// Crea un cargo con token de tarjeta (obtenido desde Culqi.js en el frontend)
export async function crearCargo(params: {
  token: string;
  amount: number;    // en centavos (e.g. S/20 = 2000)
  email: string;
  descripcion: string;
}): Promise<CulqiCargo> {
  const { data } = await culqiApi.post<CulqiCargo>("/charges", {
    amount: params.amount,
    currency_code: "PEN",
    email: params.email,
    source_id: params.token,
    capture: true,
    description: params.descripcion,
  });
  return data;
}

// Crea un cargo con Yape (teléfono + OTP de 6 dígitos)
export async function crearCargoYape(params: {
  phoneNumber: string;
  otp: string;
  amount: number;
  email: string;
  descripcion: string;
}): Promise<CulqiCargo> {
  // Paso 1: generar token Yape
  const { data: yape } = await culqiApi.post<{ id: string }>("/yape", {
    amount: params.amount,
    phone_number: params.phoneNumber,
    otp: params.otp,
  });
  // Paso 2: crear cargo con ese token
  const { data } = await culqiApi.post<CulqiCargo>("/charges", {
    amount: params.amount,
    currency_code: "PEN",
    email: params.email,
    source_id: yape.id,
    capture: true,
    description: params.descripcion,
  });
  return data;
}

// Genera una orden PagoEfectivo (devuelve código CIP para pagar en banco o agente)
export async function crearOrdenPagoEfectivo(params: {
  amount: number;
  email: string;
  descripcion: string;
  orderNumber: string;
}): Promise<CulqiOrden> {
  const expiracion = Math.floor(Date.now() / 1000) + 72 * 3600; // 72 horas
  const { data } = await culqiApi.post<CulqiOrden>("/orders", {
    amount: params.amount,
    currency_code: "PEN",
    description: params.descripcion,
    order_number: params.orderNumber,
    client_details: { email: params.email },
    expiration_date: expiracion,
    confirm: false,
  });
  return data;
}

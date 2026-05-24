import axios from "axios";

export interface DatosDNI {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

export async function consultarDNI(dni: string): Promise<DatosDNI> {
  const params = new URLSearchParams();
  params.append("dni", dni);

  const { data } = await axios.post(
    process.env.RENIEC_API_URL!,
    params.toString(),
    {
      headers: {
        Authorization: `Bearer ${process.env.RENIEC_API_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!data.success || !data.data?.nombres) {
    throw Object.assign(new Error("DNI no encontrado"), { status: 404 });
  }

  return {
    dni: data.data.numero,
    nombres: data.data.nombres,
    apellidoPaterno: data.data.apellido_paterno,
    apellidoMaterno: data.data.apellido_materno,
  };
}

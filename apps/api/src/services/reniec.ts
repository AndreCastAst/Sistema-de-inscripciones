import axios from "axios";

export interface DatosDNI {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

export async function consultarDNI(dni: string): Promise<DatosDNI> {
  const url = `${process.env.RENIEC_API_URL}?numero=${dni}`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${process.env.RENIEC_API_TOKEN}` },
  });

  return {
    dni: data.numeroDocumento,
    nombres: data.nombres,
    apellidoPaterno: data.apellidoPaterno,
    apellidoMaterno: data.apellidoMaterno,
  };
}

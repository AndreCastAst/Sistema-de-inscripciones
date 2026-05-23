# Guía de inicio para desarrolladores

**Sistema de Inscripciones – Colegio de Ingenieros del Perú**

Este documento responde las preguntas más frecuentes que tiene un estudiante cuando lee `House.md` por primera vez y quiere empezar a contribuir al proyecto sin perderse en los detalles técnicos.

---

## ¿Qué es este proyecto y qué estamos construyendo?

Un sistema web donde los postulantes al Colegio de Ingenieros del Perú pueden inscribirse en línea, subir sus documentos y recibir su carnet digital de colegiado. También tiene una vista para que los revisores administrativos aprueben o rechacen cada expediente.

El sistema tiene tres partes:

| Parte | Tecnología | ¿Dónde corre? |
|---|---|---|
| Frontend (lo que ve el usuario) | Next.js 14 | Vercel / `localhost:3000` |
| Backend (la lógica y la API) | Node.js + Express | Railway / `localhost:4000` |
| Base de datos | PostgreSQL 16 | Railway / local |

---

## ¿Quién tiene que hacer qué para arrancar?

**Solo una persona del equipo** (el responsable de entorno, generalmente quien lidera el sprint) necesita:

- Crear las cuentas en Vercel, Railway, Cloudinary, Resend y apis.net.pe.
- Configurar los proyectos en Vercel y Railway y conectarlos al repositorio de GitHub.
- Obtener las claves de cada servicio y compartirlas con el equipo de forma segura (por ejemplo, por WhatsApp privado o un documento compartido con contraseña, nunca por el chat grupal ni subidas a GitHub).

**Cada desarrollador** solo necesita:

- Clonar el repositorio.
- Instalar Node.js.
- Copiar los archivos `.env.example` y llenarlos con las claves que el responsable le comparte.
- Correr dos comandos para levantar el proyecto localmente.

---

## ¿Qué tengo que instalar en mi computadora?

Antes de tocar cualquier archivo del proyecto, instala esto:

### 1. Node.js 20 LTS (o superior)

Descárgalo desde [nodejs.org](https://nodejs.org). Elige la versión **LTS**. Esto instala también `npm` automáticamente.

Para verificar que quedó bien instalado, abre una terminal y escribe:

```bash
node --version   # debe mostrar v20.x.x o superior
npm --version    # debe mostrar 10.x.x o superior
```

### 2. Git

Si usas Windows, descárgalo desde [git-scm.com](https://git-scm.com). En Mac ya viene instalado.

```bash
git --version    # debe mostrar 2.x.x
```

### 3. Un editor de código

Se recomienda **VS Code** con estas extensiones:

- **ESLint** – marca errores de código mientras escribes.
- **Prettier** – formatea el código automáticamente.
- **Prisma** – resalta la sintaxis del archivo `schema.prisma`.

### 4. Docker Desktop (opcional, solo si no usas Railway en desarrollo)

Si quieres tener PostgreSQL en tu computadora sin depender de internet, instala [Docker Desktop](https://www.docker.com/products/docker-desktop). No es obligatorio si el equipo usa la base de datos de Railway directamente para desarrollo.

---

## ¿Cómo clono y levanto el proyecto por primera vez?

```bash
# 1. Clonar el repositorio
git clone https://github.com/AndreCastAst/Sistema-de-inscripciones.git
cd Sistema-de-inscripciones

# 2. Configurar el backend
cd apps/api
cp .env.example .env          # copia el archivo de variables de entorno
# → abre .env y llena los valores reales (ver sección de .env más abajo)
npm install                   # instala las dependencias
npx prisma migrate dev        # crea las tablas en la base de datos
npm run seed                  # carga los catálogos de regiones y carreras
npm run dev                   # inicia el servidor en http://localhost:4000

# 3. Configurar el frontend (en otra terminal)
cd ../web
cp .env.local.example .env.local
# → abre .env.local y llena los valores reales
npm install
npm run dev                   # inicia el frontend en http://localhost:3000
```

Para verificar que el backend funciona, abre en el navegador:
`http://localhost:4000/health` → debe responder `{ "status": "ok" }`.

---

## Los archivos `.env`: qué son, cuáles hay y qué poner en cada uno

Los archivos `.env` guardan información sensible (contraseñas, tokens, URLs) que **nunca se sube a GitHub**. Por eso el repositorio solo tiene archivos `.env.example` con nombres pero sin valores reales. Cada desarrollador crea su propia copia con los valores verdaderos.

### `apps/api/.env` — variables del backend

| Variable | Para qué sirve | Quién la da |
|---|---|---|
| `PORT` | Puerto donde corre el servidor (dejar en `4000`) | Tú mismo |
| `NODE_ENV` | Entorno (`development` en local) | Tú mismo |
| `CORS_ORIGIN` | URL del frontend que puede llamar al backend | Tú mismo (`http://localhost:3000` en local) |
| `DATABASE_URL` | Conexión a PostgreSQL | Railway te la genera automáticamente, o tú la armas si usas local |
| `RENIEC_API_URL` | URL de la API de consulta de DNI | Fija: `https://api.apis.net.pe/v2/reniec/dni` |
| `RENIEC_API_TOKEN` | Token de autenticación para apis.net.pe | Te lo dan al registrarte en apis.net.pe |
| `CLOUDINARY_CLOUD_NAME` | Nombre de tu cuenta en Cloudinary | Tu panel de Cloudinary |
| `CLOUDINARY_API_KEY` | Clave pública de Cloudinary | Tu panel de Cloudinary |
| `CLOUDINARY_API_SECRET` | Clave privada de Cloudinary | Tu panel de Cloudinary |
| `RESEND_API_KEY` | Token para enviar correos con Resend | Tu panel de Resend |
| `MAIL_FROM` | Dirección de remitente de los correos | La defines tú (ej: `"CIP <noreply@tudominio.com>"`) |
| `CULQI_PUBLIC_KEY` | Clave pública de la pasarela de pagos | Tu panel de Culqi (sandbox) |
| `CULQI_PRIVATE_KEY` | Clave privada de Culqi | Tu panel de Culqi (sandbox) |

### `apps/web/.env.local` — variables del frontend

| Variable | Para qué sirve | Valor en local |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL base del backend | `http://localhost:4000/api/v1` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Para subir archivos directo a Cloudinary desde el navegador | El mismo `cloud_name` de Cloudinary |
| `NEXT_PUBLIC_CULQI_PUBLIC_KEY` | Para mostrar el checkout de pagos en el navegador | La clave pública de Culqi |

> **Regla importante:** cualquier variable que empiece con `NEXT_PUBLIC_` es visible para cualquiera que inspeccione el navegador. Por eso nunca se deben poner claves privadas (`CULQI_PRIVATE_KEY`, `CLOUDINARY_API_SECRET`) en el frontend.

---

## ¿Cómo obtengo las claves de cada servicio?

### apis.net.pe (RENIEC)

1. Entra a [apis.net.pe](https://apis.net.pe) y crea una cuenta gratuita.
2. En el panel, ve a **Tokens** y genera uno nuevo.
3. Copia ese token y ponlo en `RENIEC_API_TOKEN`.
4. Para probar que funciona, abre en el navegador (reemplaza el token y el DNI):
   ```
   https://api.apis.net.pe/v2/reniec/dni?numero=12345678
   Authorization: Bearer TU_TOKEN
   ```
   Puedes probarlo también con Postman o Insomnia.

### Cloudinary

1. Crea una cuenta gratuita en [cloudinary.com](https://cloudinary.com).
2. Al entrar, el panel principal muestra tu `Cloud Name`, `API Key` y `API Secret`.
3. Ve a **Settings → Upload** y crea un **Upload Preset** llamado `colegio-mvp` con modo `Unsigned`. Esto permite que el navegador suba archivos directamente sin pasar por el backend.

### Resend

1. Crea una cuenta en [resend.com](https://resend.com).
2. En el plan gratuito puedes enviar desde `onboarding@resend.dev` sin verificar dominio (útil para desarrollo).
3. Ve a **API Keys** y crea una nueva. Cópiala en `RESEND_API_KEY`.

### Culqi (sandbox)

1. Crea una cuenta en [culqi.com](https://culqi.com) y entra al modo **sandbox**.
2. En el panel, bajo **Desarrollo**, encontrarás tus claves de prueba (`pk_test_...` y `sk_test_...`).
3. En sandbox, usa el número de tarjeta `4111111111111111` para simular pagos exitosos.

### PostgreSQL local (sin Docker)

Si no quieres usar Docker ni Railway, puedes instalar PostgreSQL directamente desde [postgresql.org](https://www.postgresql.org/download/). Durante la instalación se te pide una contraseña para el usuario `postgres` — guárdala. La `DATABASE_URL` quedaría así:

```
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/colegio
```

Luego crea la base de datos `colegio` abriendo la aplicación **pgAdmin** (viene con la instalación) o desde la terminal con `psql -U postgres -c "CREATE DATABASE colegio;"`.

---

## ¿Qué hace cada comando de Prisma?

| Comando | Cuándo usarlo |
|---|---|
| `npx prisma migrate dev` | Cuando el archivo `schema.prisma` cambia (alguien agregó una tabla o columna). Crea la migración y actualiza tu base de datos local. |
| `npm run seed` | Una sola vez al inicio para cargar los catálogos de regiones y carreras. Si lo corres de nuevo no duplica datos (usa `upsert`). |
| `npx prisma studio` | Abre una interfaz web en `localhost:5555` para ver y editar los datos de la base de datos sin escribir SQL. Muy útil para depurar. |
| `npx prisma generate` | Regenera el cliente de Prisma si cambias el esquema sin hacer una migración completa. Generalmente no hace falta llamarlo a mano. |

---

## ¿Todos los del equipo tienen que hacer esto?

**Sí**, cada desarrollador necesita su propio entorno local corriendo. Pero hay cosas que se hacen solo una vez:

| Tarea | ¿Quién? | ¿Cuántas veces? |
|---|---|---|
| Crear cuentas en Vercel, Railway, Cloudinary, Resend, Culqi | Responsable de entorno | Una vez |
| Conectar Railway y Vercel al repo de GitHub | Responsable de entorno | Una vez |
| Obtener y compartir las claves con el equipo | Responsable de entorno | Una vez (o cuando rotan) |
| Clonar el repo e instalar dependencias | Cada desarrollador | Una vez por computadora |
| Crear su propio `.env` con las claves compartidas | Cada desarrollador | Una vez |
| Correr `prisma migrate dev` | Cada desarrollador | Cada vez que el esquema cambia |
| Correr `npm run dev` | Cada desarrollador | Cada vez que quiera trabajar |

---

## Errores frecuentes al arrancar

**`Cannot find module '@prisma/client'`**
→ Corre `npx prisma generate` dentro de `apps/api`.

**`Error: connect ECONNREFUSED 127.0.0.1:5432`**
→ PostgreSQL no está corriendo. Inicia el servicio o levanta Docker.

**`Invalid `prisma.postulacion.create()` invocation`**
→ La base de datos no tiene las tablas aún. Corre `npx prisma migrate dev`.

**`Blocked by CORS`** (error en el navegador)
→ Verifica que `CORS_ORIGIN` en `apps/api/.env` coincida exactamente con la URL donde corre el frontend (incluyendo el puerto).

**`401 Unauthorized` al consultar DNI**
→ El token de apis.net.pe está mal copiado o venció. Genera uno nuevo en el panel.

---

## Estructura del repositorio en dos líneas

`apps/api` es el backend: recibe peticiones HTTP, consulta la base de datos con Prisma y llama a los servicios externos. `apps/web` es el frontend: lo que ve el usuario en el navegador, llama al backend mediante la URL en `NEXT_PUBLIC_API_URL`.

---

## ¿Por dónde empiezo a escribir código?

Dependiendo de lo que te asignen en el sprint:

- **Formulario de inscripción** → `apps/web/src/app/postulante/page.tsx`
- **Bandeja del revisor** → `apps/web/src/app/revisor/page.tsx`
- **Lógica de aprobación/rechazo** → `apps/api/src/routes/revisor.ts`
- **Consulta de DNI** → `apps/api/src/services/reniec.ts` y `apps/api/src/routes/postulantes.ts`
- **Generación del carnet** → `apps/web/src/app/carnet/[codigo]/page.tsx` y `apps/api/src/routes/carnet.ts`
- **Modelo de datos** → `apps/api/prisma/schema.prisma`

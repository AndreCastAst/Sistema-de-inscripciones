**Documento de Configuración de Entorno**

**Producto Mínimo Viable (MVP)**

*Sistema de Inscripciones – Colegio de Ingenieros del Perú*

Despliegue: Vercel (Frontend) + Railway (Backend & PostgreSQL)

Versión 1.0

# **1. Propósito del documento**

Este documento define el entorno técnico, las herramientas, las credenciales y los pasos necesarios para levantar, desarrollar y desplegar el MVP del sistema de inscripciones del Colegio de Ingenieros. Su alcance se limita estrictamente a las capacidades descritas en los aportes funcionales del equipo: inscripción de postulantes con validación por RENIEC, revisión administrativa por región, emisión de carnet virtual, control de mensualidades de S/20 y marca de agua de inhabilitación.

El MVP no contempla medidas de seguridad estrictas (acuerdo con el cliente), no incluye autenticación de colegiados —la información se considera pública— y prioriza un flujo funcional auditable sobre robustez de producción.

# **2. Alcance técnico del MVP**

## **2.1 Dentro del alcance**

- Registro virtual y físico de postulantes con validación de DNI vía API RENIEC.

- Carga de fotografía, título profesional en PDF y comprobante de pago de S/1500.

- Bandeja de revisión para el rol administrativo (un revisor por región).

- Emisión automática de código de colegiado correlativo de 5 dígitos, por región y carrera.

- Generación y descarga de carnet virtual digital simple.

- Cobro mensual de S/20 a partir del mes siguiente al registro.

- Aplicación automática de marca de agua "inhabilitado" sobre el carnet.

- Rehabilitación inmediata al regularizar deuda, sin penalidades ni intereses.

- Notificaciones por correo electrónico sobre observaciones, aprobaciones y emisión de carnet.

## **2.2 Fuera del alcance del MVP**

- Autenticación de colegiados con usuario y contraseña.

- Verificación automática del título contra SUNEDU (la revisión es manual en el primer sprint).

- Cumplimiento estricto de la Ley N° 29733 de Protección de Datos Personales.

- QR de verificación pública en el carnet ni fecha de vencimiento visible.

- Reportes avanzados, dashboards o BI.

# **3. Arquitectura general**

La arquitectura del MVP se basa en una separación clásica de tres capas desplegadas en proveedores administrados, sin infraestructura propia ni servidores que mantener.

## **3.1 Diagrama lógico de despliegue**

┌──────────────────────────┐         ┌────────────────────────────────┐

│        Vercel            │         │            Railway             │

│  ──────────────────────  │         │  ────────────────────────────  │

│  Next.js 14 (Frontend)   │ HTTPS   │  Node.js + Express (Backend)   │

│  Postulantes y Revisor   │ ──────▶ │  API REST /api/v1/...          │

│  SSR + Server Actions    │         │  Prisma ORM                    │

└──────────────────────────┘         │            │                   │

                                     │            ▼                   │

                                     │  PostgreSQL 16 (Managed)       │

                                     └────────────────────────────────┘

            │                                       │

            ▼                                       ▼

   APIs externas: RENIEC                  Cloudinary (foto, PDF, voucher)

                                          Resend (correos transaccionales)

## **3.2 Justificación de los proveedores**

- **Vercel: **despliegue continuo desde GitHub para Next.js, edge runtime gratuito, dominios HTTPS automáticos y previews por pull request. Encaja con el ciclo académico.

- **Railway: **PostgreSQL administrado en el plan Hobby (USD 5/mes en créditos), despliegue de backend con detección automática de Dockerfile o package.json, y variables de entorno compartidas entre servicios.

- **Cloudinary (free tier): **almacenamiento de imágenes y PDFs con CDN. Evita guardar binarios en PostgreSQL.

- **Resend (free tier): **envío de correos sin configurar SMTP propio; 3.000 correos/mes en plan gratuito, suficiente para el MVP.

# **4. Stack tecnológico**

| **Capa** | **Tecnología** | **Versión** | **Justificación** |
| --- | --- | --- | --- |
| Frontend | Next.js + TypeScript | 14.x | Integración nativa con Vercel; SSR para la vista pública del carnet. |
| UI | Tailwind CSS + shadcn/ui | 3.x / latest | Prototipado rápido de formularios y bandejas. |
| Backend | Node.js + Express | 20 LTS / 4.x | Stack ligero, curva de aprendizaje baja, abundante documentación. |
| ORM | Prisma | 5.x | Migraciones declarativas, tipado fuerte sobre PostgreSQL. |
| Base de datos | PostgreSQL | 16 | Soporte transaccional para el correlativo único por región y carrera. |
| Archivos | Cloudinary | SDK v2 | Foto, título PDF y voucher fuera de la base de datos. |
| Correo | Resend | SDK 3.x | Notificaciones a postulantes (observaciones, aprobación, emisión). |
| DNI | API RENIEC (vía apis.net.pe o decide.pe) | v2 / v1 | Validación de identidad y autocompletado de nombres. |
| Pagos | Culqi o Mercado Pago Checkout | REST v1 | Pasarela propia para inscripción (S/1500) y mensualidad (S/20). |
| Control de versiones | Git + GitHub | — | Despliegue continuo a Vercel y Railway desde la rama main. |

# **5. Estructura del repositorio**

Se adopta un monorepo simple con dos paquetes independientes para evitar la sobrecarga de herramientas como Turborepo en un MVP académico. Cada paquete tiene su propio package.json y se despliega de forma independiente.

colegio-ingenieros/

├── apps/

│   ├── web/                  # Frontend Next.js → Vercel

│   │   ├── src/app/          # Rutas (App Router)

│   │   ├── src/components/   # UI compartida

│   │   ├── src/lib/          # Cliente HTTP, helpers

│   │   ├── .env.local.example

│   │   └── package.json

│   │

│   └── api/                  # Backend Express → Railway

│       ├── src/routes/       # /postulantes, /revisor, /pagos, /carnet

│       ├── src/services/     # RENIEC, Cloudinary, Resend, correlativos

│       ├── src/middlewares/  # Validación, errores

│       ├── prisma/schema.prisma

│       ├── prisma/migrations/

│       ├── .env.example

│       └── package.json

│

├── docs/                     # Este documento, historias de usuario, etc.

├── .gitignore

└── README.md

# **6. Cuentas y servicios requeridos**

Antes de iniciar el desarrollo, el responsable del entorno debe crear las siguientes cuentas. Todas ofrecen plan gratuito suficiente para el MVP.

| **Servicio** | **URL** | **Plan MVP** | **Para qué** |
| --- | --- | --- | --- |
| GitHub | github.com | Free | Repositorio y disparador de despliegues |
| Vercel | vercel.com | Hobby | Frontend Next.js |
| Railway | railway.app | Hobby (USD 5) | Backend + PostgreSQL |
| Cloudinary | cloudinary.com | Free | Almacenamiento de foto/PDF/voucher |
| Resend | resend.com | Free | Envío de correos |
| apis.net.pe | apis.net.pe | Free (con token) | Consulta de DNI a RENIEC |
| Culqi (sandbox) | culqi.com | Sandbox | Pruebas de pasarela de pago |

# **7. Variables de entorno**

Las variables sensibles nunca se versionan. Cada paquete mantiene un archivo .env.example con los nombres y valores ficticios.

## **7.1 Frontend (apps/web/.env.local)**

NEXT_PUBLIC_API_URL=https://<servicio>.up.railway.app/api/v1

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=colegio-ingenieros

NEXT_PUBLIC_CULQI_PUBLIC_KEY=pk_test_xxxxxxxxxxxx

## **7.2 Backend (apps/api/.env)**

# Servidor

PORT=4000

NODE_ENV=development

CORS_ORIGIN=https://<proyecto>.vercel.app

# Base de datos (Railway la inyecta automáticamente en producción)

DATABASE_URL=postgresql://postgres:<pass>@<host>:5432/railway

# APIs externas

RENIEC_API_URL=https://api.apis.net.pe/v2/reniec/dni

RENIEC_API_TOKEN=apis-token-xxxxxxxxxxxx

# Almacenamiento

CLOUDINARY_CLOUD_NAME=colegio-ingenieros

CLOUDINARY_API_KEY=xxxxxxxxxxxx

CLOUDINARY_API_SECRET=xxxxxxxxxxxx

# Correo

RESEND_API_KEY=re_xxxxxxxxxxxxxxxx

MAIL_FROM="Colegio de Ingenieros <noreply@<dominio>>"

# Pagos

CULQI_PUBLIC_KEY=pk_test_xxxxxxxxxxxx

CULQI_PRIVATE_KEY=sk_test_xxxxxxxxxxxx

INSCRIPCION_MONTO=1500

MENSUALIDAD_MONTO=20

## **7.3 Regla de oro**

Toda variable que comience con NEXT_PUBLIC_ es visible para el navegador; el resto vive solo en el servidor. Bajo ningún supuesto se debe colocar CULQI_PRIVATE_KEY ni RESEND_API_KEY en el frontend.

# **8. Configuración del entorno local**

## **8.1 Requisitos previos**

- Node.js 20 LTS y npm 10+

- Git 2.40+

- Docker Desktop (opcional, para levantar PostgreSQL local)

- Cuenta en GitHub vinculada al equipo de trabajo

- Editor recomendado: VS Code con extensiones ESLint, Prettier y Prisma

## **8.2 Pasos iniciales**

# 1. Clonar el repositorio

git clone https://github.com/<org>/colegio-ingenieros.git

cd colegio-ingenieros

# 2. Levantar PostgreSQL local (opcional, si no se usa Railway dev)

docker run --name pg-colegio -e POSTGRES_PASSWORD=postgres \

  -p 5432:5432 -d postgres:16

# 3. Backend

cd apps/api

cp .env.example .env       # rellenar valores

npm install

npx prisma migrate dev     # crea tablas

npx prisma db seed         # carga catálogo de carreras y regiones

npm run dev                # corre en http://localhost:4000

# 4. Frontend (en otra terminal)

cd ../web

cp .env.local.example .env.local

npm install

npm run dev                # corre en http://localhost:3000

# **9. Configuración de Railway (Backend y Base de Datos)**

## **9.1 Crear el proyecto**

- **Paso 1: **Iniciar sesión en railway.app con la cuenta de GitHub del equipo.

- **Paso 2: **New Project → Deploy from GitHub repo → seleccionar el repositorio.

- **Paso 3: **En Settings → Root Directory, indicar apps/api para que Railway construya solo el backend.

- **Paso 4: **En Settings → Build, dejar Nixpacks (autodetecta Node) o crear un Dockerfile si se requiere.

## **9.2 Agregar PostgreSQL**

- **Paso 1: **En el canvas del proyecto, New → Database → Add PostgreSQL.

- **Paso 2: **Railway expone automáticamente la variable DATABASE_URL en el plugin de la base de datos.

- **Paso 3: **En el servicio del backend, ir a Variables → Add Reference → seleccionar Postgres.DATABASE_URL. Esto enlaza la conexión sin copiar credenciales.

## **9.3 Comandos de despliegue**

Configurar en el servicio del backend (Settings → Deploy):

Build Command:  npm install && npx prisma generate && npm run build

Start Command:  npx prisma migrate deploy && node dist/index.js

prisma migrate deploy aplica migraciones pendientes en cada arranque, evitando configurar pipelines separados.

## **9.4 Variables de entorno en Railway**

Cargar todas las variables del bloque 7.2 (excepto DATABASE_URL, que viene como referencia) en Variables del servicio backend. CORS_ORIGIN debe apuntar al dominio de Vercel una vez publicado.

## **9.5 Dominio del backend**

Settings → Networking → Generate Domain produce una URL del tipo https://api-colegio-production.up.railway.app. Esa URL se usa como NEXT_PUBLIC_API_URL en Vercel.

# **10. Configuración de Vercel (Frontend)**

## **10.1 Crear el proyecto**

- **Paso 1: **Iniciar sesión en vercel.com con GitHub.

- **Paso 2: **Add New → Project → importar el repositorio.

- **Paso 3: **En Configure Project, fijar Root Directory en apps/web.

- **Paso 4: **Framework Preset detecta Next.js automáticamente. Mantener Build Command (next build) e Install Command (npm install) por defecto.

## **10.2 Variables de entorno**

Settings → Environment Variables → cargar las tres variables del bloque 7.1 para los entornos Production y Preview. NEXT_PUBLIC_API_URL debe ser la URL pública del backend en Railway.

## **10.3 Dominio**

Vercel asigna un subdominio gratuito vercel.app. Si el cliente provee un dominio propio (por ejemplo colegioingenieros.pe), se configura en Settings → Domains agregando los registros CNAME que Vercel indique.

## **10.4 Previews automáticos**

Cada pull request genera un dominio temporal con su propia copia del frontend. Esto facilita la revisión visual de cambios antes de hacer merge a main.

# **11. Integraciones externas**

## **11.1 RENIEC (consulta de DNI)**

Para el MVP se usa apis.net.pe, que actúa como proxy a RENIEC y permite obtener nombres a partir del DNI con un token gratuito.

GET https://api.apis.net.pe/v2/reniec/dni?numero=12345678

Headers: Authorization: Bearer <RENIEC_API_TOKEN>

Respuesta:

{

  "numeroDocumento": "12345678",

  "nombres": "JUAN ALBERTO",

  "apellidoPaterno": "PEREZ",

  "apellidoMaterno": "GARCIA"

}

Si la API devuelve error o no encuentra el DNI, el formulario debe bloquear el envío de la solicitud (cumple con la H.U. 1 y el RF-04).

## **11.2 Cloudinary (archivos)**

Los archivos se suben directamente desde el navegador usando upload presets sin firmar, evitando que el backend reciba el binario. El backend solo almacena la URL devuelta por Cloudinary.

- Foto: máximo 2 MB, formato JPG o PNG, ratio 3:4, fondo blanco.

- Título profesional: PDF, máximo 5 MB.

- Voucher: JPG, PNG o PDF, máximo 5 MB.

## **11.3 Resend (correos transaccionales)**

Se utiliza para tres eventos del flujo: observación de expediente, aprobación con emisión de carnet y confirmación de pago. Las plantillas se mantienen como componentes JSX dentro del backend (apps/api/src/emails).

## **11.4 Pasarela de pago**

El acuerdo con el cliente permite dos modalidades: pago en la pasarela integrada (Culqi en modo sandbox para el MVP) o carga manual de voucher de banco externo. El backend expone /pagos/checkout para crear la intención de pago y /pagos/voucher para procesar la carga manual.

# **12. Modelo de datos resumido**

Esquema mínimo en Prisma para cubrir las historias de usuario US-01 a US-10. El detalle completo se mantiene en apps/api/prisma/schema.prisma.

| **Tabla** | **Campos clave** | **Notas** |
| --- | --- | --- |
| Region | id, nombre | Tacna, Lima, Arequipa, etc. |
| Carrera | id, nombre | Civil, Sistemas, Industrial, etc. |
| Postulacion | id, dni, nombres, regionId, carreraId, fotoUrl, tituloUrl, voucherUrl, gmail, estado | Estados: PENDIENTE, OBSERVADO, SUBSANADO, APROBADO, RECHAZADO |
| Observacion | id, postulacionId, mensaje, revisorId, creadoEn | Histórico de observaciones por expediente |
| Colegiado | id, codigo, dni, nombres, regionId, carreraId, fotoUrl, fechaAlta, habilitado | codigo = 5 dígitos correlativos por (region, carrera) |
| Mensualidad | id, colegiadoId, periodo (YYYY-MM), monto, pagadoEn | Una fila por mes, generada automáticamente |
| Revisor | id, nombres, regionId | Un revisor por región |
| Auditoria | id, accion, entidad, entidadId, actorId, fecha | Bitácora mínima |

## **12.1 Generación del código correlativo**

La asignación del código de 5 dígitos por región y carrera debe ejecutarse dentro de una transacción con bloqueo de fila, para evitar duplicados si dos revisores aprueban a la vez. Prisma soporta esto mediante prisma.$transaction y SELECT ... FOR UPDATE en una tabla de secuencias.

model Secuencia {

  id          Int @id @default(autoincrement())

  regionId    Int

  carreraId   Int

  ultimo      Int @default(0)

  @@unique([regionId, carreraId])

}

# **13. Flujo de despliegue continuo**

El flujo aprovecha la integración nativa de Vercel y Railway con GitHub. No se requiere configurar GitHub Actions para el MVP.

| **Rama** | **Vercel** | **Railway** | **Propósito** |
| --- | --- | --- | --- |
| main | Production | Production | Versión visible al cliente |
| develop | Preview | Preview env (manual) | Integración del equipo |
| feature/* | Preview por PR | — | Trabajo individual |

Cada push a main dispara: (1) build del frontend en Vercel con publicación atómica, (2) build del backend en Railway con prisma migrate deploy. Si la migración falla, Railway mantiene la versión anterior en línea.

# **14. Checklist de puesta en marcha**

Al cierre del Sprint 0, el responsable de entorno debe poder marcar todos los siguientes ítems:

- Repositorio creado en GitHub con la estructura apps/web y apps/api.

- Proyecto Railway creado con el servicio backend conectado al repo.

- Plugin PostgreSQL agregado y DATABASE_URL referenciada en el backend.

- Variables del backend cargadas en Railway.

- Backend desplegado con un endpoint /health respondiendo 200 OK.

- Migraciones Prisma aplicadas y catálogos de regiones y carreras sembrados.

- Proyecto Vercel creado apuntando a apps/web.

- Variables del frontend cargadas en Vercel para Production y Preview.

- Frontend desplegado con la página de inicio accesible.

- Token de apis.net.pe probado contra un DNI real.

- Cuenta de Cloudinary con upload preset "colegio-mvp" creado.

- Cuenta de Resend con dominio verificado o sandbox activado.

- Sandbox de Culqi con claves cargadas en ambos servicios.

- README del repositorio con los pasos de la sección 8.

# **15. Riesgos del entorno y mitigación**

| **Riesgo** | **Impacto** | **Mitigación** |
| --- | --- | --- |
| Caída de la API RENIEC (apis.net.pe) | Bloquea inscripción virtual | Permitir registro físico por revisor con validación posterior |
| Agotamiento de créditos Railway | Backend y BD fuera de línea | Monitorear consumo en Railway → Usage; el plan Hobby otorga USD 5 mensuales |
| Cambio de credenciales por terceros | Funciones rotas | Rotar tokens en Railway → Variables sin redeploy |
| Pérdida de archivos en Cloudinary free | Carnets sin foto | Backup mensual de URLs y descarga en lote vía API de Cloudinary |
| Exposición de datos personales | Asumido por el cliente en MVP | Documentado como deuda técnica para la siguiente fase (Ley 29733) |

# **16. Anexos**

## **16.1 Comandos útiles**

# Ver logs del backend en Railway

railway logs --service api

# Conectarse a la base de datos remota

railway connect Postgres

# Generar nueva migración Prisma

npx prisma migrate dev --name <descripcion>

# Forzar redeploy en Vercel

vercel --prod

# Revisar variables actuales en Railway

railway variables

## **16.2 Glosario**

- **MVP: **Producto Mínimo Viable. Versión funcional con las capacidades imprescindibles.

- **ORM: **Object Relational Mapper. Capa que traduce objetos del código a tablas SQL.

- **Edge: **Red de servidores cercana al usuario para reducir latencia.

- **Webhook: **Llamada HTTP automática desde un servicio externo (por ejemplo, Culqi avisando un pago).
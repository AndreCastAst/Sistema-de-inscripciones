Sistema de Inscripciones – CIP · Historias y Requisitos Finales

**Historias de Usuario y Requisitos Finales**

Sistema de Inscripciones – Colegio de Ingenieros del Perú

*Documento consolidado v2 — incluye cobertura integral del entorno físico*

# 1. Propósito del documento

Este documento consolida las historias de usuario y los requisitos funcionales y no funcionales finales del Sistema de Inscripciones del Colegio de Ingenieros, tras resolver las contradicciones presentes entre las cuatro fuentes de entrada del proyecto: indicaciones iniciales del cliente, historias de usuario preliminares (Enfoque 1), requisitos preliminares (Enfoque 2) y respuestas obtenidas en la entrevista de validación con el cliente.

Cada historia final indica explícitamente los requisitos funcionales que cumple, de modo que se mantenga la trazabilidad entre ambos artefactos. El alcance funcional aquí descrito es coherente con la configuración técnica del MVP (Vercel + Railway + PostgreSQL) ya documentada por el equipo.

# 2. Orden de autoridad aplicado

Para resolver inconsistencias entre fuentes se aplicó el siguiente orden de prelación, de mayor a menor autoridad:

- Respuestas de la entrevista de validación con el cliente.

- Indicaciones iniciales del enunciado del proyecto.

- Historias de usuario preliminares y requisitos preliminares (igual rango).

Cuando una fuente de menor jerarquía contradice a una de mayor jerarquía, prevalece la de mayor jerarquía y se reformula la regla.

# 3. Contradicciones resueltas

La siguiente tabla resume las contradicciones detectadas entre los documentos de entrada y la resolución que se aplica en este documento final.

| **Tema** | **Versión previa** | **Fuente autorizada** | **Resolución aplicada** |
| --- | --- | --- | --- |
| Roles administrativos | Las historias (Enfoque 1) hablan de "Revisor / Administrador". Los requisitos (Enfoque 2) separan "Postulante, Secretario, Administrador". | Entrevista (P1): un solo rol administrativo, una persona revisa por región. | Se consolida un único rol: Revisor Regional. Existe un revisor por región del país. |
| Verificación del título profesional | RF-09 exigía consultar una API de títulos/diplomas para verificar autenticidad del PDF. | Entrevista (P2): la revisión en el primer sprint es manual; el revisor verifica externamente. | Se elimina la verificación automática vía API. El revisor valida visualmente el PDF y, de ser necesario, contrasta con fuentes externas por su cuenta. |
| Modalidad de pago de inscripción (S/1500) | Las indicaciones iniciales hablan de "recibo de pago" (voucher externo). RF-10 lo planteó tentativo. | Entrevista (P3): pasarela propia integrada, con opción de cargar voucher. | Se aceptan dos modalidades en paralelo: pago en pasarela integrada y carga manual de voucher de banco externo. |
| Selección de la carrera | US-02 y RF-06 asumían que el postulante elige su carrera de una lista predefinida. | Entrevista (P4): la persona que verifica el título es quien inscribe al postulante en la carrera. | El postulante no selecciona carrera. El revisor asigna la carrera al validar el título profesional contra el catálogo oficial del CIP. |
| Estructura del código de colegiado | Las indicaciones iniciales decían "5 dígitos único secuencial" (sugiere global). | Entrevista (P4): el código es por región y carrera. | El código es de 5 dígitos, único y correlativo dentro de cada combinación (Región, Carrera). No es global. |
| Autenticación de colegiados | US-08, US-09, RF-21 y RF-23 implicaban un "portal del colegiado" con sesión iniciada. | Entrevista (P7): no hay usuario ni contraseña; la información es pública para todos. | Se elimina toda autenticación del colegiado. El acceso al carnet, historial y registro de pagos es público y se realiza ingresando el DNI o el código de colegiado. |
| Formato y enriquecimiento del carnet | Las historias preliminares dejaban abierta la posibilidad de QR, fecha de vencimiento u otros. | Entrevista (P5): carnet digital simple; QR y fecha de vencimiento se consideraron no necesarios. | El carnet es digital simple. No incluye código QR de verificación ni fecha de vencimiento visible. El estado de habilitación se evalúa en tiempo real. |
| Texto exacto de la marca de agua | RF-26 reescribió la marca como "Inhabilitado/Moroso". | Indicaciones iniciales: texto literal "inhabilitado/morón". La entrevista no contradice ese literal. | Se mantiene el texto literal de las indicaciones iniciales: "inhabilitado/morón". |
| Canal de notificación al postulante | US-02 exigía específicamente una cuenta de Gmail. | Entrevista (P5): notificación por un medio a elección. | Se generaliza a correo electrónico (cualquier proveedor). No se exige Gmail. |
| Medidas de seguridad estrictas y Ley 29733 | RNF-01 y RF-30 incluían cifrado, autenticación y auditoría detallada. | Entrevista (P9): el PMV no contempla medidas de seguridad estrictas. | El PMV no implementa cifrado avanzado, ni controles de protección de datos personales según Ley 29733. Se documenta como deuda técnica para una fase posterior. |
| Cobertura del flujo físico | El flujo físico cubría solo la digitalización de documentos por el revisor (US-03). Pagos asumían canal digital (pasarela o voucher) y la subsanación se planteaba únicamente vía enlace por correo. | Aclaración posterior del cliente: el sistema debe ser válido y adaptable a un entorno físico completo, donde el revisor recibe documentos y pagos en ventanilla. | Se amplía US-03 (captura de pago en efectivo), se agrega US-11 (registro de pagos en ventanilla), se amplía US-06 (subsanación presencial). RF-10 pasa a tres modalidades de pago. Se incorporan RF-31, RF-32 y RF-33. |

# 4. Roles del sistema

Tras la consolidación se reconocen únicamente los siguientes roles:

- **Postulante: **ingeniero titulado que desea obtener su colegiatura. Interactúa con el formulario virtual de inscripción o presenta su expediente en ventanilla.

- **Colegiado: **ingeniero ya inscrito. No requiere autenticación; consulta su carnet y paga su mensualidad ingresando su DNI o su código de colegiado en una vista pública.

- **Revisor Regional: **único rol administrativo del sistema. Existe un revisor por región. Audita expedientes, asigna carrera, aprueba u observa solicitudes, registra expedientes presentados de forma física, recibe y registra pagos en efectivo en ventanilla (inscripción y mensualidades) y atiende subsanaciones presenciales.

# 5. Historias de Usuario finales

Se conservan los códigos US-01 a US-10 por trazabilidad respecto al documento original, ajustando descripciones y criterios de aceptación según las resoluciones de la sección 3. Cada historia indica los Requisitos Funcionales (RF) que cubre del catálogo final de la sección 6.

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-01 | **Título:** | Validación automática de identidad por DNI |
| **Prioridad:** | 1 | **Puntos:** | 3 |
| **Descripción:** |
| Como postulante al Colegio de Ingenieros, quiero ingresar mi número de DNI en el formulario de registro para que mis datos personales se validen y completen automáticamente sin errores de escritura. |
| **Criterios de aceptación:** |
| **1. **El formulario de inscripción virtual muestra un campo obligatorio para ingresar el número de DNI del interesado. |
| **2. **Al ingresar un DNI válido de 8 dígitos, la plataforma consulta la API de RENIEC y autocompleta el nombre completo, bloqueando la edición manual por parte del usuario. |
| **3. **Si el número de DNI no existe en RENIEC o la API no responde, se muestra un mensaje de error que impide continuar con el proceso de inscripción. |
| **Requisitos funcionales cubiertos: **RF-02, RF-03, RF-04 |

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-02 | **Título:** | Carga y envío del expediente de colegiatura |
| **Prioridad:** | 1 | **Puntos:** | 5 |
| **Descripción:** |
| Como postulante al Colegio de Ingenieros, quiero adjuntar los documentos requeridos y registrar mi correo electrónico para enviar formalmente mi solicitud al área de revisión. |
| **Criterios de aceptación:** |
| **1. **El formulario exige cargar obligatoriamente la fotografía digital (parámetros estrictos), el título profesional en formato PDF y, cuando corresponda, el comprobante de pago digitalizado por el monto único de S/1500. |
| **2. **El postulante ingresa una dirección de correo electrónico válida (cualquier proveedor) para el seguimiento del trámite y la recepción de notificaciones. |
| **3. **Como alternativa a la carga del comprobante, el postulante puede pagar los S/1500 directamente en la pasarela integrada; en ese caso el comprobante lo genera el propio sistema. |
| **4. **El postulante no selecciona carrera: ese campo lo asigna el revisor al validar el título. |
| **5. **El botón de envío permanece inhabilitado hasta que todos los campos obligatorios estén completos y los archivos cumplan formato y parámetros establecidos. |
| **Requisitos funcionales cubiertos: **RF-01, RF-05, RF-07, RF-08, RF-10, RF-11 |

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-03 | **Título:** | Registro manual de solicitudes y pagos en ventanilla |
| **Prioridad:** | 3 | **Puntos:** | 8 |
| **Descripción:** |
| Como Revisor Regional, quiero contar con una interfaz para digitalizar y dar de alta los expedientes que los postulantes presentan de manera física en la institución, y para recibir y registrar el pago de inscripción en efectivo cuando se efectúa en ventanilla, dentro de mi región. |
| **Criterios de aceptación:** |
| **1. **El panel administrativo del revisor incluye una sección dedicada para transcribir el DNI y el correo electrónico del postulante, y para cargar los documentos previamente escaneados en oficina (foto y título en PDF). |
| **2. **El sistema valida los datos de identidad contra la API de RENIEC antes de permitir el guardado del expediente físico. |
| **3. **Cuando el postulante paga los S/1500 en efectivo en la ventanilla, el revisor registra el cobro directamente en el sistema, sin requerir voucher externo ni pasarela digital. El sistema genera un comprobante interno imprimible (RF-32) que se entrega al postulante. |
| **4. **Si el postulante llegó con un voucher bancario físico, el revisor digitaliza el voucher y lo adjunta al expediente como evidencia de pago. |
| **5. **Si el postulante no posee correo electrónico, el revisor registra un canal de contacto alterno (teléfono o presencia en ventanilla) para la notificación de observaciones; se prioriza, en todo caso, capturar al menos un correo de un familiar o representante. |
| **6. **Al guardar el registro, la solicitud se incorpora automáticamente a la cola general de evaluación compartiendo el mismo flujo y estados que las solicitudes virtuales. |
| **7. **El revisor solo ve y opera expedientes pertenecientes a su propia región. |
| **Requisitos funcionales cubiertos: **RF-01, RF-02, RF-10, RF-12, RF-13, RF-29, RF-31, RF-32 |

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-04 | **Título:** | Auditoría de expedientes y asignación de carrera |
| **Prioridad:** | 2 | **Puntos:** | 5 |
| **Descripción:** |
| Como Revisor Regional, quiero visualizar de forma organizada los documentos cargados por los postulantes para auditar el cumplimiento de los requisitos y asignar la carrera de ingeniería correspondiente según el título. |
| **Criterios de aceptación:** |
| **1. **El revisor dispone de una bandeja centralizada con el DNI, nombre verificado y los archivos adjuntos de cada postulación recibida en su región. |
| **2. **La interfaz permite abrir y validar a pantalla completa el PDF del título profesional y la fotografía adjunta para verificar que cumplan los parámetros estrictos. |
| **3. **Al aprobar el título, el revisor selecciona la carrera de ingeniería del catálogo oficial del CIP. Esta asignación queda asociada al expediente. |
| **4. **La verificación de autenticidad del título es manual: no existe consulta automática a SUNEDU u otra fuente externa. |
| **5. **El sistema permite marcar el estado de cada documento de manera independiente (correcto / observado) para un control granular. |
| **Requisitos funcionales cubiertos: **RF-13, RF-14, RF-18, RF-29, RF-NF-01 (catálogo de carreras) |

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-05 | **Título:** | Emisión de observaciones en expedientes con errores |
| **Prioridad:** | 2 | **Puntos:** | 3 |
| **Descripción:** |
| Como Revisor Regional, quiero registrar observaciones detalladas cuando un expediente presente errores para notificar al postulante los motivos exactos del rechazo provisional. |
| **Criterios de aceptación:** |
| **1. **Al seleccionar la opción de observar una postulación, la interfaz despliega un campo de texto obligatorio para redactar el motivo detallado de la inconsistencia antes de guardar el estado. |
| **2. **Al confirmar la observación, el sistema congela provisionalmente el trámite y cambia su estado a "Observado". |
| **3. **El sistema envía un correo electrónico automatizado a la dirección registrada por el postulante (cualquier proveedor) incluyendo de forma íntegra el mensaje redactado por el revisor. |
| **Requisitos funcionales cubiertos: **RF-15, RF-16, RF-18 |

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-06 | **Título:** | Subsanación de expedientes observados (virtual o presencial) |
| **Prioridad:** | 2 | **Puntos:** | 5 |
| **Descripción:** |
| Como postulante, quiero un canal de reintento para corregir mis datos erróneos y volver a enviarlos sin reiniciar todo el trámite ni pagar nuevamente, ya sea por la plataforma o presentándome físicamente en la oficina del revisor. |
| **Criterios de aceptación:** |
| **1. **El correo de notificación incluye un enlace que redirige al postulante a su formulario original, manteniendo visibles y editables únicamente los campos o documentos que fueron observados. |
| **2. **El postulante puede modificar los campos observados, subir los archivos corregidos y reenviar la solicitud. |
| **3. **Alternativamente, el postulante puede acercarse físicamente al Revisor Regional con los documentos corregidos. El revisor reemplaza los archivos observados en el expediente desde su panel administrativo, sin alterar los documentos que ya estaban conformes. |
| **4. **Tanto la subsanación virtual como la presencial cambian automáticamente el estado del expediente a pendiente de revisión, sin aplicar cobros adicionales (no se vuelve a cobrar los S/1500 ni recargos). |
| **5. **No existe un límite explícito de intentos de reenvío en el MVP. |
| **Requisitos funcionales cubiertos: **RF-17, RF-18, RF-33 |

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-07 | **Título:** | Concesión de colegiatura y asignación de código por región y carrera |
| **Prioridad:** | 1 | **Puntos:** | 5 |
| **Descripción:** |
| Como Revisor Regional, quiero aprobar los expedientes conformes para formalizar el alta del nuevo miembro y asignarle su código oficial correlativo dentro de su región y carrera. |
| **Criterios de aceptación:** |
| **1. **Al aprobar un expediente totalmente conforme, la plataforma solicita confirmación final antes de proceder con el alta. |
| **2. **Al confirmar, el sistema genera automáticamente un código de colegiado de 5 dígitos, estrictamente correlativo y único dentro de la combinación (Región, Carrera) ya asignada al expediente. |
| **3. **El sistema cambia el rol del usuario de Postulante a Colegiado y lo indexa con su nuevo código. |
| **4. **La generación del código se ejecuta dentro de una transacción con bloqueo a nivel de fila para evitar duplicados en caso de aprobaciones simultáneas. |
| **Requisitos funcionales cubiertos: **RF-18, RF-19 |

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-08 | **Título:** | Emisión y visualización pública del carnet de ingeniero virtual |
| **Prioridad:** | 1 | **Puntos:** | 3 |
| **Descripción:** |
| Como colegiado (o como cualquier tercero), quiero poder visualizar y descargar el carnet de ingeniero ingresando el DNI o el código del colegiado, sin necesidad de iniciar sesión, para acreditar la condición de miembro registrado. |
| **Criterios de aceptación:** |
| **1. **Una vez aprobado el expediente y generado el código, el sistema envía automáticamente el carnet final al correo electrónico registrado por el nuevo colegiado. |
| **2. **La plataforma expone una vista pública en la que, ingresando el DNI o el código de colegiado, cualquier persona puede ver y descargar el carnet correspondiente. No existe usuario ni contraseña. |
| **3. **El carnet renderiza la fotografía cargada, los nombres completos validados por RENIEC, la carrera asignada por el revisor y el código de 5 dígitos. |
| **4. **El carnet es digital simple. No incluye código QR ni fecha de vencimiento visible; la habilitación se determina en tiempo real al momento de consultarlo. |
| **5. **El documento se descarga en un formato optimizado para dispositivos móviles. |
| **Requisitos funcionales cubiertos: **RF-20, RF-21, RF-NF-02 (acceso público sin autenticación) |

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-09 | **Título:** | Registro de pago de mensualidades (acceso público) |
| **Prioridad:** | 2 | **Puntos:** | 5 |
| **Descripción:** |
| Como colegiado, quiero registrar el pago de mi cuota mensual de S/20 sin necesidad de iniciar sesión, ingresando mi DNI o mi código de colegiado en una vista pública, para mantener vigente mi condición. |
| **Criterios de aceptación:** |
| **1. **La vista pública de pagos identifica al colegiado por DNI o código y muestra el monto adeudado calculado como S/20 multiplicado por el número de meses pendientes. |
| **2. **La obligación de pago empieza a contar a partir del mes siguiente al de la aprobación del expediente. |
| **3. **La transacción puede registrarse cualquier día calendario del mes corriente. |
| **4. **El colegiado puede pagar mediante la pasarela integrada o cargando un voucher de banco externo. Como tercera vía, puede acercarse al Revisor Regional y pagar en efectivo en ventanilla (ver US-11). |
| **5. **Al confirmarse el abono por cualquiera de las tres modalidades, el sistema extiende la vigencia de la habilitación hasta el último día del mes pagado. |
| **Requisitos funcionales cubiertos: **RF-10, RF-22, RF-23, RF-24, RF-28 |

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-10 | **Título:** | Condición del carnet (habilitación vs morosidad) y regularización |
| **Prioridad:** | 2 | **Puntos:** | 5 |
| **Descripción:** |
| Como colegiado, quiero que mi carnet refleje en tiempo real mi estado de habilitación y que la regularización del pago levante automáticamente la marca de inhabilitación. |
| **Criterios de aceptación:** |
| **1. **Si al concluir el último día del mes en curso no se registra el abono de la mensualidad, el sistema cambia la condición del colegiado a inhabilitado de forma automática. |
| **2. **Mientras la condición sea inhabilitado, cualquier visualización pública del carnet superpone, de forma indeleble, una marca de agua cruzada con el texto literal "inhabilitado/morón". |
| **3. **El módulo de pagos consolida los meses adeudados y calcula la liquidación como (meses pendientes × S/20), sin intereses, recargos ni penalidades. |
| **4. **En el instante en que se liquida la deuda total acumulada, el estado cambia a habilitado y cualquier nueva consulta del carnet lo muestra limpio, sin la marca de agua. |
| **5. **Tanto la imposición como el retiro de la marca de agua son automáticos: no requieren intervención del revisor. |
| **Requisitos funcionales cubiertos: **RF-22, RF-24, RF-25, RF-26, RF-27, RF-28 |

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | US-11 | **Título:** | Registro de pagos en ventanilla por el Revisor Regional |
| **Prioridad:** | 2 | **Puntos:** | 5 |
| **Descripción:** |
| Como Revisor Regional, quiero registrar en el sistema los pagos en efectivo que recibo en ventanilla (inscripción o mensualidades), para que el estado del postulante o colegiado se actualice de inmediato y quede respaldado por un comprobante imprimible. |
| **Criterios de aceptación:** |
| **1. **El panel del revisor incluye un módulo de pagos presenciales que permite identificar al pagador por DNI (en proceso de inscripción) o por DNI o código de colegiado (mensualidades). |
| **2. **El módulo permite registrar un pago único de S/1500 por inscripción, o S/20 multiplicado por la cantidad de meses adeudados (sin recargos ni intereses), seleccionando explícitamente los periodos cubiertos. |
| **3. **Al confirmar el cobro, el sistema genera automáticamente un comprobante interno imprimible con folio correlativo único, fecha y hora, monto, concepto, datos del pagador, región y datos del revisor que recibió el pago (ver RF-32). |
| **4. **El registro presencial dispara las mismas actualizaciones automáticas que un pago digital: en inscripción libera el trámite del bloqueo por falta de comprobante; en mensualidades extiende la habilitación y retira la marca de agua "inhabilitado/morón" si correspondía. |
| **5. **Cada transacción presencial queda vinculada en la bitácora al revisor que la capturó, su región y la fecha-hora exacta del registro, para fines de auditoría (RF-30). |
| **6. **El revisor solo puede registrar pagos asociados a postulantes o colegiados de su propia región. |
| **Requisitos funcionales cubiertos: **RF-10, RF-22, RF-23, RF-24, RF-27, RF-30, RF-31, RF-32 |

# 6. Requisitos funcionales finales

Lista consolidada después de aplicar las resoluciones de la sección 3. Se conserva la numeración original (RF-01 a RF-30) por trazabilidad. Los requisitos eliminados (RF-06 y RF-09) se indican expresamente y se conserva el espacio del código para no romper referencias previas.

| **Código** | **Nombre** | **Descripción** |
| --- | --- | --- |
| **RF-01** | Registro de postulantes (virtual y físico) | El sistema debe permitir el registro de postulantes mediante modalidad virtual (autoservicio) y modalidad física (mesa de partes, registrada por el revisor de la región). |
| **RF-02** | Validación de identidad mediante DNI (RENIEC) | El sistema debe consultar la API de RENIEC para validar el número de DNI y obtener los nombres completos del postulante. |
| **RF-03** | Autocompletado de datos personales | Al ingresar un DNI válido, el sistema debe autocompletar automáticamente los nombres completos y bloquear su edición manual. |
| **RF-04** | Bloqueo por indisponibilidad de RENIEC | Si la API de RENIEC no responde o el DNI no existe, el sistema debe impedir continuar con el proceso de inscripción. |
| **RF-05** | Registro de correo electrónico | El sistema debe solicitar una dirección de correo electrónico válida (cualquier proveedor) para el seguimiento del trámite y el envío de notificaciones. |
| **RF-06** | [ELIMINADO] Selección de carrera por el postulante | Eliminado. Por acuerdo con el cliente (entrevista P4), la carrera de ingeniería NO la elige el postulante: la asigna el revisor al verificar el título. Ver RF-19 y la US-04. |
| **RF-07** | Carga de fotografía | El sistema debe permitir cargar una fotografía digital validando parámetros estrictos: formato (JPG/PNG), resolución, tamaño máximo, ratio 3:4 y fondo requerido. |
| **RF-08** | Carga de título profesional en PDF | El sistema debe permitir cargar el título profesional exclusivamente en formato PDF, con un tamaño máximo definido. |
| **RF-09** | [ELIMINADO] Verificación automática del título | Eliminado. La verificación del título es manual por parte del revisor en el primer sprint (entrevista P2). No se integra SUNEDU ni otra API de diplomas en el MVP. |
| **RF-10** | Pago de inscripción y mensualidad (pasarela, voucher y efectivo) | El sistema debe aceptar tres modalidades para el cobro del derecho de inscripción de S/1500 y de las mensualidades de S/20: (a) pago en pasarela integrada, con comprobante generado por el sistema; (b) carga manual de voucher de banco externo, validada por el revisor; (c) pago en efectivo recibido en ventanilla por el Revisor Regional, registrado en el sistema y respaldado por un comprobante interno imprimible (ver RF-31 y RF-32). |
| **RF-11** | Validación de expediente completo | El sistema debe impedir el envío de la solicitud mientras existan campos obligatorios o documentos faltantes o que no cumplan los parámetros establecidos. |
| **RF-12** | Registro físico de expedientes por el revisor | El sistema debe permitir que el Revisor Regional registre y digitalice los expedientes presentados de manera física en su región, incorporándolos al mismo flujo que los virtuales, incluyendo la captura del pago de inscripción cuando este se realiza en efectivo en ventanilla. |
| **RF-13** | Bandeja de revisión de expedientes | El sistema debe mostrar al revisor una lista organizada de las postulaciones pendientes de evaluación de su región. |
| **RF-14** | Visualización de documentos del expediente | El sistema debe permitir visualizar a pantalla completa la fotografía, el diploma en PDF y, cuando aplique, el comprobante de pago de cada expediente. |
| **RF-15** | Registro de observaciones | El revisor debe poder registrar observaciones detalladas (texto obligatorio) sobre documentos incorrectos o incompletos. |
| **RF-16** | Notificación de observaciones por correo | El sistema debe enviar automáticamente un correo electrónico al postulante con el texto íntegro de la observación registrada por el revisor. |
| **RF-17** | Subsanación de expedientes observados | El postulante debe poder modificar únicamente los documentos o campos observados y reenviar su solicitud sin nuevos cobros, ya sea por el formulario virtual o presentando los documentos corregidos al Revisor Regional en ventanilla (ver RF-33). |
| **RF-18** | Estados del expediente | El sistema debe manejar los estados: Pendiente, En revisión, Observado, Subsanado, Aprobado, Rechazado. |
| **RF-19** | Generación del código de colegiado por (región, carrera) | Al aprobar una solicitud y tras la asignación de la carrera por el revisor, el sistema debe generar automáticamente un código de colegiado de 5 dígitos, único y correlativo dentro de la combinación (Región, Carrera). La generación debe ejecutarse en transacción con bloqueo para evitar duplicados. |
| **RF-20** | Emisión automática del carnet virtual | Al aprobar un expediente, el sistema debe generar y enviar por correo el carnet virtual del nuevo colegiado, con foto, nombres, carrera y código. |
| **RF-21** | Acceso público al carnet (sin autenticación) | La plataforma debe exponer una vista pública en la que, ingresando el DNI o el código de colegiado, cualquier persona pueda visualizar y descargar el carnet. No existe usuario ni contraseña. |
| **RF-22** | Inicio del cobro mensual | El sistema debe comenzar a generar cuotas mensuales de S/20 a partir del mes siguiente al de la aprobación del expediente del colegiado. |
| **RF-23** | Registro de pagos mensuales por cualquiera de los tres canales | El colegiado debe poder registrar el pago de mensualidades por: (a) pasarela integrada o (b) voucher de banco externo desde la vista pública (identificándose por DNI o código); o (c) en efectivo en ventanilla, en cuyo caso el registro lo efectúa el Revisor Regional a nombre del colegiado siguiendo RF-31. |
| **RF-24** | Cálculo automático de deuda sin recargos | El sistema debe calcular el total adeudado multiplicando los meses pendientes por S/20, sin intereses, recargos ni penalidades adicionales. |
| **RF-25** | Cambio automático a estado Inhabilitado | Si al concluir el último día del mes en curso no se registra el abono, el sistema cambia automáticamente la condición del colegiado a inhabilitado. |
| **RF-26** | Aplicación de marca de agua "inhabilitado/morón" | Mientras la condición del colegiado sea inhabilitado, toda visualización del carnet debe superponer una marca de agua cruzada con el texto literal "inhabilitado/morón". |
| **RF-27** | Rehabilitación automática inmediata | Al regularizar la totalidad de la deuda, el sistema debe restaurar de inmediato el estado habilitado y eliminar la marca de agua del carnet, sin intervención del revisor. |
| **RF-28** | Historial público de pagos y habilitación | Desde la misma vista pública (DNI o código), cualquier persona debe poder consultar los pagos realizados, los meses adeudados y el estado de habilitación del colegiado. |
| **RF-29** | Gestión de un revisor por región | El sistema debe administrar un único usuario revisor por cada región del país, con acceso restringido a los expedientes y colegiados de su propia región. |
| **RF-30** | Auditoría básica de acciones | El sistema debe registrar acciones relevantes: aprobaciones, observaciones, pagos (digitales y presenciales), cambios de estado y asignación de carrera. Cada registro debe incluir el actor (revisor o sistema), la región y la fecha-hora. La auditoría es básica, acorde con el alcance del MVP. |
| **RF-31** | Registro de pago presencial por el revisor | El sistema debe permitir al Revisor Regional registrar pagos en efectivo recibidos en ventanilla (inscripción o mensualidades), asociando cada transacción al postulante o colegiado por DNI o código, y al revisor que la capturó. El registro debe disparar inmediatamente las mismas actualizaciones de estado que cualquier otro pago: liberación del trámite de inscripción (RF-11) o rehabilitación con retiro de la marca de agua (RF-27). Solo el revisor de la región del pagador puede registrar el pago. |
| **RF-32** | Comprobante interno imprimible de pago presencial | Al registrarse un pago en ventanilla (modalidad (c) de RF-10), el sistema debe generar un comprobante interno imprimible con: folio correlativo único, fecha y hora, monto, concepto (inscripción o periodo(s) mensual(es) específico(s)), DNI y nombres del pagador, código de colegiado cuando aplique, región y datos del revisor receptor. El comprobante debe descargarse en formato PDF para impresión inmediata y entregarse al pagador. |
| **RF-33** | Subsanación presencial atendida por el revisor | El postulante observado debe poder subsanar su expediente entregando los documentos corregidos físicamente al Revisor Regional, quien reemplazará los archivos observados en el sistema desde su panel administrativo. El reenvío resultante sigue el mismo flujo de RF-17 sin costos adicionales y deja el expediente en estado pendiente de revisión. |

# 7. Requisitos no funcionales finales

Se ajustan los RNF de seguridad y de integraciones externas para reflejar el alcance del MVP definido en la entrevista (sin medidas de seguridad estrictas, sin verificación automática del título, sin autenticación de colegiados).

| **Código** | **Nombre** | **Descripción** |
| --- | --- | --- |
| **RNF-01** | Seguridad mínima del MVP | El sistema debe transmitir la información sobre HTTPS y mantener separadas las claves privadas (Culqi, Resend) del frontend. No se implementan cifrado en reposo ni controles avanzados; cumplimiento estricto de la Ley 29733 queda como deuda técnica. |
| **RNF-02** | Disponibilidad continua | La plataforma debe estar disponible las 24 horas del día, dentro de las garantías de los proveedores administrados (Vercel y Railway). |
| **RNF-03** | Rendimiento en APIs externas | Las consultas a APIs externas (RENIEC) no deben superar 5 segundos de tiempo de respuesta promedio. Ante timeouts, ver RF-04. |
| **RNF-04** | Escalabilidad progresiva | El sistema debe soportar el crecimiento del número de colegiados, expedientes y mensualidades sin requerir cambios estructurales en la arquitectura del MVP. |
| **RNF-05** | Compatibilidad multiplataforma | El sistema debe funcionar correctamente en computadoras, tablets y teléfonos móviles. |
| **RNF-06** | Compatibilidad de navegadores | La plataforma debe ser compatible con versiones recientes de Chrome, Edge y Firefox. |
| **RNF-07** | Integraciones externas del MVP | El sistema debe integrarse con la API de RENIEC (vía apis.net.pe), Cloudinary para almacenamiento de imágenes y PDFs, Resend para correos transaccionales y una pasarela de pago (Culqi en sandbox). NO integra SUNEDU ni APIs de diplomas. |
| **RNF-08** | Respaldo de información | La base de datos PostgreSQL administrada por Railway debe contar con copias de seguridad periódicas; el equipo mantiene un respaldo manual de URLs de Cloudinary. |
| **RNF-09** | Trazabilidad básica | El sistema debe almacenar el historial de acciones relevantes (auditoría de la sección RF-30) y el histórico de observaciones por expediente. |
| **RNF-10** | Usabilidad | La interfaz debe ser intuitiva y operable por usuarios no técnicos, priorizando formularios claros y mensajes de validación explícitos. |
| **RNF-11** | Accesibilidad básica | La plataforma debe permitir el uso desde dispositivos móviles y conexiones de internet estándar, con tamaños de letra legibles y controles táctiles cómodos. |
| **RNF-12** | Integridad del código de colegiado | El sistema debe garantizar que no existan códigos de colegiado duplicados dentro de la combinación (Región, Carrera), aplicando bloqueo transaccional en la generación. |
| **RNF-13** | Mantenibilidad y modularidad | El sistema debe desarrollarse con arquitectura modular: separación clara entre frontend (Next.js en Vercel) y backend (Express en Railway), uso de Prisma como capa ORM. |
| **RNF-14** | Disponibilidad de archivos cargados | Los archivos cargados (foto, título PDF, voucher) deben almacenarse en Cloudinary y permanecer disponibles para consulta posterior por parte del revisor y para renderizado del carnet. |
| **RNF-15** | Automatización de notificaciones y comprobantes | El sistema debe enviar automáticamente correos electrónicos para: observación de expediente, aprobación con emisión de carnet y confirmación de pago (inscripción y mensualidades, independientemente del canal usado). Para pagos en ventanilla, además del correo, se genera un comprobante imprimible al instante (RF-32) que el revisor entrega físicamente al pagador. |

# 8. Matriz de trazabilidad Historia ↔ Requisitos

Resumen rápido de la cobertura mutua entre historias y requisitos funcionales. Permite verificar que cada RF está respaldado por al menos una historia y viceversa.

| **Historia** | **Título corto** | **Requisitos funcionales cubiertos** |
| --- | --- | --- |
| **US-01** | Validación de identidad por DNI | RF-02, RF-03, RF-04 |
| **US-02** | Carga y envío del expediente | RF-01, RF-05, RF-07, RF-08, RF-10, RF-11 |
| **US-03** | Registro manual de solicitudes y pagos en ventanilla | RF-01, RF-02, RF-10, RF-12, RF-13, RF-29, RF-31, RF-32 |
| **US-04** | Auditoría y asignación de carrera | RF-13, RF-14, RF-18, RF-29 |
| **US-05** | Emisión de observaciones | RF-15, RF-16, RF-18 |
| **US-06** | Subsanación de expedientes (virtual o presencial) | RF-17, RF-18, RF-33 |
| **US-07** | Concesión y código (región, carrera) | RF-18, RF-19 |
| **US-08** | Carnet público sin autenticación | RF-20, RF-21 |
| **US-09** | Pago de mensualidades (vía digital) | RF-10, RF-22, RF-23, RF-24, RF-28 |
| **US-10** | Habilitación / morosidad y rehabilitación | RF-22, RF-24, RF-25, RF-26, RF-27, RF-28 |
| **US-11** | Registro de pagos en ventanilla por el revisor | RF-10, RF-22, RF-23, RF-24, RF-27, RF-30, RF-31, RF-32 |

## Notas finales

- Los requisitos RF-06 (selección de carrera por el postulante) y RF-09 (verificación automática del título) fueron eliminados en la consolidación; quedan documentados como referencia histórica.

- Cualquier referencia previa a Gmail como canal único de notificación debe leerse como "correo electrónico" sin restricción de proveedor.

- La marca de agua usa el texto literal "inhabilitado/morón" tal como figura en las indicaciones iniciales del cliente; reformulaciones como "Moroso" no se aplican.

- El cumplimiento estricto de la Ley N° 29733 de Protección de Datos Personales se documenta como deuda técnica para una fase posterior al MVP.

- La modalidad física es un canal de primera clase, equivalente al digital: cualquier postulante o colegiado puede completar todo su ciclo (inscripción, subsanación y pago de mensualidades) acercándose al Revisor Regional de su región, sin que esto requiera funcionalidades distintas a las descritas en US-03, US-06 y US-11.


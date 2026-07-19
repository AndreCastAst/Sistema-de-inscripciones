**ÉPICA 1 — Registro e Inscripción de Postulantes**

**PORTAL PÚBLICO (REGISTRO Y PAGO):**

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | Hpos-01 | **Título:** | Carga de datos y envío del expediente de colegiatura virtual. |
| **Prioridad:** | 4 | **Puntos:** | 3 |
| **Descripción** |
| Como postulante al Colegio de Ingenieros, quiero ingresar datos en el formulario de registro para que mis datos personales se validen y completen automáticamente sin errores de escritura, así como adjuntar los documentos requeridos y registrar mi correo electrónico para enviar formalmente mi solicitud al área de revisión. |
| **Criterios de aceptación** |
| **1. **El formulario de inscripción virtual muestra un campo obligatorio para ingresar el número de DNI del interesado. |
| **2. **Al ingresar un DNI válido de 8 dígitos, la plataforma consulta la API de RENIEC y autocompleta el nombre completo, bloqueando la edición manual por parte del usuario. |
| **3. **Si el número de DNI no existe en RENIEC o la API no responde, se muestra un mensaje de error que impide continuar con el proceso de inscripción. |
| **4. **El formulario exige cargar obligatoriamente la fotografía digital (parámetros estrictos), el título profesional en formato PDF y, cuando corresponda, el comprobante de pago digitalizado por el monto único de S/1500. |
| **5.** El postulante ingresa una dirección de correo electrónico válida (cualquier proveedor) para el seguimiento del trámite y la recepción de notificaciones. |
| ** 6. **El postulante no selecciona carrera: ese campo lo asigna el revisor al validar el título. |
| ** 7. **El botón de envío permanece inhabilitado hasta que todos los campos obligatorios estén completos y los archivos cumplan formato y parámetros establecidos. |
| **8. Ante un registro de solicitud exitosa, el sistema guarda el expediente con el estado “Nuevo”** |

HISTORIA INICIO DE SESIÓN:

Historia: Inicio de sesión

Como revisor quiero iniciar sesión para ver datos y realizar operaciones

Criterios: 

- Se debe autenticar el usuario y contraseña juntos, si uno es incorrecto, el sistema muestra error. 

**MÓDULO DE VENTANILLA (****URGENTE: ACTUALIZAR****): NUEVO EXPEDIENTE FÍSICO(REGISTRO Y PAGO) -****>**** AL REGISTRAR, SE REGISTRA EN EL COLEGIO AUTOMÁTICAMENTE**

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | Hrev-01 | **Título:** | Registro presencial de postulante y emisión inmediata de colegiatura en ventanilla |
| **Prioridad:** | 2 | **Puntos:** | 8 |
| **Descripción** |
| Como Revisor Regional, quiero contar con una interfaz para registrar en el momento a un postulante que se presenta físicamente en la institución, revisar sus documentos en tiempo real, asignarle su capítulo/especialidad CIP y, si todo está conforme, aprobar el expediente de inmediato para que el sistema genere su código de colegiado y su carnet virtual, dentro de mi región. |
| **Criterios de aceptación** |
| **1. **El panel del revisor incluye una sección para transcribir el DNI del postulante; el sistema consulta la API de RENIEC y autocompleta el nombre completo. El revisor también registra el correo electrónico y carga los documentos escaneados en el acto (fotografía y título en PDF). |
| **2. **El revisor revisa los documentos en pantalla en el momento de la atención y decide de inmediato si son aptos o no, sin dejar el expediente en cola pendiente. |
| **3. **El revisor asigna el Capítulo / Especialidad CIP correspondiente al título presentado, seleccionándolo del catálogo oficial. Este campo es obligatorio para poder aprobar. |
| **4. **Si los documentos son conformes, el revisor aprueba el expediente en el acto: el sistema genera automáticamente el código de colegiado de 5 dígitos, correlativo y único dentro de la combinación (Región, Capítulo/Especialidad CIP), cambia el rol del usuario a Colegiado y envía el carnet virtual al correo registrado. |
| **5. **Si los documentos presentan problemas, el revisor registra las observaciones en el sistema, el expediente queda en estado "Observado" y se notifica al postulante por correo con las indicaciones para subsanar. |
| **6. **Respecto al pago de los S/1500: el revisor puede registrarlo en efectivo directamente en el sistema (sin voucher externo), el postulante puede presentar un voucher bancario físico que el revisor digitaliza y adjunta, o el pago puede realizarse mediante la pasarela integrada. En los tres casos el sistema genera el comprobante interno imprimible (RF-32). |
| **7. **El revisor solo puede registrar y operar expedientes de postulantes pertenecientes a su propia región. |
| **8. **Al guardar el registro, si el expediente queda pendiente de revisión posterior, se incorpora a la cola general compartiendo el mismo flujo y estados que las solicitudes virtuales. |

**ÉPICA 2 — Revisión y Auditoría de Expedientes**

**NUEVA HISTORIA QUE DESCRIBE LA VISTA”Bandeja de Expedientes”**

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | Hrev-02 | **Título:** | Bandeja de expedientes del Revisor Regional |
| **Prioridad:** | 3 | **Puntos:** | 2 |
| **Descripción** |
| Como Revisor Regional, quiero ver un listado centralizado de todos los expedientes recibidos en mi región con sus datos generales y estado actual, para tener una visión global de la carga de trabajo y acceder rápidamente a los que requieren acción. |
| **Criterios de aceptación** |
| 1. El revisor visualiza una tabla con las columnas: DNI, nombre del postulante, fecha de ingreso, estado y acciones; mostrando únicamente expedientes de su propia región. |
| 2. Los estados posibles que puede mostrar la bandeja son: Nuevo, Observado, Corregido y Admitido, cada uno con su distintivo visual de color correspondiente. |
| 3. Los expedientes en estado Nuevo o Corregido muestran la acción "Revisar", que redirige al revisor a la pantalla de Auditoría Documental con el expediente abierto. |
| 4.Los expedientes en estado Admitido muestran la acción "Ver Detalle" en modo solo lectura. |
| 5. Los expedientes en estado Observado no muestran acción disponible, ya que se encuentran en espera de subsanación por parte del postulante. |
| 6. La bandeja dispone de un campo de búsqueda en tiempo real por DNI o nombre del postulante. |
| 7.El listado se presenta paginado mostrando el total de expedientes disponibles. |

**AUDITORÍA DOCUMENTAL (CHEQUEAR EXPEDIENTES, ACEPTARLOS U OBSERVARLOS): **

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | Hrev-03 | **Título:** | Gestión de expedientes |
| **Prioridad:** | 3 | **Puntos:** | 8 |
| **Descripción** |
| Como Revisor Regional, quiero visualizar de forma organizada los documentos cargados **de un expediente**  para auditar el cumplimiento de los requisitos y asignar la carrera de ingeniería correspondiente según el título, aprobar postulante o en su defecto observar el expediente con las observaciones correspondientes. |
| **Criterios de aceptación** |
| **1. En auditoría documental **revisor dispone de una bandeja centralizada con el DNI, nombre verificado, fecha de ingreso, estado y acciones de cada postulación recibida en su región. |
| **2. **La interfaz permite abrir y validar el PDF del título profesional y la fotografía adjunta para verificar que cumplan los parámetros estrictos. |
| **3. **Al aprobar el título, el **revisor debe seleccionar la carrera **de ingeniería del catálogo oficial del CIP. Esta asignación queda asociada al expediente. |
| **4. **La verificación de autenticidad del título es manual: no existe consulta automática a SUNEDU u otra fuente externa. |
| **5. **El sistema permite marcar el estado de cada documento de manera independiente (correcto / observado) para un control granular así como agregar en un campo las observaciones hechas. Si se crean observaciones no se puede aprobar, **las observaciones son obligatorias ante rechazo.** |
| **6. **Al confirmar la observación, el sistema congela provisionalmente el trámite y cambia su estado a "Observado"**.** |
| 7.El sistema envía un correo electrónico automatizado a la dirección registrada por el postulante (cualquier proveedor) incluyendo el mensaje redactado por el revisor. |
| **8.  **Al Aprobar, el sistema genera automáticamente un código de colegiado de 5 dígitos, estrictamente correlativo y único dentro de la combinación (Región, Carrera) ya asignada al expediente, luego el sistema envía automáticamente el carnet final al correo electrónico registrado por el nuevo colegiado. |
| 9. Al aprobar, el sistema cambia el rol del usuario de Postulante a Colegiado y lo indexa con su nuevo código, **enviando un correo electrónico automatizado a la dirección registrada avisando al usuario de la inscripción.** |
| **10. Al emitir la observación, el sistema cambia el estado del expediente de nuevo a observado.** |
| 11. La generación del código se ejecuta dentro de una transacción con bloqueo a nivel de fila para evitar duplicados en caso de aprobaciones simultáneas |

 

 **FALTA PANTALLA ÚNICA ****DE SUBSANACIÓN(SIMILAR A“Carga de Requisitos” EN PORTAL PÚBLICO, SÓLO ADMITIENDO EDITAR CAMPOS OBSERVADOS).**

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | Hpos-02 | **Título:** | Subsanación **virtual **de expedientes observados. |
| **Prioridad:** | 3 | **Puntos:** | 5 |
| **Descripción** |
| Como postulante, quiero un canal **virtual **de reintento para corregir mis datos erróneos y volver a enviarlos sin reiniciar todo el trámite ni pagar nuevamente. |
| **Criterios de aceptación** |
| **1. **El correo de notificación incluye un enlace que redirige al postulante a su formulario original, manteniendo visibles y editables únicamente los campos o documentos que fueron observados. |
| **2. **El postulante puede modificar los campos observados, subir los archivos corregidos y reenviar la solicitud. |
| **4. **La subsanación cambia automáticamente el estado del expediente a** “Corregido”**, sin aplicar cobros adicionales (no se vuelve a cobrar los S/1500 ni recargos). |
| **5. **No existe un límite explícito de intentos de reenvío en el MVP. |

**ÉPICA 3 — Aprobación y Generación de Colegiatura**

**CAMBIO: Consulta de Carnet + Pagos AHORA SE UNEN .**** SE CONSULTA CARNET, SE VE EL ESTADO, DEUDAS Y JUNTO A DEUDAS PUEDES PAGAR.**

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | Hcol-01 | **Título:** | Consulta pública de estado de carnet y pago de cuotas |
| **Prioridad:** | 4 | **Puntos:** | 8 |
| **Descripción** |
| Como colegiado (o como cualquier tercero), quiero poder visualizar el carnet de ingeniero ingresando el DNI o el código del colegiado, sin necesidad de iniciar sesión, ver su estado de habilitación actual, consultar cuotas pendientes y registrar el pago de mensualidades. |
| **Criterios de aceptación** |
| La plataforma expone una vista pública en la que, ingresando el DNI o el código de colegiado, cualquier persona puede visualizar el carnet correspondiente. No existe usuario ni contraseña. |
| **2. **El carnet renderiza la fotografía cargada, los nombres completos validados por RENIEC, la carrera asignada por el revisor y el código de 5 dígitos. |
| **3. **El carnet es digital simple. No incluye código QR ni fecha de vencimiento visible; la habilitación se determina en tiempo real al momento de consultarlo. |
| **4. **La misma vista muestra el estado de habilitación actual del colegiado y, si existe deuda, el detalle de meses pendientes con el monto adeudado calculado como S/20 multiplicado por el número de meses pendientes. |
| **5. La obligación de pago empieza a contar a partir del mes siguiente al de la aprobación del expediente. ** |
| **6. **Desde esta misma vista, el colegiado puede registrar el pago de sus cuotas mediante la pasarela integrada o cargando un voucher de banco externo. El pago en efectivo en ventanilla lo gestiona el Revisor Regional desde el módulo **Terminal de Cobro** |
| **7. **Al confirmarse el abono por cualquiera de las modalidades disponibles, el sistema extiende la vigencia de la habilitación hasta el último día del mes pagado. |
| **8.** La transacción puede registrarse cualquier día calendario del mes corriente y se envía la boleta al correo registrado del dni al que se le paga la mensualidad. |

**ÉPICA 4 — Gestión de Pagos y Habilitación de Colegiado**

 

**Hcol-03 - Condición del carnet - INTERFACE: Consulta_Carnet.html y Pagos.html**

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | Hcol-02 | **Título:** | Condición del carnet (habilitación vs inhabilitación) y regularización |
| **Prioridad:** | 3 | **Puntos:** | 5 |
| **Descripción** |
| Como colegiado, quiero que mi carnet refleje en tiempo real mi estado de habilitación y que la regularización del pago levante automáticamente la marca de inhabilitación. |
| **Criterios de aceptación** |
| **1. **Si al concluir el último día del mes en curso no se registra el abono de la mensualidad, el sistema cambia la condición del colegiado a inhabilitado de forma automática. |
| **2. **Mientras la condición sea de estado “inhabilitado”, cualquier visualización pública del carnet superpone, de forma indeleble, una marca de agua cruzada con el texto literal "inhabilitado". |
| **3. **El módulo de pagos consolida los meses adeudados y calcula la liquidación como (meses pendientes × S/20), sin intereses, recargos ni penalidades. |
| **4. **En el instante en que se liquida la deuda total acumulada, el estado cambia a habilitado y cualquier nueva consulta del carnet lo muestra limpio, sin la marca de agua. |
| **5. **Tanto la imposición como el retiro de la marca de agua son automáticos: no requieren intervención del revisor. |

 

**Hrev-04 - Registro de pagos en ventanilla por el Revisor Regional - INTERFACE: Ventanilla.html**

**CAMBIO: ****Registro de pagos en ventanilla por el Revisor Regional SOLO ES PARA MENSUALIDADES DE COLEGIADOS**

| **HISTORIA DE USUARIO** |
| --- |
| **Código:** | Hrev-04 | **Título:** | Registro de pagos en ventanilla por el Revisor Regional |
| **Prioridad:** | 3 | **Puntos:** | 5 |
| **Descripción** |
| Como Revisor Regional, quiero registrar en el sistema los pagos en efectivo que recibo en ventanilla (mensualidades), para que el estado del colegiado se actualice de inmediato y quede respaldado por un comprobante imprimible. |
| **Criterios de aceptación** |
| **1.** Dentro de **Terminal de Cobro** se podrá pagar las mensualidades a deber del ingeniero registrado. No se podrán pagar mensualidades posteriores si es que existe una atrasada previa. Los métodos de pago son Efectivo, pasarela digital y boucher bancario. |
| **2. **Al confirmar el cobro, el sistema genera automáticamente un comprobante interno imprimible con folio correlativo único, fecha y hora, monto, concepto, datos del pagador, región y datos del revisor que recibió el pago (ver RF-32). |
| **3. **El registro presencial dispara las mismas actualizaciones automáticas que un pago digital; se extiende la habilitación y retira la marca de agua "inhabilitado" si correspondía. |
| **4. **Cada transacción presencial queda vinculada en la bitácora al revisor que la capturó, su región y la fecha-hora exacta del registro, para fines de futuras auditorías. |
| **5. **El revisor solo puede registrar pagos asociados a postulantes o colegiados de su propia región. |
/* =========================================================
   MAPA EDUCACIONAL
   JAVASCRIPT PRINCIPAL
========================================================= */


/* =========================================================
   CONEXIÓN CON GOOGLE SHEETS
========================================================= */

const URL_DATOS =
    "https://script.google.com/macros/s/AKfycbzIIdCiV8N2NjVerGX9YqVDMpY8IuPA4abZR7TpSJuPBaOgczkAt3MbhuylawSt9kCz/exec";


/* =========================================================
   DATOS
========================================================= */

let colegios = [];

let colegiosVisibles = [];


/* =========================================================
   UBICACIÓN DEL USUARIO
========================================================= */

let ubicacionUsuario = null;

let marcadorUsuario = null;

let circuloPrecision = null;


/* =========================================================
   CONFIGURACIÓN DEL MAPA
========================================================= */

const mapa = L.map("mapa").setView(
    [-38.995, -73.08],
    11
);


/* =========================================================
   OPENSTREETMAP
========================================================= */

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,

        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
).addTo(mapa);


/* =========================================================
   GRUPO DE MARCADORES
========================================================= */

const grupoMarcadores =
    L.layerGroup().addTo(mapa);


/* =========================================================
   ELEMENTOS HTML
========================================================= */

const listaColegios =
    document.getElementById("listaColegios");

const contador =
    document.getElementById("contador");

const buscador =
    document.getElementById("buscador");

const filtroLocalidad =
    document.getElementById("filtroLocalidad");

const filtroDependencia =
    document.getElementById("filtroDependencia");

const filtroNivel =
    document.getElementById("filtroNivel");

const limpiarFiltros =
    document.getElementById("limpiarFiltros");

const exportarExcel =
    document.getElementById("exportarExcel");


/* =========================================================
   MARCADORES
========================================================= */

const marcadores = {};


/* =========================================================
   FUNCIÓN PARA NORMALIZAR NOMBRES DE COLUMNAS
========================================================= */

function normalizarClave(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();

}


/* =========================================================
   OBTENER DATO DE GOOGLE SHEETS
========================================================= */

function obtenerDato(colegio, nombreCampo) {

    const claveBuscada =
        normalizarClave(nombreCampo);


    const claveReal =
        Object.keys(colegio).find(
            clave =>
                normalizarClave(clave) ===
                claveBuscada
        );


    if (!claveReal) {

        return "";

    }


    return colegio[claveReal] ?? "";

}


/* =========================================================
   CONVERTIR COORDENADAS
========================================================= */

function convertirCoordenada(valor) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return null;

    }


    let coordenada =
        String(valor).trim();


    coordenada =
        coordenada.replace(",", ".");


    const numero =
        Number(coordenada);


    if (
        !Number.isFinite(numero)
    ) {

        return null;

    }


    return numero;

}


/* =========================================================
   CREAR URL DE GOOGLE MAPS
========================================================= */

function obtenerUrlGoogleMaps(colegio) {

    const consulta =
        `${colegio.nombre}, ${colegio.direccion}, ${colegio.localidad}, ${colegio.comuna}, Chile`;

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;

}


/* =========================================================
   CREAR URL DE RUTA DESDE LA UBICACIÓN DEL USUARIO
========================================================= */

function obtenerUrlComoLlegar(colegio) {

    if (
        !ubicacionUsuario ||
        !Number.isFinite(colegio.lat) ||
        !Number.isFinite(colegio.lng)
    ) {

        return obtenerUrlGoogleMaps(colegio);

    }


    return (
        "https://www.google.com/maps/dir/?api=1" +
        `&origin=${ubicacionUsuario.lat},${ubicacionUsuario.lng}` +
        `&destination=${colegio.lat},${colegio.lng}` +
        "&travelmode=driving"
    );

}


/* =========================================================
   CARGAR DATOS DESDE GOOGLE SHEETS
========================================================= */

async function cargarDatos() {

    try {

        const respuesta =
            await fetch(
                URL_DATOS + "?v=" + Date.now()
            );


        if (!respuesta.ok) {

            throw new Error(
                "No fue posible obtener los datos."
            );

        }


        const datos =
            await respuesta.json();


        console.log(
            "Datos originales recibidos desde Google Sheets:",
            datos
        );


        colegios =
            datos

                .filter(
                    colegio =>
                        obtenerDato(colegio, "ID") !== ""
                )

                .map(
                    colegio => ({

                        id:
                            Number(
                                obtenerDato(
                                    colegio,
                                    "ID"
                                )
                            ),

                        nombre:
                            String(
                                obtenerDato(
                                    colegio,
                                    "NOMBRE"
                                )
                            ).trim(),

                        rbd:
                            String(
                                obtenerDato(
                                    colegio,
                                    "RBD"
                                )
                            ).trim(),

                        direccion:
                            String(
                                obtenerDato(
                                    colegio,
                                    "DIRECCIÓN"
                                )
                            ).trim(),

                        localidad:
                            String(
                                obtenerDato(
                                    colegio,
                                    "LOCALIDAD"
                                )
                            ).trim(),

                        comuna:
                            String(
                                obtenerDato(
                                    colegio,
                                    "COMUNA"
                                )
                            ).trim(),

                        dependencia:
                            String(
                                obtenerDato(
                                    colegio,
                                    "DEPENDENCIA"
                                )
                            ).trim(),

                        nivel:
                            String(
                                obtenerDato(
                                    colegio,
                                    "NIVEL"
                                )
                            ).trim(),

                        director:
                            String(
                                obtenerDato(
                                    colegio,
                                    "DIRECTOR"
                                )
                            ).trim(),

                        correo:
                            String(
                                obtenerDato(
                                    colegio,
                                    "CORREO"
                                )
                            ).trim(),

                        telefono:
                            String(
                                obtenerDato(
                                    colegio,
                                    "TELÉFONO"
                                )
                            ).trim(),

                        convivencia:
                            String(
                                obtenerDato(
                                    colegio,
                                    "CONVIVENCIA ESCOLAR"
                                )
                            ).trim(),

                        telefonoConvivencia:
                            String(
                                obtenerDato(
                                    colegio,
                                    "TELEFONO CONVIVENCIA"
                                )
                            ).trim(),

                        lat:
                            convertirCoordenada(
                                obtenerDato(
                                    colegio,
                                    "LATITUD"
                                )
                            ),

                        lng:
                            convertirCoordenada(
                                obtenerDato(
                                    colegio,
                                    "LONGITUD"
                                )
                            )

                    })
                );


        console.log(
            "Colegios procesados:",
            colegios
        );


        console.log(
            "TELÉFONOS:",
            colegios.map(
                colegio => ({
                    nombre: colegio.nombre,
                    telefono: colegio.telefono,
                    telefonoConvivencia:
                        colegio.telefonoConvivencia
                })
            )
        );


        iniciarSistema();


    } catch (error) {

        console.error(
            "Error cargando los datos:",
            error
        );


        mostrarErrorConexion();

    }

}


/* =========================================================
   ERROR DE CONEXIÓN
========================================================= */

function mostrarErrorConexion() {

    listaColegios.innerHTML = `

        <div class="sin-resultados">

            <span>⚠️</span>

            <p>
                No fue posible cargar los establecimientos.
            </p>

        </div>

    `;

    contador.textContent = "0";

}


/* =========================================================
   CREAR MARCADOR
========================================================= */

function crearMarcador(colegio) {

    const marcador =
        L.marker([
            colegio.lat,
            colegio.lng
        ]);


    marcador.on(
        "click",
        function () {

            seleccionarColegio(
                colegio
            );

        }
    );


    marcadores[colegio.id] =
        marcador;


    return marcador;

}


/* =========================================================
   CARGAR MARCADORES
========================================================= */

function cargarMarcadores(lista) {

    grupoMarcadores.clearLayers();


    lista.forEach(
        colegio => {

            const marcador =
                marcadores[colegio.id] ||
                crearMarcador(colegio);


            if (
                Number.isFinite(colegio.lat) &&
                Number.isFinite(colegio.lng)
            ) {

                marcador.addTo(
                    grupoMarcadores
                );

            }

        }
    );


    /*
     * Si existe ubicación del usuario,
     * volvemos a mostrar su marcador.
     */

    mostrarMarcadorUsuario();

}


/* =========================================================
   CREAR TARJETA DEL LISTADO
========================================================= */

function crearTarjetaColegio(colegio) {

    const tarjeta =
        document.createElement("div");


    tarjeta.className =
        "colegio-card";


    tarjeta.dataset.id =
        colegio.id;


    tarjeta.innerHTML = `

        <div class="colegio-nombre">
            ${colegio.nombre}
        </div>


        <div class="colegio-rbd">
            RBD: ${colegio.rbd}
        </div>


        <div class="colegio-info">
            📍 ${colegio.localidad}
        </div>


        <div class="colegio-info">
            🏫 ${colegio.dependencia}
        </div>


        <div class="colegio-info">
            📚 ${colegio.nivel}
        </div>

    `;


    tarjeta.addEventListener(
        "click",
        function () {

            seleccionarColegio(
                colegio
            );

        }
    );


    return tarjeta;

}


/* =========================================================
   MOSTRAR COLEGIOS
========================================================= */

function mostrarColegios(lista) {

    colegiosVisibles =
        lista;


    listaColegios.innerHTML = "";


    contador.textContent =
        lista.length;


    if (lista.length === 0) {

        listaColegios.innerHTML = `

            <div class="sin-resultados">

                <span>🔎</span>

                <p>
                    No se encontraron establecimientos
                </p>

            </div>

        `;


        cargarMarcadores([]);


        return;

    }


    lista.forEach(
        colegio => {

            const tarjeta =
                crearTarjetaColegio(
                    colegio
                );


            listaColegios.appendChild(
                tarjeta
            );

        }
    );


    cargarMarcadores(
        lista
    );

}


/* =========================================================
   SELECCIONAR COLEGIO
========================================================= */

function seleccionarColegio(colegio) {

    console.log(
        "Colegio seleccionado:",
        colegio.nombre
    );


    console.log(
        "Datos completos del colegio:",
        colegio
    );


    if (
        Number.isFinite(colegio.lat) &&
        Number.isFinite(colegio.lng)
    ) {

        mapa.setView(
            [
                colegio.lat,
                colegio.lng
            ],
            16,
            {
                animate: true
            }
        );


        if (
            marcadores[colegio.id]
        ) {

            marcadores[
                colegio.id
            ].openPopup();

        }

    }


    mostrarFichaColegio(
        colegio
    );


    seleccionarColegioVisualmente(
        colegio.id
    );


    /*
     * En teléfonos, desplazamos la pantalla
     * hacia la ficha del establecimiento.
     */

    if (
        window.innerWidth <= 700
    ) {

        setTimeout(
            function () {

                const ficha =
                    document.getElementById(
                        "fichaColegio"
                    );


                if (ficha) {

                    ficha.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                }

            },
            250
        );

    }

}


/* =========================================================
   FUNCIÓN SEGURA PARA ACTUALIZAR LA FICHA
========================================================= */

function actualizarFicha(
    id,
    valor
) {

    const elemento =
        document.getElementById(id);


    if (elemento) {

        elemento.textContent =
            valor || "No informado";

    }

}


/* =========================================================
   MOSTRAR FICHA DEL ESTABLECIMIENTO
========================================================= */

function mostrarFichaColegio(colegio) {

    const ficha =
        document.getElementById(
            "fichaColegio"
        );


    actualizarFicha(
        "fichaNombre",
        colegio.nombre
    );


    actualizarFicha(
        "fichaRbd",
        `RBD ${colegio.rbd}`
    );


    actualizarFicha(
        "fichaDireccion",
        colegio.direccion
    );


    actualizarFicha(
        "fichaLocalidad",
        colegio.localidad
    );


    actualizarFicha(
        "fichaComuna",
        colegio.comuna
    );


    actualizarFicha(
        "fichaDependencia",
        colegio.dependencia
    );


    actualizarFicha(
        "fichaNivel",
        colegio.nivel
    );


    actualizarFicha(
        "fichaDirector",
        colegio.director
    );


    actualizarFicha(
        "fichaCorreo",
        colegio.correo
    );


    actualizarFicha(
        "fichaTelefono",
        colegio.telefono
    );


    actualizarFicha(
        "fichaConvivencia",
        colegio.convivencia
    );


    actualizarFicha(
        "fichaTelefonoConvivencia",
        colegio.telefonoConvivencia
    );


    /*
     * GOOGLE MAPS
     */

    const enlaceMaps =
        document.getElementById(
            "fichaGoogleMaps"
        );


    if (enlaceMaps) {

        enlaceMaps.href =
            obtenerUrlGoogleMaps(
                colegio
            );

    }


    /*
     * BOTÓN "CÓMO LLEGAR"
     */

    const enlaceComoLlegar =
        document.getElementById(
            "fichaComoLlegar"
        );


    if (enlaceComoLlegar) {

        if (
            ubicacionUsuario &&
            Number.isFinite(colegio.lat) &&
            Number.isFinite(colegio.lng)
        ) {

            enlaceComoLlegar.href =
                obtenerUrlComoLlegar(
                    colegio
                );


            enlaceComoLlegar.style.display =
                "flex";

        } else {

            /*
             * Si todavía no tenemos la ubicación,
             * dejamos el botón disponible para
             * solicitarla.
             */

            enlaceComoLlegar.href =
                "#";

            enlaceComoLlegar.style.display =
                "flex";

        }


        enlaceComoLlegar.onclick =
            function (evento) {

                /*
                 * Si ya tenemos ubicación,
                 * dejamos que Google Maps abra
                 * normalmente.
                 */

                if (ubicacionUsuario) {

                    return;

                }


                /*
                 * Si no tenemos ubicación,
                 * solicitamos permiso.
                 */

                evento.preventDefault();

                obtenerUbicacionUsuario(
                    colegio
                );

            };

    }


    /*
     * MOSTRAR FICHA
     */

    if (ficha) {

        ficha.classList.add(
            "visible"
        );

    }

}


/* =========================================================
   DESTACAR TARJETA SELECCIONADA
========================================================= */

function seleccionarColegioVisualmente(id) {

    const tarjetas =
        document.querySelectorAll(
            ".colegio-card"
        );


    tarjetas.forEach(
        tarjeta => {

            tarjeta.classList.remove(
                "seleccionado"
            );


            if (
                Number(tarjeta.dataset.id) ===
                Number(id)
            ) {

                tarjeta.classList.add(
                    "seleccionado"
                );


                tarjeta.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest"
                });

            }

        }
    );

}


/* =========================================================
   CARGAR FILTRO LOCALIDADES
========================================================= */

function cargarFiltroLocalidades() {

    filtroLocalidad.innerHTML =
        `<option value="">Todas</option>`;


    const localidades =
        [
            ...new Set(
                colegios
                    .map(
                        colegio =>
                            colegio.localidad
                    )
                    .filter(
                        localidad =>
                            localidad
                    )
            )
        ];


    localidades
        .sort()
        .forEach(
            localidad => {

                const opcion =
                    document.createElement(
                        "option"
                    );


                opcion.value =
                    localidad;


                opcion.textContent =
                    localidad;


                filtroLocalidad.appendChild(
                    opcion
                );

            }
        );

}


/* =========================================================
   CARGAR FILTRO DEPENDENCIAS
========================================================= */

function cargarFiltroDependencias() {

    filtroDependencia.innerHTML =
        `<option value="">Todas</option>`;


    const dependencias =
        [
            ...new Set(
                colegios
                    .map(
                        colegio =>
                            colegio.dependencia
                    )
                    .filter(
                        dependencia =>
                            dependencia
                    )
            )
        ];


    dependencias
        .sort()
        .forEach(
            dependencia => {

                const opcion =
                    document.createElement(
                        "option"
                    );


                opcion.value =
                    dependencia;


                opcion.textContent =
                    dependencia;


                filtroDependencia.appendChild(
                    opcion
                );

            }
        );

}


/* =========================================================
   CARGAR FILTRO NIVELES
========================================================= */

function cargarFiltroNiveles() {

    filtroNivel.innerHTML =
        `<option value="">Todos</option>`;


    const niveles =
        [
            ...new Set(
                colegios
                    .map(
                        colegio =>
                            colegio.nivel
                    )
                    .filter(
                        nivel =>
                            nivel
                    )
            )
        ];


    niveles
        .sort()
        .forEach(
            nivel => {

                const opcion =
                    document.createElement(
                        "option"
                    );


                opcion.value =
                    nivel;


                opcion.textContent =
                    nivel;


                filtroNivel.appendChild(
                    opcion
                );

            }
        );

}


/* =========================================================
   APLICAR FILTROS
========================================================= */

function aplicarFiltros() {

    const texto =
        buscador.value
            .toLowerCase()
            .trim();


    const localidad =
        filtroLocalidad.value;


    const dependencia =
        filtroDependencia.value;


    const nivel =
        filtroNivel.value;


    const resultados =
        colegios.filter(
            colegio => {

                const coincideTexto =

                    colegio.nombre
                        .toLowerCase()
                        .includes(texto)

                    ||

                    colegio.rbd
                        .toLowerCase()
                        .includes(texto)

                    ||

                    colegio.localidad
                        .toLowerCase()
                        .includes(texto)

                    ||

                    colegio.comuna
                        .toLowerCase()
                        .includes(texto)

                    ||

                    colegio.direccion
                        .toLowerCase()
                        .includes(texto);


                const coincideLocalidad =
                    !localidad ||
                    colegio.localidad ===
                    localidad;


                const coincideDependencia =
                    !dependencia ||
                    colegio.dependencia ===
                    dependencia;


                const coincideNivel =
                    !nivel ||
                    colegio.nivel ===
                    nivel;


                return (
                    coincideTexto &&
                    coincideLocalidad &&
                    coincideDependencia &&
                    coincideNivel
                );

            }
        );


    mostrarColegios(
        resultados
    );

}


/* =========================================================
   EXPORTAR ESTABLECIMIENTOS A EXCEL
========================================================= */

function exportarEstablecimientosExcel() {

    if (typeof XLSX === "undefined") {

        alert(
            "No fue posible cargar la función de exportación a Excel."
        );

        return;

    }


    if (
        !colegiosVisibles ||
        colegiosVisibles.length === 0
    ) {

        alert(
            "No hay establecimientos para exportar."
        );

        return;

    }


    /*
     * No se incluyen LATITUD ni LONGITUD.
     */

    const datosExcel =
        colegiosVisibles.map(
            colegio => ({

                "ID":
                    colegio.id,

                "NOMBRE":
                    colegio.nombre,

                "RBD":
                    colegio.rbd,

                "DIRECCIÓN":
                    colegio.direccion,

                "LOCALIDAD":
                    colegio.localidad,

                "COMUNA":
                    colegio.comuna,

                "DEPENDENCIA":
                    colegio.dependencia,

                "NIVEL":
                    colegio.nivel,

                "DIRECTOR":
                    colegio.director,

                "CORREO":
                    colegio.correo,

                "TELÉFONO":
                    colegio.telefono,

                "CONVIVENCIA ESCOLAR":
                    colegio.convivencia,

                "TELEFONO CONVIVENCIA":
                    colegio.telefonoConvivencia

            })
        );


    const hoja =
        XLSX.utils.json_to_sheet(
            datosExcel
        );


    hoja["!cols"] = [

        { wch: 8 },

        { wch: 40 },

        { wch: 12 },

        { wch: 35 },

        { wch: 20 },

        { wch: 20 },

        { wch: 25 },

        { wch: 25 },

        { wch: 30 },

        { wch: 35 },

        { wch: 18 },

        { wch: 30 },

        { wch: 22 }

    ];


    const libro =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Establecimientos"
    );


    const fecha =
        new Date();


    const año =
        fecha.getFullYear();


    const nombreArchivo =
        `Establecimientos_Educacionales_${año}.xlsx`;


    XLSX.writeFile(
        libro,
        nombreArchivo
    );

}


/* =========================================================
   OBTENER UBICACIÓN DEL USUARIO
========================================================= */

function obtenerUbicacionUsuario(
    colegioDestino = null
) {

    if (
        !navigator.geolocation
    ) {

        alert(
            "Este dispositivo o navegador no permite obtener la ubicación."
        );

        return;

    }


    /*
     * Indicamos visualmente que estamos
     * buscando la ubicación.
     */

    actualizarEstadoUbicacion(
        "Obteniendo ubicación..."
    );


    navigator.geolocation.getCurrentPosition(

        function (posicion) {

            const lat =
                posicion.coords.latitude;


            const lng =
                posicion.coords.longitude;


            const precision =
                posicion.coords.accuracy;


            ubicacionUsuario = {

                lat: lat,

                lng: lng,

                accuracy: precision

            };


            console.log(
                "Ubicación del usuario:",
                ubicacionUsuario
            );


            mostrarMarcadorUsuario();


            actualizarEstadoUbicacion(
                "Ubicación obtenida"
            );


            /*
             * Si la función fue llamada
             * desde "Cómo llegar",
             * actualizamos el enlace.
             */

            if (
                colegioDestino
            ) {

                mostrarFichaColegio(
                    colegioDestino
                );

            }


        },

        function (error) {

            console.error(
                "Error obteniendo ubicación:",
                error
            );


            actualizarEstadoUbicacion(
                "Ubicación no disponible"
            );


            switch (
                error.code
            ) {

                case error.PERMISSION_DENIED:

                    alert(
                        "No se permitió el acceso a tu ubicación. Debes autorizar la ubicación en el navegador para utilizar esta función."
                    );

                    break;


                case error.POSITION_UNAVAILABLE:

                    alert(
                        "No fue posible determinar tu ubicación actual."
                    );

                    break;


                case error.TIMEOUT:

                    alert(
                        "La solicitud de ubicación tardó demasiado. Inténtalo nuevamente."
                    );

                    break;


                default:

                    alert(
                        "Ocurrió un error al obtener tu ubicación."
                    );

            }

        },

        {

            enableHighAccuracy: true,

            timeout: 15000,

            maximumAge: 0

        }

    );

}


/* =========================================================
   MOSTRAR MARCADOR DEL USUARIO
========================================================= */

function mostrarMarcadorUsuario() {

    if (
        !ubicacionUsuario
    ) {

        return;

    }


    const posicion = [

        ubicacionUsuario.lat,

        ubicacionUsuario.lng

    ];


    /*
     * Si ya existe el marcador,
     * solamente actualizamos su posición.
     */

    if (
        marcadorUsuario
    ) {

        marcadorUsuario.setLatLng(
            posicion
        );

    } else {

        marcadorUsuario =
            L.marker(
                posicion,
                {
                    zIndexOffset: 1000
                }
            );


        marcadorUsuario.bindPopup(
            "<strong>📍 Tu ubicación</strong>"
        );

    }


    marcadorUsuario.addTo(
        mapa
    );


    /*
     * Círculo que representa aproximadamente
     * la precisión del GPS.
     */

    if (
        circuloPrecision
    ) {

        circuloPrecision.setLatLng(
            posicion
        );


        circuloPrecision.setRadius(
            ubicacionUsuario.accuracy
        );

    } else {

        circuloPrecision =
            L.circle(
                posicion,
                {
                    radius:
                        ubicacionUsuario.accuracy,

                    fillOpacity: 0.08,

                    opacity: 0.25
                }
            );


        circuloPrecision.addTo(
            mapa
        );

    }

}


/* =========================================================
   MOSTRAR ESTADO DE UBICACIÓN
========================================================= */

function actualizarEstadoUbicacion(
    mensaje
) {

    const elemento =
        document.getElementById(
            "estadoUbicacion"
        );


    if (elemento) {

        elemento.textContent =
            mensaje;

    }

}


/* =========================================================
   BUSCAR ESTABLECIMIENTO MÁS CERCANO
========================================================= */

function calcularDistancia(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const radioTierra =
        6371;


    const dLat =
        (lat2 - lat1) *
        Math.PI /
        180;


    const dLon =
        (lon2 - lon1) *
        Math.PI /
        180;


    const a =

        Math.sin(dLat / 2) *
        Math.sin(dLat / 2)

        +

        Math.cos(
            lat1 *
            Math.PI /
            180
        )

        *

        Math.cos(
            lat2 *
            Math.PI /
            180
        )

        *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return (
        radioTierra *
        c
    );

}


/* =========================================================
   ENCONTRAR ESTABLECIMIENTO MÁS CERCANO
========================================================= */

function obtenerColegioMasCercano() {

    if (
        !ubicacionUsuario
    ) {

        return null;

    }


    let colegioCercano =
        null;


    let distanciaMenor =
        Infinity;


    colegios.forEach(
        colegio => {

            if (
                !Number.isFinite(colegio.lat) ||
                !Number.isFinite(colegio.lng)
            ) {

                return;

            }


            const distancia =
                calcularDistancia(

                    ubicacionUsuario.lat,

                    ubicacionUsuario.lng,

                    colegio.lat,

                    colegio.lng

                );


            if (
                distancia <
                distanciaMenor
            ) {

                distanciaMenor =
                    distancia;

                colegioCercano =
                    colegio;

            }

        }
    );


    return colegioCercano;

}


/* =========================================================
   IR AL ESTABLECIMIENTO MÁS CERCANO
========================================================= */

function irAlColegioMasCercano() {

    if (
        !ubicacionUsuario
    ) {

        obtenerUbicacionUsuario();

        return;

    }


    const colegio =
        obtenerColegioMasCercano();


    if (
        !colegio
    ) {

        alert(
            "No se encontró ningún establecimiento con coordenadas disponibles."
        );

        return;

    }


    seleccionarColegio(
        colegio
    );


    /*
     * Actualizamos el botón "Cómo llegar"
     * con la ubicación actual.
     */

    const enlaceComoLlegar =
        document.getElementById(
            "fichaComoLlegar"
        );


    if (enlaceComoLlegar) {

        enlaceComoLlegar.href =
            obtenerUrlComoLlegar(
                colegio
            );

    }

}


/* =========================================================
   CERRAR FICHA
========================================================= */

const cerrarFicha =
    document.getElementById(
        "cerrarFicha"
    );


if (cerrarFicha) {

    cerrarFicha.addEventListener(
        "click",
        function () {

            const ficha =
                document.getElementById(
                    "fichaColegio"
                );


            if (ficha) {

                ficha.classList.remove(
                    "visible"
                );

            }


            document
                .querySelectorAll(
                    ".colegio-card"
                )
                .forEach(
                    tarjeta => {

                        tarjeta.classList.remove(
                            "seleccionado"
                        );

                    }
                );

        }
    );

}


/* =========================================================
   EVENTOS DEL BUSCADOR
========================================================= */

buscador.addEventListener(
    "input",
    aplicarFiltros
);


filtroLocalidad.addEventListener(
    "change",
    aplicarFiltros
);


filtroDependencia.addEventListener(
    "change",
    aplicarFiltros
);


filtroNivel.addEventListener(
    "change",
    aplicarFiltros
);


/* =========================================================
   LIMPIAR FILTROS
========================================================= */

limpiarFiltros.addEventListener(
    "click",
    function () {

        buscador.value = "";

        filtroLocalidad.value = "";

        filtroDependencia.value = "";

        filtroNivel.value = "";

        aplicarFiltros();

    }
);


/* =========================================================
   EVENTO EXPORTAR EXCEL
========================================================= */

if (exportarExcel) {

    exportarExcel.addEventListener(
        "click",
        exportarEstablecimientosExcel
    );

}


/* =========================================================
   BOTÓN MI UBICACIÓN
========================================================= */

const botonMiUbicacion =
    document.getElementById(
        "miUbicacion"
    );


if (botonMiUbicacion) {

    botonMiUbicacion.addEventListener(
        "click",
        function () {

            /*
             * Si todavía no tenemos ubicación,
             * la solicitamos.
             */

            if (
                !ubicacionUsuario
            ) {

                obtenerUbicacionUsuario();

                return;

            }


            /*
             * Si ya tenemos ubicación,
             * centramos nuevamente el mapa.
             */

            mapa.setView(

                [
                    ubicacionUsuario.lat,
                    ubicacionUsuario.lng
                ],

                16,

                {
                    animate: true
                }

            );


            mostrarMarcadorUsuario();

        }
    );

}


/* =========================================================
   BOTÓN ESTABLECIMIENTO MÁS CERCANO
========================================================= */

const botonMasCercano =
    document.getElementById(
        "establecimientoCercano"
    );


if (botonMasCercano) {

    botonMasCercano.addEventListener(
        "click",
        irAlColegioMasCercano
    );

}


/* =========================================================
   INICIAR SISTEMA
========================================================= */

function iniciarSistema() {

    cargarFiltroLocalidades();

    cargarFiltroDependencias();

    cargarFiltroNiveles();

    mostrarColegios(
        colegios
    );


    console.log(
        "Mapa Educacional iniciado correctamente."
    );

}


/* =========================================================
   CARGAR INFORMACIÓN
========================================================= */

cargarDatos();

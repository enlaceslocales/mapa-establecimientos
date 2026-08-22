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
   CONTROLES DE UBICACIÓN
========================================================= */

const btnMiUbicacion =
    document.getElementById("btnMiUbicacion");

const btnColegioCercano =
    document.getElementById("btnColegioCercano");


/* =========================================================
   MARCADORES DE COLEGIOS
========================================================= */

const marcadores = {};


/* =========================================================
   MARCADOR PERSONALIZADO DE USUARIO
========================================================= */

const iconoUsuario =
    L.divIcon({

        className:
            "marcador-usuario",

        html:
            '<div style="' +
            'width:18px;' +
            'height:18px;' +
            'background:#1769aa;' +
            'border:3px solid white;' +
            'border-radius:50%;' +
            'box-shadow:0 2px 8px rgba(0,0,0,.35);' +
            '"></div>',

        iconSize: [
            18,
            18
        ],

        iconAnchor: [
            9,
            9
        ]

    });


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

    /*
     * Si existen coordenadas válidas,
     * las utilizamos directamente.
     */

    if (
        Number.isFinite(colegio.lat) &&
        Number.isFinite(colegio.lng)
    ) {

        return (
            "https://www.google.com/maps/search/?api=1" +
            "&query=" +
            encodeURIComponent(
                `${colegio.lat},${colegio.lng}`
            )
        );

    }


    /*
     * Si no existen coordenadas,
     * utilizamos la información textual.
     */

    const consulta =
        `${colegio.nombre}, ${colegio.direccion}, ${colegio.localidad}, ${colegio.comuna}, Chile`;

    return (
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(consulta)
    );

}


/* =========================================================
   CREAR URL "CÓMO LLEGAR"
========================================================= */

function obtenerUrlComoLlegar(colegio) {

    /*
     * No podemos generar una ruta si todavía
     * no tenemos la ubicación del usuario.
     */

    if (!ubicacionUsuario) {

        return null;

    }


    /*
     * Destino:
     * utilizamos coordenadas cuando están disponibles.
     */

    let destino;


    if (
        Number.isFinite(colegio.lat) &&
        Number.isFinite(colegio.lng)
    ) {

        destino =
            `${colegio.lat},${colegio.lng}`;

    } else {

        destino =
            `${colegio.nombre}, ${colegio.direccion}, ${colegio.localidad}, ${colegio.comuna}, Chile`;

    }


    /*
     * Google Maps:
     *
     * origin = ubicación del usuario
     * destination = establecimiento
     * travelmode = driving
     */

    return (
        "https://www.google.com/maps/dir/?api=1" +
        "&origin=" +
        encodeURIComponent(
            `${ubicacionUsuario.lat},${ubicacionUsuario.lng}`
        ) +
        "&destination=" +
        encodeURIComponent(destino) +
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
   CREAR MARCADOR DE COLEGIO
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

            if (
                !Number.isFinite(colegio.lat) ||
                !Number.isFinite(colegio.lng)
            ) {

                return;

            }


            const marcador =
                marcadores[colegio.id] ||
                crearMarcador(colegio);


            marcador.addTo(
                grupoMarcadores
            );

        }
    );

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


    /* =====================================================
       GOOGLE MAPS
    ===================================================== */

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


    /* =====================================================
       CÓMO LLEGAR
    ===================================================== */

    const enlaceLlegar =
        document.getElementById(
            "fichaComoLlegar"
        );


    if (enlaceLlegar) {

        const urlLlegar =
            obtenerUrlComoLlegar(
                colegio
            );


        if (urlLlegar) {

            enlaceLlegar.href =
                urlLlegar;

            enlaceLlegar.style.display =
                "flex";

            enlaceLlegar.title =
                "Abrir ruta desde mi ubicación";

        } else {

            /*
             * No ocultamos el botón.
             * Al hacer clic podemos solicitar
             * la ubicación del usuario.
             */

            enlaceLlegar.href =
                "#";

            enlaceLlegar.title =
                "Primero debes permitir el acceso a tu ubicación";

            enlaceLlegar.onclick =
                function(evento) {

                    evento.preventDefault();

                    obtenerUbicacion(
                        function() {

                            const nuevaUrl =
                                obtenerUrlComoLlegar(
                                    colegio
                                );

                            if (nuevaUrl) {

                                window.open(
                                    nuevaUrl,
                                    "_blank"
                                );

                            }

                        }
                    );

                };

        }

    }


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

    if (
        typeof XLSX === "undefined"
    ) {

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
     * IMPORTANTE:
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
   GEOLOCALIZACIÓN
========================================================= */

/*
 * Esta función solicita al navegador la ubicación
 * actual del usuario.
 */

function obtenerUbicacion(
    alObtenerUbicacion
) {

    /*
     * Verificar compatibilidad
     */

    if (
        !navigator.geolocation
    ) {

        alert(
            "Tu navegador no permite obtener la ubicación."
        );

        return;

    }


    /*
     * Mostrar estado al usuario
     */

    if (btnMiUbicacion) {

        btnMiUbicacion.disabled =
            true;

        btnMiUbicacion.textContent =
            "📍 Obteniendo ubicación...";

    }


    navigator.geolocation.getCurrentPosition(

        function(posicion) {

            const lat =
                posicion.coords.latitude;


            const lng =
                posicion.coords.longitude;


            const precision =
                posicion.coords.accuracy;


            /*
             * Guardar ubicación
             */

            ubicacionUsuario = {

                lat:
                    lat,

                lng:
                    lng,

                accuracy:
                    precision

            };


            console.log(
                "Ubicación obtenida:",
                ubicacionUsuario
            );


            /*
             * Crear marcador de usuario
             */

            if (
                marcadorUsuario
            ) {

                marcadorUsuario.setLatLng([
                    lat,
                    lng
                ]);

            } else {

                marcadorUsuario =
                    L.marker(
                        [
                            lat,
                            lng
                        ],
                        {
                            icon:
                                iconoUsuario
                        }
                    ).addTo(
                        mapa
                    );

            }


            /*
             * Popup de ubicación
             */

            marcadorUsuario.bindPopup(
                `
                    <strong>📍 Tu ubicación</strong>
                    <br>
                    Precisión aproximada:
                    ${Math.round(precision)} metros
                `
            );


            /*
             * Círculo de precisión
             */

            if (
                circuloPrecision
            ) {

                circuloPrecision.setLatLng([
                    lat,
                    lng
                ]);

                circuloPrecision.setRadius(
                    precision
                );

            } else {

                circuloPrecision =
                    L.circle(
                        [
                            lat,
                            lng
                        ],
                        {
                            radius:
                                precision,

                            fillOpacity:
                                0.10,

                            weight:
                                1
                        }
                    ).addTo(
                        mapa
                    );

            }


            /*
             * Centrar mapa
             */

            mapa.setView(
                [
                    lat,
                    lng
                ],
                14,
                {
                    animate: true
                }
            );


            /*
             * Actualizar botón
             */

            if (btnMiUbicacion) {

                btnMiUbicacion.disabled =
                    false;

                btnMiUbicacion.textContent =
                    "📍 Mi ubicación";

            }


            /*
             * Ejecutar función posterior,
             * si existe.
             */

            if (
                typeof alObtenerUbicacion ===
                "function"
            ) {

                alObtenerUbicacion();

            }

        },


        function(error) {

            console.error(
                "Error de geolocalización:",
                error
            );


            if (btnMiUbicacion) {

                btnMiUbicacion.disabled =
                    false;

                btnMiUbicacion.textContent =
                    "📍 Mi ubicación";

            }


            /*
             * Mensajes según el tipo de error.
             */

            switch (
                error.code
            ) {

                case 1:

                    alert(
                        "No se permitió el acceso a tu ubicación. Revisa los permisos de ubicación de tu navegador."
                    );

                    break;


                case 2:

                    alert(
                        "No fue posible determinar tu ubicación. Comprueba que la ubicación de tu dispositivo esté activada."
                    );

                    break;


                case 3:

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
            enableHighAccuracy:
                true,

            timeout:
                15000,

            maximumAge:
                0

        }

    );

}


/* =========================================================
   DISTANCIA ENTRE DOS PUNTOS
========================================================= */

/*
 * Calcula la distancia entre dos coordenadas
 * utilizando la fórmula de Haversine.
 *
 * Resultado en metros.
 */

function calcularDistancia(
    lat1,
    lng1,
    lat2,
    lng2
) {

    const radioTierra =
        6371000;


    const diferenciaLat =
        (lat2 - lat1) *
        Math.PI /
        180;


    const diferenciaLng =
        (lng2 - lng1) *
        Math.PI /
        180;


    const a =

        Math.sin(
            diferenciaLat / 2
        ) *
        Math.sin(
            diferenciaLat / 2
        )

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

        Math.sin(
            diferenciaLng / 2
        )

        *

        Math.sin(
            diferenciaLng / 2
        );


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
   FORMATEAR DISTANCIA
========================================================= */

function formatearDistancia(
    metros
) {

    if (
        metros < 1000
    ) {

        return (
            Math.round(metros) +
            " m"
        );

    }


    return (
        (metros / 1000)
            .toFixed(1)
            .replace(".", ",") +
        " km"
    );

}


/* =========================================================
   BUSCAR COLEGIO MÁS CERCANO
========================================================= */

function buscarColegioMasCercano() {

    /*
     * Si no tenemos ubicación,
     * primero la solicitamos.
     */

    if (!ubicacionUsuario) {

        obtenerUbicacion(
            buscarColegioMasCercano
        );

        return;

    }


    /*
     * Buscar solamente establecimientos
     * que tengan coordenadas válidas.
     */

    const colegiosConCoordenadas =
        colegios.filter(
            colegio =>

                Number.isFinite(
                    colegio.lat
                )

                &&

                Number.isFinite(
                    colegio.lng
                )
        );


    if (
        colegiosConCoordenadas.length === 0
    ) {

        alert(
            "No hay establecimientos con coordenadas disponibles."
        );

        return;

    }


    let colegioMasCercano =
        null;


    let distanciaMinima =
        Infinity;


    colegiosConCoordenadas.forEach(
        colegio => {

            const distancia =
                calcularDistancia(

                    ubicacionUsuario.lat,

                    ubicacionUsuario.lng,

                    colegio.lat,

                    colegio.lng

                );


            if (
                distancia <
                distanciaMinima
            ) {

                distanciaMinima =
                    distancia;

                colegioMasCercano =
                    colegio;

            }

        }
    );


    /*
     * Mostrar resultado en consola
     */

    console.log(
        "Colegio más cercano:",
        colegioMasCercano.nombre
    );


    console.log(
        "Distancia:",
        distanciaMinima,
        "metros"
    );


    /*
     * Centrar y seleccionar
     */

    seleccionarColegio(
        colegioMasCercano
    );


    /*
     * Mostrar un aviso breve.
     */

    setTimeout(
        function() {

            alert(
                `El establecimiento más cercano es:\n\n${colegioMasCercano.nombre}\n\nDistancia aproximada: ${formatearDistancia(distanciaMinima)}`
            );

        },
        250
    );

}


/* =========================================================
   BOTÓN "MI UBICACIÓN"
========================================================= */

if (btnMiUbicacion) {

    btnMiUbicacion.addEventListener(
        "click",
        function() {

            obtenerUbicacion();

        }
    );

}


/* =========================================================
   BOTÓN "COLEGIO MÁS CERCANO"
========================================================= */

if (btnColegioCercano) {

    btnColegioCercano.addEventListener(
        "click",
        function() {

            buscarColegioMasCercano();

        }
    );

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

if (buscador) {

    buscador.addEventListener(
        "input",
        aplicarFiltros
    );

}


if (filtroLocalidad) {

    filtroLocalidad.addEventListener(
        "change",
        aplicarFiltros
    );

}


if (filtroDependencia) {

    filtroDependencia.addEventListener(
        "change",
        aplicarFiltros
    );

}


if (filtroNivel) {

    filtroNivel.addEventListener(
        "change",
        aplicarFiltros
    );

}


/* =========================================================
   LIMPIAR FILTROS
========================================================= */

if (limpiarFiltros) {

    limpiarFiltros.addEventListener(
        "click",
        function () {

            buscador.value =
                "";

            filtroLocalidad.value =
                "";

            filtroDependencia.value =
                "";

            filtroNivel.value =
                "";

            aplicarFiltros();

        }
    );

}


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

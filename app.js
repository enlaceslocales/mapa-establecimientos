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
   CONFIGURACIÓN DE RUTAS
========================================================= */

/*
 * OSRM permite calcular rutas utilizando la red vial.
 *
 * Esto permite que "Colegio más cercano" considere
 * la distancia por carretera/camino y no solamente
 * la distancia en línea recta.
 */

const URL_OSRM =
    "https://router.project-osrm.org";


/*
 * Cantidad de candidatos que serán evaluados
 * mediante la red vial.
 *
 * Mientras mayor sea este número:
 * - mayor precisión
 * - más consultas
 *
 * 8 es un buen equilibrio para esta aplicación.
 */

const CANTIDAD_CANDIDATOS_RUTA = 8;


/* =========================================================
   DATOS
========================================================= */

let colegios = [];

let colegiosVisibles = [];


/* =========================================================
   UBICACIÓN DEL USUARIO
========================================================= */

let miUbicacion = null;

let marcadorMiUbicacion = null;

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

const btnMiUbicacion =
    document.getElementById("btnMiUbicacion");

const btnColegioCercano =
    document.getElementById("btnColegioCercano");


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
   DISTANCIA EN LÍNEA RECTA
   HAVERSINE
========================================================= */

function calcularDistanciaLineaRecta(
    lat1,
    lng1,
    lat2,
    lng2
) {

    const radioTierra =
        6371;


    const dLat =
        (lat2 - lat1) *
        Math.PI /
        180;


    const dLng =
        (lng2 - lng1) *
        Math.PI /
        180;


    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *

        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return radioTierra * c;

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
   CREAR URL "CÓMO LLEGAR"
========================================================= */

function obtenerUrlComoLlegar(colegio) {

    if (
        miUbicacion &&
        Number.isFinite(colegio.lat) &&
        Number.isFinite(colegio.lng)
    ) {

        return (
            "https://www.google.com/maps/dir/?api=1" +
            `&origin=${miUbicacion.lat},${miUbicacion.lng}` +
            `&destination=${colegio.lat},${colegio.lng}` +
            "&travelmode=driving"
        );

    }


    return obtenerUrlGoogleMaps(colegio);

}


/* =========================================================
   CARGAR DATOS DESDE GOOGLE SHEETS
========================================================= */

async function cargarDatos() {

    try {

        const respuesta =
            await fetch(
                URL_DATOS +
                "?v=" +
                Date.now()
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
                        obtenerDato(
                            colegio,
                            "ID"
                        ) !== ""
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


    listaColegios.innerHTML =
        "";


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
   ACTUALIZAR FICHA
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
   MOSTRAR FICHA
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


    /* =====================================================
       MOSTRAR FICHA
    ===================================================== */

    if (ficha) {

        ficha.classList.add(
            "visible"
        );

    }

}


/* =========================================================
   DESTACAR TARJETA
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
                Number(
                    tarjeta.dataset.id
                ) === Number(id)
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
   EXPORTAR A EXCEL
========================================================= */

function exportarEstablecimientosExcel() {

    if (
        typeof XLSX ===
        "undefined"
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

function obtenerMiUbicacion() {

    if (
        !navigator.geolocation
    ) {

        alert(
            "Este dispositivo o navegador no permite obtener la ubicación."
        );

        return;

    }


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


            miUbicacion = {

                lat: lat,

                lng: lng,

                accuracy: precision

            };


            mostrarMiUbicacion();


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


            if (btnMiUbicacion) {

                btnMiUbicacion.disabled =
                    false;

                btnMiUbicacion.textContent =
                    "📍 Mi ubicación";

            }


            console.log(
                "Ubicación obtenida:",
                miUbicacion
            );

        },

        function(error) {

            console.error(
                "Error de geolocalización:",
                error
            );


            let mensaje =
                "No fue posible obtener tu ubicación.";


            if (
                error.code ===
                error.PERMISSION_DENIED
            ) {

                mensaje =
                    "El permiso de ubicación fue rechazado. Activa la ubicación para este sitio en la configuración del navegador.";

            }


            else if (
                error.code ===
                error.POSITION_UNAVAILABLE
            ) {

                mensaje =
                    "La ubicación no está disponible en este momento.";

            }


            else if (
                error.code ===
                error.TIMEOUT
            ) {

                mensaje =
                    "Se agotó el tiempo para obtener tu ubicación.";

            }


            alert(
                mensaje
            );


            if (btnMiUbicacion) {

                btnMiUbicacion.disabled =
                    false;

                btnMiUbicacion.textContent =
                    "📍 Mi ubicación";

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
   MOSTRAR UBICACIÓN EN EL MAPA
========================================================= */

function mostrarMiUbicacion() {

    if (!miUbicacion) {

        return;

    }


    if (marcadorMiUbicacion) {

        mapa.removeLayer(
            marcadorMiUbicacion
        );

    }


    if (circuloPrecision) {

        mapa.removeLayer(
            circuloPrecision
        );

    }


    marcadorMiUbicacion =
        L.circleMarker(
            [
                miUbicacion.lat,
                miUbicacion.lng
            ],
            {

                radius: 8,

                color: "#1769aa",

                fillColor: "#1769aa",

                fillOpacity: 0.9,

                weight: 3

            }
        );


    marcadorMiUbicacion
        .bindPopup(
            "📍 Tu ubicación actual"
        );


    marcadorMiUbicacion.addTo(
        mapa
    );


    if (
        Number.isFinite(
            miUbicacion.accuracy
        )
    ) {

        circuloPrecision =
            L.circle(
                [
                    miUbicacion.lat,
                    miUbicacion.lng
                ],
                {

                    radius:
                        miUbicacion.accuracy,

                    color: "#1769aa",

                    fillOpacity: 0.08,

                    weight: 1

                }
            );


        circuloPrecision.addTo(
            mapa
        );

    }

}


/* =========================================================
   CALCULAR DISTANCIAS POR CARRETERA
========================================================= */

/*
 * Utiliza el servicio Table de OSRM.
 *
 * La distancia devuelta corresponde a la red vial,
 * no a la distancia "en línea recta".
 *
 * OSRM documenta que Table calcula las distancias
 * y tiempos de las rutas más rápidas entre los puntos.
 */

async function calcularDistanciasPorCarretera(
    origen,
    candidatos
) {

    if (
        !origen ||
        candidatos.length === 0
    ) {

        return [];

    }


    /*
     * Construimos la lista de coordenadas.
     *
     * IMPORTANTE:
     * OSRM utiliza:
     *
     * longitud,latitud
     */

    const coordenadas = [

        `${origen.lng},${origen.lat}`,

        ...candidatos.map(
            colegio =>
                `${colegio.lng},${colegio.lat}`
        )

    ].join(";");


    /*
     * La primera coordenada es nuestro origen.
     *
     * Los destinos corresponden a los colegios.
     */

    const url =
        `${URL_OSRM}/table/v1/driving/${coordenadas}` +
        `?sources=0` +
        `&destinations=${candidatos.map(
            (_, indice) => indice + 1
        ).join(";")}` +
        `&annotations=distance,duration`;


    console.log(
        "Consultando distancias por carretera:",
        url
    );


    const respuesta =
        await fetch(
            url
        );


    if (!respuesta.ok) {

        throw new Error(
            "No fue posible consultar la red vial."
        );

    }


    const datos =
        await respuesta.json();


    if (
        datos.code !==
        "Ok"
    ) {

        throw new Error(
            "El servicio de rutas no pudo calcular las distancias."
        );

    }


    const distancias =
        datos.distances &&
        datos.distances[0]
            ? datos.distances[0]
            : [];


    const duraciones =
        datos.durations &&
        datos.durations[0]
            ? datos.durations[0]
            : [];


    return candidatos.map(
        (colegio, indice) => ({

            colegio: colegio,

            distanciaRuta:
                distancias[indice],

            duracionRuta:
                duraciones[indice]

        })
    );

}


/* =========================================================
   FORMATEAR DISTANCIA
========================================================= */

function formatearDistancia(
    metros
) {

    if (
        !Number.isFinite(metros)
    ) {

        return "Distancia no disponible";

    }


    if (
        metros < 1000
    ) {

        return `${Math.round(metros)} m`;

    }


    return (
        `${(metros / 1000).toFixed(1)} km`
    );

}


/* =========================================================
   FORMATEAR DURACIÓN
========================================================= */

function formatearDuracion(
    segundos
) {

    if (
        !Number.isFinite(segundos)
    ) {

        return "";

    }


    const minutos =
        Math.round(
            segundos / 60
        );


    if (
        minutos < 60
    ) {

        return `${minutos} min`;

    }


    const horas =
        Math.floor(
            minutos / 60
        );


    const minutosRestantes =
        minutos % 60;


    if (
        minutosRestantes === 0
    ) {

        return `${horas} h`;

    }


    return `${horas} h ${minutosRestantes} min`;

}


/* =========================================================
   COLEGIO MÁS CERCANO POR CARRETERA
========================================================= */

async function buscarColegioMasCercano() {

    /*
     * Si todavía no tenemos ubicación,
     * primero la solicitamos.
     */

    if (!miUbicacion) {

        if (btnColegioCercano) {

            btnColegioCercano.disabled =
                true;

            btnColegioCercano.textContent =
                "📍 Obteniendo ubicación...";

        }


        await obtenerMiUbicacionAsync();


        if (!miUbicacion) {

            if (btnColegioCercano) {

                btnColegioCercano.disabled =
                    false;

                btnColegioCercano.textContent =
                    "🏫 Colegio más cercano";

            }


            return;

        }

    }


    /*
     * Evitar múltiples consultas simultáneas.
     */

    if (btnColegioCercano) {

        btnColegioCercano.disabled =
            true;

        btnColegioCercano.textContent =
            "🛣️ Calculando ruta...";

    }


    try {

        /*
         * Primero calculamos una distancia aproximada
         * en línea recta para obtener candidatos.
         *
         * Esto NO decide cuál es el ganador.
         */

        const candidatosOrdenados =
            colegios

                .filter(
                    colegio =>

                        Number.isFinite(
                            colegio.lat
                        ) &&

                        Number.isFinite(
                            colegio.lng
                        )
                )

                .map(
                    colegio => ({

                        colegio:
                            colegio,

                        distanciaLinea:
                            calcularDistanciaLineaRecta(
                                miUbicacion.lat,
                                miUbicacion.lng,
                                colegio.lat,
                                colegio.lng
                            )

                    })
                )

                .sort(
                    (a, b) =>
                        a.distanciaLinea -
                        b.distanciaLinea
                );


        /*
         * Tomamos solamente los candidatos
         * más razonablemente cercanos.
         */

        const candidatos =
            candidatosOrdenados

                .slice(
                    0,
                    CANTIDAD_CANDIDATOS_RUTA
                )

                .map(
                    item =>
                        item.colegio
                );


        if (
            candidatos.length === 0
        ) {

            alert(
                "No existen establecimientos con coordenadas válidas."
            );

            return;

        }


        /*
         * Ahora sí calculamos la distancia real
         * siguiendo caminos/carreteras.
         */

        const resultadosRuta =
            await calcularDistanciasPorCarretera(
                miUbicacion,
                candidatos
            );


        /*
         * Eliminamos rutas que no pudieron calcularse.
         */

        const rutasValidas =
            resultadosRuta.filter(
                resultado =>
                    Number.isFinite(
                        resultado.distanciaRuta
                    )
            );


        if (
            rutasValidas.length === 0
        ) {

            throw new Error(
                "No se encontraron rutas disponibles."
            );

        }


        /*
         * ORDENAMOS POR DISTANCIA DE CARRETERA.
         *
         * AQUÍ está el cambio fundamental.
         */

        rutasValidas.sort(
            (a, b) =>
                a.distanciaRuta -
                b.distanciaRuta
        );


        const resultadoGanador =
            rutasValidas[0];


        const colegioMasCercano =
            resultadoGanador.colegio;


        /*
         * Guardamos temporalmente la información
         * de ruta para utilizarla en la ficha.
         */

        colegioMasCercano.distanciaRuta =
            resultadoGanador.distanciaRuta;


        colegioMasCercano.duracionRuta =
            resultadoGanador.duracionRuta;


        /*
         * Mostrar resultado en consola.
         */

        console.log(
            "Colegio más cercano por carretera:",
            colegioMasCercano.nombre
        );


        console.log(
            "Distancia por carretera:",
            formatearDistancia(
                resultadoGanador.distanciaRuta
            )
        );


        console.log(
            "Duración estimada:",
            formatearDuracion(
                resultadoGanador.duracionRuta
            )
        );


        /*
         * Centrar mapa en el colegio.
         */

        if (
            Number.isFinite(
                colegioMasCercano.lat
            ) &&
            Number.isFinite(
                colegioMasCercano.lng
            )
        ) {

            mapa.fitBounds(
                [
                    [
                        miUbicacion.lat,
                        miUbicacion.lng
                    ],

                    [
                        colegioMasCercano.lat,
                        colegioMasCercano.lng
                    ]
                ],
                {

                    padding:
                        [50, 50],

                    maxZoom:
                        15

                }
            );

        }


        /*
         * Mostrar ficha.
         */

        mostrarFichaColegio(
            colegioMasCercano
        );


        /*
         * Destacar tarjeta.
         */

        seleccionarColegioVisualmente(
            colegioMasCercano.id
        );


        /*
         * Mostrar popup.
         */

        if (
            marcadores[
                colegioMasCercano.id
            ]
        ) {

            marcadores[
                colegioMasCercano.id
            ].openPopup();

        }


        /*
         * Aviso informativo.
         */

        const distanciaTexto =
            formatearDistancia(
                resultadoGanador.distanciaRuta
            );


        const duracionTexto =
            formatearDuracion(
                resultadoGanador.duracionRuta
            );


        console.log(
            `Resultado: ${colegioMasCercano.nombre} - ${distanciaTexto} - ${duracionTexto}`
        );


    } catch (error) {

        console.error(
            "Error calculando colegio más cercano:",
            error
        );


        alert(
            "No fue posible calcular la distancia por carretera. Revisa tu conexión a Internet e inténtalo nuevamente."
        );

    } finally {

        if (btnColegioCercano) {

            btnColegioCercano.disabled =
                false;

            btnColegioCercano.textContent =
                "🏫 Colegio más cercano";

        }

    }

}


/* =========================================================
   VERSIÓN PROMESA DE GEOLOCALIZACIÓN
========================================================= */

function obtenerMiUbicacionAsync() {

    return new Promise(
        function(resolve) {

            if (
                !navigator.geolocation
            ) {

                alert(
                    "Este dispositivo o navegador no permite obtener la ubicación."
                );

                resolve(
                    null
                );

                return;

            }


            navigator.geolocation.getCurrentPosition(

                function(posicion) {

                    miUbicacion = {

                        lat:
                            posicion.coords.latitude,

                        lng:
                            posicion.coords.longitude,

                        accuracy:
                            posicion.coords.accuracy

                    };


                    mostrarMiUbicacion();


                    console.log(
                        "Ubicación obtenida:",
                        miUbicacion
                    );


                    resolve(
                        miUbicacion
                    );

                },

                function(error) {

                    console.error(
                        "Error de geolocalización:",
                        error
                    );


                    let mensaje =
                        "No fue posible obtener tu ubicación.";


                    if (
                        error.code ===
                        error.PERMISSION_DENIED
                    ) {

                        mensaje =
                            "El permiso de ubicación fue rechazado. Activa la ubicación para este sitio en la configuración del navegador.";

                    }


                    else if (
                        error.code ===
                        error.POSITION_UNAVAILABLE
                    ) {

                        mensaje =
                            "La ubicación no está disponible.";

                    }


                    else if (
                        error.code ===
                        error.TIMEOUT
                    ) {

                        mensaje =
                            "Se agotó el tiempo para obtener tu ubicación.";

                    }


                    alert(
                        mensaje
                    );


                    resolve(
                        null
                    );

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
        function() {

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
        function() {

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
   EVENTO MI UBICACIÓN
========================================================= */

if (btnMiUbicacion) {

    btnMiUbicacion.addEventListener(
        "click",
        obtenerMiUbicacion
    );

}


/* =========================================================
   EVENTO COLEGIO MÁS CERCANO
========================================================= */

if (btnColegioCercano) {

    btnColegioCercano.addEventListener(
        "click",
        buscarColegioMasCercano
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

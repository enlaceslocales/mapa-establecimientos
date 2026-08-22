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

let ubicacionUsuario = null;

let marcadorUsuario = null;

let circuloUsuario = null;


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
   NORMALIZAR NOMBRES DE COLUMNAS
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
   URL GOOGLE MAPS
========================================================= */

function obtenerUrlGoogleMaps(colegio) {

    const consulta =
        `${colegio.nombre}, ${colegio.direccion}, ${colegio.localidad}, ${colegio.comuna}, Chile`;

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;

}


/* =========================================================
   URL CÓMO LLEGAR
========================================================= */

function obtenerUrlComoLlegar(colegio) {

    /*
     * Si tenemos la ubicación del usuario,
     * Google Maps utilizará esa ubicación
     * como punto de origen.
     */

    if (
        ubicacionUsuario &&
        Number.isFinite(ubicacionUsuario.lat) &&
        Number.isFinite(ubicacionUsuario.lng)
    ) {

        const origen =
            `${ubicacionUsuario.lat},${ubicacionUsuario.lng}`;


        /*
         * Preferimos coordenadas del establecimiento
         * cuando están disponibles.
         */

        if (
            Number.isFinite(colegio.lat) &&
            Number.isFinite(colegio.lng)
        ) {

            const destino =
                `${colegio.lat},${colegio.lng}`;


            return (
                "https://www.google.com/maps/dir/?api=1" +
                `&origin=${encodeURIComponent(origen)}` +
                `&destination=${encodeURIComponent(destino)}` +
                "&travelmode=driving"
            );

        }

    }


    /*
     * Si todavía no tenemos ubicación del usuario,
     * dejamos que Google Maps determine el origen.
     */

    const destino =
        `${colegio.nombre}, ${colegio.direccion}, ${colegio.localidad}, ${colegio.comuna}, Chile`;


    return (
        "https://www.google.com/maps/dir/?api=1" +
        `&destination=${encodeURIComponent(destino)}` +
        "&travelmode=driving"
    );

}


/* =========================================================
   CARGAR DATOS
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


    marcador.bindTooltip(
        colegio.nombre,
        {
            direction: "top"
        }
    );


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
   CREAR TARJETA
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
            ].openTooltip();

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


    /* ---------------------------------------------------------
       GOOGLE MAPS
    --------------------------------------------------------- */

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


    /* ---------------------------------------------------------
       CÓMO LLEGAR
    --------------------------------------------------------- */

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


    /* ---------------------------------------------------------
       MOSTRAR FICHA
    --------------------------------------------------------- */

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
   FILTRO LOCALIDADES
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
   FILTRO DEPENDENCIAS
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
   FILTRO NIVELES
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
   DISTANCIA ENTRE DOS COORDENADAS
   FÓRMULA HAVERSINE
========================================================= */

function calcularDistancia(
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
        Math.sin(dLat / 2)

        +

        Math.cos(
            lat1 * Math.PI / 180
        ) *

        Math.cos(
            lat2 * Math.PI / 180
        ) *

        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);


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
   OBTENER UBICACIÓN DEL USUARIO
========================================================= */

function obtenerMiUbicacion(
    centrarMapa = true,
    callback = null
) {

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

        function(position) {

            const lat =
                position.coords.latitude;


            const lng =
                position.coords.longitude;


            ubicacionUsuario = {

                lat: lat,

                lng: lng

            };


            console.log(
                "Ubicación del usuario:",
                ubicacionUsuario
            );


            actualizarMarcadorUsuario();


            if (centrarMapa) {

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

            }


            if (btnMiUbicacion) {

                btnMiUbicacion.disabled =
                    false;

                btnMiUbicacion.textContent =
                    "📍 Mi ubicación";

            }


            /*
             * Si existe un callback,
             * lo ejecutamos después de obtener
             * correctamente la ubicación.
             */

            if (
                typeof callback ===
                "function"
            ) {

                callback();

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


            let mensaje =
                "No fue posible obtener tu ubicación.";


            if (
                error.code ===
                error.PERMISSION_DENIED
            ) {

                mensaje =
                    "El acceso a la ubicación fue rechazado. Revisa los permisos de ubicación de tu navegador.";

            }


            else if (
                error.code ===
                error.POSITION_UNAVAILABLE
            ) {

                mensaje =
                    "No fue posible determinar tu ubicación.";

            }


            else if (
                error.code ===
                error.TIMEOUT
            ) {

                mensaje =
                    "La solicitud de ubicación tardó demasiado.";

            }


            alert(
                mensaje
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


/* =========================================================
   MARCADOR DE UBICACIÓN DEL USUARIO
========================================================= */

function actualizarMarcadorUsuario() {

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
     * simplemente actualizamos su posición.
     */

    if (
        marcadorUsuario
    ) {

        marcadorUsuario.setLatLng(
            posicion
        );

    }

    else {

        marcadorUsuario =
            L.circleMarker(
                posicion,
                {

                    radius: 8,

                    weight: 3,

                    fillOpacity: 1

                }
            )
            .addTo(mapa);


        marcadorUsuario.bindPopup(
            "📍 Tu ubicación"
        );

    }


    /*
     * Círculo de precisión aproximada.
     */

    if (
        circuloUsuario
    ) {

        circuloUsuario.setLatLng(
            posicion
        );

    }

    else {

        circuloUsuario =
            L.circle(
                posicion,
                {

                    radius: 50,

                    weight: 1,

                    fillOpacity: 0.08

                }
            )
            .addTo(mapa);

    }

}


/* =========================================================
   COLEGIO MÁS CERCANO
========================================================= */

function buscarColegioMasCercano() {

    /*
     * Si todavía no tenemos ubicación,
     * primero la solicitamos.
     */

    if (
        !ubicacionUsuario
    ) {

        obtenerMiUbicacion(
            true,
            function() {

                buscarColegioMasCercano();

            }
        );

        return;

    }


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
            "No existen establecimientos con coordenadas disponibles."
        );

        return;

    }


    let colegioCercano =
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

                colegioCercano =
                    colegio;

            }

        }
    );


    if (
        colegioCercano
    ) {

        seleccionarColegio(
            colegioCercano
        );


        /*
         * Mostramos una pequeña referencia
         * de la distancia.
         */

        const distancia =
            calcularDistancia(

                ubicacionUsuario.lat,

                ubicacionUsuario.lng,

                colegioCercano.lat,

                colegioCercano.lng

            );


        console.log(
            `Colegio más cercano: ${colegioCercano.nombre} (${distancia.toFixed(2)} km)`
        );

    }

}


/* =========================================================
   EVENTO MI UBICACIÓN
========================================================= */

if (
    btnMiUbicacion
) {

    btnMiUbicacion.addEventListener(
        "click",
        function() {

            obtenerMiUbicacion(
                true
            );

        }
    );

}


/* =========================================================
   EVENTO COLEGIO MÁS CERCANO
========================================================= */

if (
    btnColegioCercano
) {

    btnColegioCercano.addEventListener(
        "click",
        function() {

            buscarColegioMasCercano();

        }
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


    /*
     * IMPORTANTE:
     * LATITUD y LONGITUD NO se exportan.
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
   CERRAR FICHA
========================================================= */

const cerrarFicha =
    document.getElementById(
        "cerrarFicha"
    );


if (
    cerrarFicha
) {

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


/* =========================================================
   EXPORTAR EXCEL
========================================================= */

if (
    exportarExcel
) {

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

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


/* =========================================================
   MARCADORES
========================================================= */

const marcadores = {};


/* =========================================================
   CREAR URL DE GOOGLE MAPS
========================================================= */

function obtenerUrlGoogleMaps(colegio) {

    const consulta =
        `${colegio.nombre}, ${colegio.direccion}, ${colegio.localidad}, ${colegio.comuna}, Chile`;

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}


/* =========================================================
   CARGAR DATOS DESDE GOOGLE SHEETS
========================================================= */
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


    /*
     * Convierte el valor a texto
     */

    let coordenada =
        String(valor).trim();


    /*
     * Reemplaza coma decimal por punto
     *
     * Ejemplo:
     * -38,9456 → -38.9456
     */

    coordenada =
        coordenada.replace(",", ".");


    /*
     * Convierte a número
     */

    const numero =
        Number(coordenada);


    /*
     * Verifica que realmente sea
     * un número válido.
     */

    if (
        !Number.isFinite(numero)
    ) {

        return null;

    }


    return numero;
}

async function cargarDatos() {

    try {

        const respuesta =
            await fetch(URL_DATOS);


        if (!respuesta.ok) {

            throw new Error(
                "No fue posible obtener los datos."
            );

        }


        const datos =
            await respuesta.json();


        colegios =
            datos
                .filter(colegio => colegio.ID !== "")
                .map(colegio => ({

                    id:
                        Number(colegio.ID),

                    nombre:
                        colegio.NOMBRE || "",

                    rbd:
                        String(colegio.RBD || ""),

                    direccion:
                        colegio["DIRECCIÓN"] || "",

                    localidad:
                        colegio.LOCALIDAD || "",

                    comuna:
                        colegio.COMUNA || "",

                    dependencia:
                        colegio.DEPENDENCIA || "",

                    nivel:
                        colegio.NIVEL || "",

                    director:
                        colegio.DIRECTOR || "",

                    correo:
                        colegio.CORREO || "",

                    telefono:
                        colegio["TELÉFONO"] || "",

                    convivencia:
                        colegio["CONVIVENCIA ESCOLAR"] || "",

                    telefonoConvivencia:
                        colegio["TELEFONO CONVIVENCIA"] || "",

                lat:
    convertirCoordenada(colegio.LATITUD),

lng:
    convertirCoordenada(colegio.LONGITUD)
                }));


        console.log(
            "Colegios cargados:",
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

    const marcador = L.marker([
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

            /*
             * Si el colegio ya tiene marcador,
             * lo reutilizamos.
             */

            const marcador =
                marcadores[colegio.id] ||
                crearMarcador(colegio);


            /*
             * Solamente agregamos colegios
             * que tengan coordenadas válidas.
             */

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


    cargarMarcadores(lista);
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
        "Latitud:",
        colegio.lat
    );

    console.log(
        "Longitud:",
        colegio.lng
    );


    /*
     * Verificar coordenadas
     */

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


        /*
         * Abrir el popup del marcador
         */

        if (
            marcadores[colegio.id]
        ) {

            marcadores[
                colegio.id
            ].openPopup();

        }

    } else {

        console.warn(
            "El establecimiento no tiene coordenadas válidas:",
            colegio
        );

    }


    /*
     * Mostrar ficha
     */

    mostrarFichaColegio(
        colegio
    );


    /*
     * Destacar establecimiento
     */

    seleccionarColegioVisualmente(
        colegio.id
    );

}


/* =========================================================
   MOSTRAR FICHA DEL ESTABLECIMIENTO
========================================================= */

function mostrarFichaColegio(colegio) {

    const ficha =
        document.getElementById(
            "fichaColegio"
        );


    /*
     * Nombre
     */

    document.getElementById(
        "fichaNombre"
    ).textContent =
        colegio.nombre;


    /*
     * RBD
     */

    document.getElementById(
        "fichaRbd"
    ).textContent =
        `RBD ${colegio.rbd}`;


    /*
     * Dirección
     */

    document.getElementById(
        "fichaDireccion"
    ).textContent =
        colegio.direccion || "No informado";


    /*
     * Localidad
     */

    document.getElementById(
        "fichaLocalidad"
    ).textContent =
        colegio.localidad || "No informado";


    /*
     * Comuna
     */

    document.getElementById(
        "fichaComuna"
    ).textContent =
        colegio.comuna || "No informado";


    /*
     * Dependencia
     */

    document.getElementById(
        "fichaDependencia"
    ).textContent =
        colegio.dependencia || "No informado";


    /*
     * Nivel
     */

    document.getElementById(
        "fichaNivel"
    ).textContent =
        colegio.nivel || "No informado";


    /*
     * Director/a
     */

    document.getElementById(
        "fichaDirector"
    ).textContent =
        colegio.director || "No informado";


    /*
     * Correo
     */

    document.getElementById(
        "fichaCorreo"
    ).textContent =
        colegio.correo || "No informado";


    /*
     * Teléfono
     */

    document.getElementById(
        "fichaTelefono"
    ).textContent =
        colegio.telefono || "No informado";


    /*
     * Convivencia Escolar
     */

    document.getElementById(
        "fichaConvivencia"
    ).textContent =
        colegio.convivencia || "No informado";


    /*
     * Teléfono Convivencia
     */

    document.getElementById(
        "fichaTelefonoConvivencia"
    ).textContent =
        colegio.telefonoConvivencia || "No informado";


    /*
     * Google Maps
     */

    document.getElementById(
        "fichaGoogleMaps"
    ).href =
        obtenerUrlGoogleMaps(
            colegio
        );


    /*
     * Mostrar ficha
     */

    ficha.classList.add(
        "visible"
    );

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

                /*
                 * Buscador general
                 */

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


                /*
                 * Localidad
                 */

                const coincideLocalidad =
                    !localidad ||
                    colegio.localidad ===
                    localidad;


                /*
                 * Dependencia
                 */

                const coincideDependencia =
                    !dependencia ||
                    colegio.dependencia ===
                    dependencia;


                /*
                 * Nivel
                 */

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


            ficha.classList.remove(
                "visible"
            );


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
   CARGAR INFORMACIÓN DESDE GOOGLE SHEETS
========================================================= */

cargarDatos();
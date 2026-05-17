/* =========================================
   Optimización & Helpers
   ========================================= */
const $ = (id) => document.getElementById(id);

// Limpiador y formateador de precios (Para poder hacer matemáticas con "$15,299.00")
const parsePrice = (str) => parseFloat(str.replace(/[^0-9.-]+/g, ""));
const formatPrice = (num) =>
  "$" +
  num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Función para eliminar acentos y diacríticos
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/* =========================================
   Accesibilidad: Anunciador ARIA
   ========================================= */
const announce = (message) => {
  const announcer = $("aria-announcer");
  if (announcer) {
    announcer.textContent = ""; // Limpiar mensaje anterior
    setTimeout(() => {
      announcer.textContent = message;
    }, 100); // Pequeño delay para forzar al lector a detectar el cambio
  }
};

/* =========================================
   Base de Datos Mock
   ========================================= */
const categorias = [
  {
    titulo: "Electrónica y Gaming",
    productos: [
      { id: 1, nombre: "Laptop Gamer 15.6'' 16GB RAM", precio: "$15,299.00" },
      {
        id: 2,
        nombre: "Consola de Videojuegos 1TB Blanco",
        precio: "$8,499.00",
      },
      { id: 3, nombre: "Audífonos Inalámbricos Over-Ear", precio: "$1,299.00" },
      {
        id: 4,
        nombre: "Smart TV 55 Pulgadas 4K Ultra HD",
        precio: "$6,999.00",
      },
      { id: 5, nombre: "Monitor Curvo 27'' 144Hz", precio: "$4,500.00" },
    ],
  },
  {
    titulo: "Hogar y Electrodomésticos",
    productos: [
      { id: 6, nombre: "Refrigerador 14 Pies Cúbicos", precio: "$8,990.00" },
      { id: 7, nombre: "Horno de Microondas Acero Inox", precio: "$1,599.00" },
      { id: 8, nombre: "Licuadora 10 Velocidades", precio: "$850.00" },
      { id: 9, nombre: "Silla de Oficina Ergonómica", precio: "$1,850.00" },
      {
        id: 10,
        nombre: "Colchón Matrimonial Memory Foam",
        precio: "$3,200.00",
      },
    ],
  },
  {
    titulo: "Despensa Básica",
    productos: [
      { id: 11, nombre: "Aceite Nutrioli 946 ml", precio: "$45.00" },
      { id: 12, nombre: "Arroz Súper Extra 1 Kg", precio: "$22.50" },
      { id: 13, nombre: "Leche Entera 1 Litro", precio: "$26.00" },
      { id: 14, nombre: "Cereal Zucaritas 700g", precio: "$65.00" },
      {
        id: 15,
        nombre: "Café Soluble Nescafé Clásico 225g",
        precio: "$110.00",
      },
    ],
  },
];

let carrito = [];
let favoritos = [];
let productoActual = null;
let ubicacionUsuario = ""; // Variable global para la ubicación

/* =========================================
   Gestión de Ubicación
   ========================================= */
function saveLocation() {
  const input = $("inputLocation").value.trim();
  if (input) {
    ubicacionUsuario = input;
    const locText = $("locationText");
    if (locText) locText.textContent = `📍 ${ubicacionUsuario}`;
    closeModals();
    announce(`Ubicación actualizada a: ${ubicacionUsuario}`);
  }
}

/* =========================================
   Interacciones de Checkout Mejoradas
   ========================================= */
function togglePaymentFields() {
  const method = $("paymentMethod").value;
  const cardFields = $("cardFields");
  const tiendaFields = $("tiendaFields");

  if (method === "tienda") {
    cardFields.classList.add("hidden");
    tiendaFields.classList.remove("hidden");
  } else {
    cardFields.classList.remove("hidden");
    tiendaFields.classList.add("hidden");
  }
}

function toggleNewAddress(forceShowForm = false) {
  const display = $("savedAddressDisplay");
  const form = $("newAddressForm");

  if (ubicacionUsuario && !forceShowForm) {
    display.classList.remove("hidden");
    form.classList.add("hidden");
    $("displayShippingAddress").textContent = ubicacionUsuario;
  } else {
    display.classList.add("hidden");
    form.classList.remove("hidden");
  }
}

function abrirCheckout() {
  let total = 0;
  let resumenHTML = '<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem;">';

  carrito.forEach((item) => {
    total += parsePrice(item.precio);
    resumenHTML += `
            <li style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; border-bottom: 1px dashed var(--text-light); padding-bottom: 0.3rem;">
                <span style="flex: 1; padding-right: 1rem;">${item.nombre}</span>
                <strong>${item.precio}</strong>
            </li>`;
  });
  resumenHTML += "</ul>";
  resumenHTML += `<div style="text-align: right; font-size: 1.1rem; color: var(--text-blue); margin-top: 0.5rem;"><strong>Total: ${formatPrice(total)}</strong></div>`;

  $("checkoutSummary").innerHTML = resumenHTML;
  
  // Configurar sección de dirección
  toggleNewAddress();
  
  // Resetear campos de pago
  $("paymentMethod").value = "visa";
  togglePaymentFields();
  
  openModal("checkoutModal");
}

function finalizarCompra() {
  const method = $("paymentMethod").value;
  const address = $("checkoutNewAddress").value || ubicacionUsuario;
  let errores = [];

  // 1. Validación de Dirección
  if (!address.trim()) {
    errores.push("- Debes ingresar una dirección de envío.");
  }

  // 2. Validación de Métodos de Pago (Tarjeta/PayPal)
  if (method !== "tienda") {
    const card = $("cardNumber").value.trim();
    const expiry = $("cardExpiry").value.trim();
    const cvv = $("cardCVV").value.trim();

    // Validación específica del Número de Tarjeta
    if (!card) {
      errores.push("- El número de tarjeta es obligatorio.");
    } else if (card.length < 15 || card.length > 16) {
      errores.push("- El número de tarjeta debe tener 15 o 16 dígitos.");
    }

    // Validación específica de la Expiración
    if (!expiry) {
      errores.push("- La fecha de expiración es obligatoria.");
    } else if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      errores.push("- El formato de expiración debe ser MM/AA (ej: 12/26).");
    }

    // Validación específica del CVV
    if (!cvv) {
      errores.push("- El código CVV es obligatorio.");
    } else if (cvv.length !== 3) {
      errores.push("- El CVV debe tener exactamente 3 dígitos.");
    }
  }

  // Si hay errores, mostrarlos todos juntos
  if (errores.length > 0) {
    alert("Por favor corrige los siguientes errores:\n\n" + errores.join("\n"));
    return;
  }

  alert("¡Compra realizada con éxito! Gracias por elegir Walmart.");
  
  // Limpiar carrito y cerrar
  carrito = [];
  $("cartCount").textContent = `Carrito (0)`;
  renderCart();
  closeModals();
  navigate("home");
}

/* =========================================
   Generador de Tarjetas Reutilizable
   ========================================= */
function generarTarjeta(prod) {
  const safeName = prod.nombre.replace(/'/g, "\\'");
  const isFav = favoritos.some((f) => f.id === prod.id);

  return `
        <article class="product-card">
            <button class="btn-fav" onclick="toggleFav(${prod.id}, '${safeName}', '${prod.precio}', event)" title="Agregar a favoritos" style="background-color: ${isFav ? "var(--primary-blue)" : "var(--accent-yellow)"}">
                <i class="${isFav ? "fa-solid" : "fa-regular"} fa-heart" style="color: white; font-size: 1.2rem;"></i>
            </button>

            <button type="button" class="image-placeholder" onclick="openProduct(${prod.id}, '${safeName}', '${prod.precio}')">
                <span>Img [${prod.id}]</span>
            </button>

            <div class="card-actions">
                <button class="btn-buy-icon" onclick="comprarRapido(${prod.id}, '${safeName}', '${prod.precio}')" title="Comprar ahora">
                    <i class="fa-solid fa-money-bill" style="color: white; font-size: 1.3rem;"></i>
                </button>

                <button class="btn-add-icon" onclick="addToCart(${prod.id}, '${safeName}', '${prod.precio}', event)" title="Agregar al carrito">
                    <i class="fa-solid fa-cart-plus" style="color: white; font-size: 1.3rem;"></i>
                </button>
            </div>

            <button type="button" class="card-content" onclick="openProduct(${prod.id}, '${safeName}', '${prod.precio}')">
                <div class="product-price">${prod.precio}</div>
                <div class="product-title">${prod.nombre}</div>
                <div class="product-brand">Marca Genérica</div>
                <div class="product-desc">Descripción simulada del artículo para coincidir con la referencia visual.</div>
            </button>
        </article>
    `;
}

/* =========================================
   Renderizado Inicial
   ========================================= */
function initApp() {
  renderSections();
  setupSidebar();
  setupCategoriasRapidas();
  iniciarCarrusel();
  setupSearch();

  const addCartBtn = $("detail-add-cart");
  if (addCartBtn) {
    addCartBtn.onclick = function (e) {
        if (productoActual)
          addToCart(
            productoActual.id,
            productoActual.nombre,
            productoActual.precio,
            e,
          );
    };
  }
}

const videosTendencia = [
  { id: 1, titulo: "MrBeast en Walmart", descripcion: "Go! x3" },
  { id: 2, titulo: "Walmart USA Tour", descripcion: "¿Qué venden en Walmart USA?" },
  { id: 3, titulo: "Mascota Bodega Aurrera", descripcion: "Súper Días de Ahorro" }
];

function renderVideoSection() {
  return `
    <section class="video-section">
      <h2 class="section-title">Tendencia</h2>
      <div class="video-grid">
        ${videosTendencia.map(v => `
          <button class="video-card" onclick="alert('Reproduciendo: ${v.titulo}')" aria-label="Reproducir video: ${v.titulo}">
            <div class="video-play-icon"><i class="fa-solid fa-play"></i></div>
            <div class="video-overlay">
              <h4>${v.titulo}</h4>
              <p style="font-size: 0.8rem; opacity: 0.9;">${v.descripcion}</p>
            </div>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSections() {
  const container = $("sections-container");
  if (!container) return;
  
  // Mapeo de títulos de base de datos a títulos de marketing para la Home
  const titulosMarketing = {
    "Electrónica y Gaming": "Descuentazos",
    "Hogar y Electrodomésticos": "Te puede interesar",
    "Despensa Básica": "Supermercado"
  };

  let html = "";
  categorias.forEach((cat, index) => {
    const tituloDisplay = titulosMarketing[cat.titulo] || cat.titulo;
    
    html += `
        <section>
            <h2 class="section-title">${tituloDisplay}</h2>
            <div class="product-grid">${cat.productos.map((p) => generarTarjeta(p)).join("")}</div>
        </section>
    `;

    // Inyectar sección de videos después de la primera categoría (Descuentazos)
    if (index === 0) {
      html += '<hr class="section-divider">';
      html += renderVideoSection();
      html += '<hr class="section-divider">';
    } else if (index < categorias.length - 1) {
      html += '<hr class="section-divider">';
    }
  });
  
  container.innerHTML = html;
}

function setupCategoriasRapidas() {
  const nombres = [
    "Ahorro",
    "Flash Deals",
    "Nuestras Marcas",
    "Walmart Pass",
    "Súper",
    "Prichos",
    "Goleada",
    "Express",
  ];
  const container = $("quickCategories");
  if (!container) return;
  container.innerHTML = nombres
    .map(
      (n, i) => `
        <button type="button" class="cat-item" onclick="abrirCategoria('${n}')">
            <div class="cat-img">Img ${i + 1}</div>
            <span style="font-weight: bold; font-size: 0.9rem; color: var(--text-blue);">${n}</span>
        </button>
    `,
    )
    .join("");
}

/* =========================================
   Búsqueda & Sugerencias
   ========================================= */
function setupSearch() {
  const input = $("searchInput");
  const suggestions = $("searchSuggestions");
  const btn = $("searchBtn");

  if (!input || !suggestions || !btn) return;

  input.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length < 2) {
      suggestions.classList.add("hidden");
      return;
    }

    const cleanQuery = removeAccents(query);

    const allProducts = categorias.flatMap((c) =>
      c.productos.map((p) => ({ ...p, cat: c.titulo })),
    );
    const matches = allProducts
      .filter((p) => removeAccents(p.nombre.toLowerCase()).includes(cleanQuery))
      .slice(0, 6);

    if (matches.length > 0) {
      suggestions.innerHTML = matches
        .map(
          (m) => `
        <div class="suggestion-item" onclick="openProduct(${m.id}, '${m.nombre.replace(/'/g, "\\'")}', '${m.precio}'); $('searchSuggestions').classList.add('hidden');">
          <span class="prod-name">${m.nombre}</span>
          <span class="prod-cat">${m.cat}</span>
        </div>
      `,
        )
        .join("");
      suggestions.classList.remove("hidden");
    } else {
      suggestions.classList.add("hidden");
    }
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.add("hidden");
    }
  });

  btn.addEventListener("click", () => {
    const query = input.value.trim();
    if (query) {
      abrirResultadosBusqueda(query);
      suggestions.classList.add("hidden");
    }
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      btn.click();
    }
  });
}

function abrirResultadosBusqueda(query) {
  const title = $("category-title");
  const grid = $("category-grid");
  if (!title || !grid) return;

  title.textContent = `Resultados para: "${query}"`;
  const cleanQuery = removeAccents(query.toLowerCase());
  const allProducts = categorias.flatMap((c) => c.productos);
  const matches = allProducts.filter((p) =>
    removeAccents(p.nombre.toLowerCase()).includes(cleanQuery),
  );

  if (matches.length > 0) {
    grid.innerHTML = matches
      .map((p) => generarTarjeta(p))
      .join("");
  } else {
    grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 3rem; color: var(--text-light); margin-bottom: 1rem;"></i>
            <p style="font-size: 1.2rem; color: var(--text-dark);">No encontramos resultados para "${query}"</p>
            <button class="btn-primary" style="margin-top: 1rem; padding: 0.5rem 2rem;" onclick="navigate('home')">Ver todos los productos</button>
        </div>`;
  }
  navigate("category", "Búsqueda");
}

/* =========================================
   Navegación & Vistas
   ========================================= */
function navigate(viewId, viewName = "", categoryName = "") {
  [
    "home",
    "product",
    "cart",
    "favorites",
    "account",
    "faq",
    "category",
  ].forEach((id) => {
    const el = $(`view-${id}`);
    if (el) el.classList.add("hidden");
  });

  const targetView = $(`view-${viewId}`);
  if (targetView) targetView.classList.remove("hidden");
  
  window.scrollTo(0, 0);

  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");
  if (sidebar && sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
  }

  document.querySelectorAll(".sidebar .menu-item").forEach((item) => {
    item.classList.remove("active");
    if (
      item.innerText.toLowerCase().includes(viewId.toLowerCase()) ||
      (viewId === "home" && item.innerText.toLowerCase().includes("inicio"))
    ) {
      item.classList.add("active");
    }
  });

  const breadcrumb = $("breadcrumb-container");
  if (breadcrumb) {
    if (viewId === "home") {
      breadcrumb.innerHTML = `<button type="button" onclick="navigate('home')" aria-label="Volver al inicio">Inicio</button>`;
    } else if (viewId === "product" && categoryName) {
      breadcrumb.innerHTML = `
        <button type="button" onclick="navigate('home')" aria-label="Volver al inicio">Inicio</button> > 
        <button type="button" onclick="abrirCategoria('${categoryName}')" aria-label="Volver a la categoría ${categoryName}">${categoryName}</button> > 
        <span style="font-weight:bold;" aria-current="page">${viewName}</span>`;
    } else {
      breadcrumb.innerHTML = `
        <button type="button" onclick="navigate('home')" aria-label="Volver al inicio">Inicio</button> > 
        <span style="font-weight:bold;" aria-current="page">${viewName}</span>`;
    }
  }

  if (viewId === "cart") renderCart();
  if (viewId === "favorites") renderFavs();

  // Mejora de accesibilidad: Anunciar cambio de vista
  announce(`Se ha cargado la vista de ${viewName || viewId}`);
}

function openProduct(id, nombre, precio) {
  // Encontrar la categoría real del producto para las migas de pan
  let categoryName = "";
  categorias.forEach(cat => {
    if (cat.productos.some(p => p.id === id)) {
      categoryName = cat.titulo;
    }
  });

  productoActual = { id, nombre, precio, categoryName };
  const title = $("detail-title");
  const price = $("detail-price");
  const img = $("detail-img");
  
  if (title) title.textContent = nombre;
  if (price) price.textContent = precio;
  if (img) img.innerHTML = `<span>[Imagen Grande Prod ${id}]</span>`;
  navigate("product", nombre, categoryName);
}

function abrirCategoria(nombreCat) {
  const title = $("category-title");
  const grid = $("category-grid");
  if (!title || !grid) return;

  title.textContent = nombreCat;
  
  // Buscar datos reales en la base de datos mock
  const catData = categorias.find(c => c.titulo === nombreCat);
  let gridHTML = "";

  if (catData) {
    gridHTML = catData.productos.map(p => generarTarjeta(p)).join("");
  } else {
    // Para categorías rápidas, generar items genéricos
    for (let i = 1; i <= 20; i++) {
      gridHTML += generarTarjeta({
        id: 200 + i,
        nombre: `${nombreCat} Articulo ${i}`,
        precio: `$${(Math.random() * 500 + 10).toFixed(2)}`,
      });
    }
  }

  grid.innerHTML = gridHTML;
  navigate("category", nombreCat);
}

/* =========================================
   Interacciones de Compra y Carrito
   ========================================= */
function addToCart(id, nombre, precio, event) {
  carrito.push({ id, nombre, precio });
  const count = $("cartCount");
  if (count) count.textContent = `Carrito (${carrito.length})`;

  announce(`${nombre} ha sido agregado al carrito.`);

  if (event && event.currentTarget) {
    const btn = event.currentTarget;
    btn.classList.add("active");
    
    if (btn.dataset.timeoutId) {
      clearTimeout(parseInt(btn.dataset.timeoutId));
    }

    const timeoutId = setTimeout(() => {
      btn.classList.remove("active");
      delete btn.dataset.timeoutId;
    }, 2000);

    btn.dataset.timeoutId = timeoutId;
  }
}

function removeFromCart(index) {
  carrito.splice(index, 1);
  const count = $("cartCount");
  if (count) count.textContent = `Carrito (${carrito.length})`;
  renderCart();
}

function comprarRapido(id, nombre, precio) {
  addToCart(id, nombre, precio, null);
  navigate("cart", "Carrito");
}

function comprarAhoraProdActual() {
  if (productoActual)
    comprarRapido(
      productoActual.id,
      productoActual.nombre,
      productoActual.precio,
    );
}

function toggleFav(id, nombre, precio, event) {
  const btn = event.currentTarget;
  const icon = btn.querySelector("i");
  const index = favoritos.findIndex((f) => f.id === id);
  if (index === -1) {
    favoritos.push({ id, nombre, precio });
    btn.style.backgroundColor = "var(--primary-blue)";
    if (icon) icon.classList.replace("fa-regular", "fa-solid");
    announce(`${nombre} agregado a favoritos.`);
  } else {
    favoritos.splice(index, 1);
    btn.style.backgroundColor = "var(--accent-yellow)";
    if (icon) icon.classList.replace("fa-solid", "fa-regular");
    announce(`${nombre} eliminado de favoritos.`);
  }
}

function renderCart() {
  const container = $("cart-list");
  const footer = $("cart-footer");
  if (!container) return;

  if (carrito.length === 0) {
    container.innerHTML = "<p>Tu carrito está vacío.</p>";
    if (footer) footer.style.display = "none";
    return;
  }

  let total = 0;
  container.innerHTML = carrito
    .map((item, index) => {
      total += parsePrice(item.precio);
      return `
            <div class="list-item">
                <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                    <span style="font-size: 1.1rem;">${item.nombre}</span>
                    <strong style="color: var(--text-blue); font-size: 1.2rem;">${item.precio}</strong>
                </div>
                <button style="background: transparent; border: none; font-size: 2rem; color: var(--danger); cursor: pointer; padding: 0 0.5rem;" onclick="removeFromCart(${index})" title="Eliminar del carrito">×</button>
            </div>
        `;
    })
    .join("");

  if (footer) {
    footer.style.display = "block";
    const totalEl = $("cart-total");
    if (totalEl) totalEl.textContent = `Total: ${formatPrice(total)}`;
  }
}

function renderFavs() {
  const container = $("fav-list");
  if (!container) return;
  container.innerHTML =
    favoritos.length === 0
      ? "<p>No tienes artículos en favoritos.</p>"
      : favoritos
          .map(
            (item) =>
              `<div class="list-item"><span>${item.nombre}</span><button class="btn-buy" style="padding: 0.5rem 1rem; border: 2px solid var(--text-blue); color: var(--text-blue); border-radius: 20px;" onclick="openProduct(${item.id}, '${item.nombre.replace(/'/g, "\\'")}', '${item.precio}')">Ver</button></div>`,
          )
          .join("");
}

/* =========================================
   UI Extras
   ========================================= */
function setupSidebar() {
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");
  const menuBtn = $("menuBtn");
  const closeBtn = $("closeSidebar");

  if (!sidebar || !overlay || !menuBtn || !closeBtn) return;

  const toggleMenu = () => {
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
  };
  menuBtn.addEventListener("click", toggleMenu);
  closeBtn.addEventListener("click", toggleMenu);
  overlay.addEventListener("click", toggleMenu);
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
}

let fontSz = 16;
function changeFontSize(step) {
  fontSz = Math.max(12, Math.min(24, fontSz + step * 2));
  document.documentElement.style.fontSize = fontSz + "px";
}

function openModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add("active");
}

function closeModals() {
  ["loginModal", "registerModal", "checkoutModal", "locationModal"].forEach(id => {
    const modal = $(id);
    if (modal) modal.classList.remove("active");
  });
}

let curSlide = 0;
let slideTimer;
function iniciarCarrusel() {
  slideTimer = setInterval(() => moveCarousel(1), 10000);
}
function moveCarousel(step) {
  const slides = document.querySelectorAll(".slide");
  if (slides.length === 0) return;
  slides[curSlide].classList.remove("active");
  curSlide = (curSlide + step + slides.length) % slides.length;
  slides[curSlide].classList.add("add-active"); // Usando add-active para evitar conflictos si existe, pero el CSS usa .active
  // Corrección: El CSS usa .active
  slides[curSlide].classList.add("active");
  clearInterval(slideTimer);
  iniciarCarrusel();
}

document.addEventListener("DOMContentLoaded", initApp);

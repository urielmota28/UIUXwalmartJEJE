/* =========================================
   Optimización & Helpers
   ========================================= */
const $ = (id) => document.getElementById(id);

// Limpiador y formateador de precios (Para poder hacer matemáticas con "$15,299.00")
const parsePrice = (str) => {
  if (typeof str === "number") return str;
  return parseFloat(str.replace(/[^0-9.-]+/g, ""));
};

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
   Lógica de Datos (Usando ITEMS de Data.js)
   ========================================= */
// Nota: 'ITEMS' viene de Data.js cargado en index.html

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
                <strong>${formatPrice(parsePrice(item.precio))}</strong>
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
  const displayPrice = formatPrice(parsePrice(prod.precio));

  return `
        <article class="product-card">
            <button class="btn-fav" data-id="${prod.id}" onclick="toggleFav(${prod.id}, event)" title="Agregar a favoritos" style="background-color: ${isFav ? "var(--primary-blue)" : "var(--accent-yellow)"}">
                <i class="${isFav ? "fa-solid" : "fa-regular"} fa-heart" style="color: white; font-size: 1.2rem;"></i>
            </button>

            <button type="button" class="image-placeholder" onclick="openProduct(${prod.id})">
                <img src="${prod.imgurl}" alt="${prod.nombre}" style="width: 100%; height: 100%; object-fit: cover;">
            </button>

            <div class="card-actions">
                <button class="btn-buy-icon" onclick="comprarRapido(${prod.id})" title="Comprar ahora">
                    <i class="fa-solid fa-money-bill" style="color: white; font-size: 1.3rem;"></i>
                </button>

                <button class="btn-add-icon" onclick="addToCart(${prod.id}, event)" title="Agregar al carrito">
                    <i class="fa-solid fa-cart-plus" style="color: white; font-size: 1.3rem;"></i>
                </button>
            </div>

            <button type="button" class="card-content" onclick="openProduct(${prod.id})">
                <div class="product-price">${displayPrice}</div>
                <div class="product-title">${prod.nombre}</div>
                <div class="product-brand">${prod.categoria}</div>
                <div class="product-desc">${prod.descripcion}</div>
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
          addToCart(productoActual.id, e);
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
    "Electronica y gaming": "Descuentazos",
    "Hogar y Electrodomesticos": "Te puede interesar",
    "Despensa Basica": "Supermercado"
  };

  const cats = ["Electronica y gaming", "Hogar y Electrodomesticos", "Despensa Basica"];
  let html = "";
  
  cats.forEach((catName, index) => {
    const tituloDisplay = titulosMarketing[catName] || catName;
    const dashboardProds = ITEMS.filter(p => p.categoria === catName && p.isdashboard);
    
    html += `
        <section>
            <h2 class="section-title">${tituloDisplay}</h2>
            <div class="product-grid">${dashboardProds.map((p) => generarTarjeta(p)).join("")}</div>
        </section>
    `;

    // Inyectar sección de videos después de la primera categoría (Descuentazos)
    if (index === 0) {
      html += '<hr class="section-divider">';
      html += renderVideoSection();
      html += '<hr class="section-divider">';
    } else if (index < cats.length - 1) {
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
        <button type="button" class="cat-item" onclick="abrirCategoriaSimulada('${n}')">
            <div class="cat-img">Img ${i + 1}</div>
            <span style="font-weight: bold; font-size: 0.9rem; color: var(--text-blue);">${n}</span>
        </button>
    `,
    )
    .join("");
}

// Para categorías de la base de datos real
function abrirCategoria(nombreCat) {
  const title = $("category-title");
  const grid = $("category-grid");
  if (!title || !grid) return;

  title.textContent = nombreCat;
  
  const prods = ITEMS.filter(p => p.categoria === nombreCat);
  grid.innerHTML = prods.map(p => generarTarjeta(p)).join("");
  
  navigate("category", nombreCat);
}

// Para categorías de la cinta rápida (simuladas)
function abrirCategoriaSimulada(nombreCat) {
    const title = $("category-title");
    const grid = $("category-grid");
    if (!title || !grid) return;

    title.textContent = nombreCat;
    
    let gridHTML = "";
    for (let i = 1; i <= 20; i++) {
      gridHTML += generarTarjeta({
        id: 1000 + i,
        nombre: `${nombreCat} Articulo ${i}`,
        precio: Math.random() * 500 + 10,
        categoria: nombreCat,
        descripcion: "Artículo simulado para la categoría " + nombreCat,
        imgurl: "https://loremflickr.com/320/240/product",
        isdashboard: false,
        isFav: false
      });
    }

    grid.innerHTML = gridHTML;
    navigate("category", nombreCat);
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

    const matches = ITEMS
      .filter((p) => removeAccents(p.nombre.toLowerCase()).includes(cleanQuery))
      .slice(0, 6);

    if (matches.length > 0) {
      suggestions.innerHTML = matches
        .map(
          (m) => `
        <div class="suggestion-item" onclick="openProduct(${m.id}); $('searchSuggestions').classList.add('hidden');">
          <span class="prod-name">${m.nombre}</span>
          <span class="prod-cat">${m.categoria}</span>
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
  
  const matches = ITEMS.filter((p) =>
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

function openProduct(id) {
  const product = ITEMS.find(p => p.id === id) || {
      id: id,
      nombre: "Producto Simulado",
      precio: 0,
      categoria: "General",
      descripcion: "Descripción simulada para este producto.",
      imgurl: "https://loremflickr.com/320/240/product"
  };

  productoActual = product;
  
  const title = $("detail-title");
  const price = $("detail-price");
  const img = $("detail-img");
  const desc = $("detail-description");
  const relatedGrid = $("related-grid");
  const favBtn = $("detail-fav-btn");
  
  if (title) title.textContent = product.nombre;
  if (price) price.textContent = formatPrice(parsePrice(product.precio));
  if (img) img.innerHTML = `<img src="${product.imgurl}" alt="${product.nombre}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
  
  // Actualizar estado del botón de favoritos
  if (favBtn) {
    const isFav = favoritos.some(f => f.id === id);
    const icon = favBtn.querySelector("i");
    if (isFav) {
      favBtn.style.backgroundColor = "var(--primary-blue)";
      favBtn.style.color = "white";
      favBtn.style.borderColor = "var(--primary-blue)";
      icon.classList.replace("fa-regular", "fa-solid");
    } else {
      favBtn.style.backgroundColor = "transparent";
      favBtn.style.color = "var(--accent-yellow)";
      favBtn.style.borderColor = "var(--accent-yellow)";
      icon.classList.replace("fa-solid", "fa-regular");
    }
  }

  // Descripción
  if (desc) {
    desc.textContent = product.descripcion;
  }

  // Generar 5 productos relacionados (reutilizando generarTarjeta)
  if (relatedGrid) {
    let allProds = ITEMS.filter(p => p.id !== id);
    // Priorizar productos de la misma categoría
    let sameCat = allProds.filter(p => p.categoria === product.categoria);
    let others = allProds.filter(p => p.categoria !== product.categoria);
    
    let finalRelated = [...sameCat, ...others].slice(0, 5);
    relatedGrid.innerHTML = finalRelated.map(p => generarTarjeta(p)).join("");
  }

  navigate("product", product.nombre, product.categoria);
}

/* =========================================
   Interacciones de Compra y Carrito
   ========================================= */
function addToCart(id, event) {
  const product = ITEMS.find(p => p.id === id) || { id, nombre: "Producto", precio: 0 };
  carrito.push(product);
  const count = $("cartCount");
  if (count) count.textContent = `Carrito (${carrito.length})`;

  announce(`${product.nombre} ha sido agregado al carrito.`);

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

function comprarRapido(id) {
  addToCart(id, null);
  navigate("cart", "Carrito");
}

function comprarAhoraProdActual() {
  if (productoActual)
    comprarRapido(productoActual.id);
}

function toggleFavProdActual(event) {
  if (productoActual) {
    toggleFav(productoActual.id, event);
    // Forzar actualización visual del botón de la página de detalle
    const favBtn = $("detail-fav-btn");
    const isFav = favoritos.some((f) => f.id === productoActual.id);
    const icon = favBtn.querySelector("i");
    if (isFav) {
      favBtn.style.backgroundColor = "var(--primary-blue)";
      favBtn.style.color = "white";
      favBtn.style.borderColor = "var(--primary-blue)";
      icon.classList.replace("fa-regular", "fa-solid");
    } else {
      favBtn.style.backgroundColor = "transparent";
      favBtn.style.color = "var(--accent-yellow)";
      favBtn.style.borderColor = "var(--accent-yellow)";
      icon.classList.replace("fa-solid", "fa-regular");
    }
  }
}

function toggleFav(id, event) {
  const index = favoritos.findIndex((f) => f.id === id);
  if (index === -1) {
    const product = ITEMS.find(p => p.id === id);
    if (product) favoritos.push(product);
    announce(`Producto agregado a favoritos.`);
  } else {
    favoritos.splice(index, 1);
    announce(`Producto eliminado de favoritos.`);
  }
  // Sincronizar todos los corazones visibles en el sitio
  updateAllFavButtonsUI();
}

function updateAllFavButtonsUI() {
  document.querySelectorAll(".btn-fav").forEach((btn) => {
    const id = parseInt(btn.dataset.id);
    if (!id) return;
    const isFav = favoritos.some((f) => f.id === id);
    const icon = btn.querySelector("i");
    if (isFav) {
      btn.style.backgroundColor = "var(--primary-blue)";
      if (icon) icon.classList.replace("fa-regular", "fa-solid");
    } else {
      btn.style.backgroundColor = "var(--accent-yellow)";
      if (icon) icon.classList.replace("fa-solid", "fa-regular");
    }
  });
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
      const price = parsePrice(item.precio);
      total += price;
      return `
            <div class="list-item">
                <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                    <span style="font-size: 1.1rem;">${item.nombre}</span>
                    <strong style="color: var(--text-blue); font-size: 1.2rem;">${formatPrice(price)}</strong>
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
              `<div class="list-item"><span>${item.nombre}</span><button class="btn-buy" style="padding: 0.5rem 1rem; border: 2px solid var(--text-blue); color: var(--text-blue); border-radius: 20px;" onclick="openProduct(${item.id})">Ver</button></div>`,
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
  slides[curSlide].classList.add("active");
  clearInterval(slideTimer);
  iniciarCarrusel();
}

document.addEventListener("DOMContentLoaded", initApp);

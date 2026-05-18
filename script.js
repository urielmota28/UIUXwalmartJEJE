/* =========================================
   Optimización & Helpers
   ========================================= */
const $ = (id) => document.getElementById(id);

// Limpiador y formateador de precios
const parsePrice = (str) => {
  if (typeof str === "number") return str;
  if (!str) return 0;
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
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/* =========================================
   Accesibilidad: Anunciador ARIA
   ========================================= */
const announce = (message) => {
  const announcer = $("aria-announcer");
  if (announcer) {
    announcer.textContent = "";
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }
};

/* =========================================
   Estado de la Aplicación
   ========================================= */
// Nota: 'ITEMS' viene de Data.js
let carrito = [];
let favoritos = [];
let productoActual = null;
let ubicacionUsuario = "";

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
   Interacciones de Checkout
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
  let resumenHTML =
    '<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem;">';

  carrito.forEach((item) => {
    const price = parsePrice(item.precio);
    total += price;
    resumenHTML += `
            <li style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; border-bottom: 1px dashed var(--text-light); padding-bottom: 0.3rem;">
                <span style="flex: 1; padding-right: 1rem;">${item.nombre}</span>
                <strong>${formatPrice(price)}</strong>
            </li>`;
  });
  resumenHTML += "</ul>";
  resumenHTML += `<div style="text-align: right; font-size: 1.1rem; color: var(--text-blue); margin-top: 0.5rem;"><strong>Total: ${formatPrice(total)}</strong></div>`;

  $("checkoutSummary").innerHTML = resumenHTML;
  toggleNewAddress();
  $("paymentMethod").value = "visa";
  togglePaymentFields();
  openModal("checkoutModal");
}

function finalizarCompra() {
  const method = $("paymentMethod").value;
  const address = $("checkoutNewAddress").value || ubicacionUsuario;
  let errores = [];

  if (!address.trim()) {
    errores.push("- Debes ingresar una dirección de envío.");
  }

  if (method !== "tienda") {
    const card = $("cardNumber").value.trim();
    const expiry = $("cardExpiry").value.trim();
    const cvv = $("cardCVV").value.trim();

    if (!card) errores.push("- El número de tarjeta es obligatorio.");
    else if (card.length < 15 || card.length > 16)
      errores.push("- El número de tarjeta debe tener 15 o 16 dígitos.");

    if (!expiry) errores.push("- La fecha de expiración es obligatoria.");
    else if (!/^\d{2}\/\d{2}$/.test(expiry))
      errores.push("- El formato de expiración debe ser MM/AA.");

    if (!cvv) errores.push("- El código CVV es obligatorio.");
    else if (cvv.length !== 3) errores.push("- El CVV debe tener 3 dígitos.");
  }

  if (errores.length > 0) {
    alert("Por favor corrige:\n\n" + errores.join("\n"));
    return;
  }

  alert("¡Compra realizada con éxito!");
  carrito = [];
  const countText = `Carrito (0)`;
  const desktopCart = $("cartCount");
  const mobileCart = $("mobileCartCount");
  if (desktopCart) desktopCart.textContent = countText;
  if (mobileCart) mobileCart.textContent = countText;
  renderCart();
  closeModals();
  navigate("home");
}

/* =========================================
   Generador de Tarjetas
   ========================================= */
function generarTarjeta(prod) {
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
  navigate("home");

  const addCartBtn = $("detail-add-cart");
  if (addCartBtn) {
    addCartBtn.onclick = function (e) {
      if (productoActual) addToCart(productoActual.id, e);
    };
  }
}

const videosTendencia = [
  {
    id: 1,
    titulo: "MrBeast en Walmart",
    descripcion: "Go! x3",
    url: "https://www.youtube.com/shorts/vXNtju4VFm4",
    img: "https://img.youtube.com/vi/vXNtju4VFm4/maxresdefault.jpg",
  },
  {
    id: 2,
    titulo: "Walmart USA Tour",
    descripcion: "¿Qué venden en Walmart USA?",
    url: "https://www.youtube.com/shorts/k3SV2dLaX5A",
    img: "https://img.youtube.com/vi/k3SV2dLaX5A/maxresdefault.jpg",
  },
  {
    id: 3,
    titulo: "Mamá Lucha",
    descripcion: "Súper Días de Ahorro",
    url: "https://www.youtube.com/shorts/vYZzvSOoa5A",
    img: "https://img.youtube.com/vi/vYZzvSOoa5A/maxresdefault.jpg",
  },
];

function renderVideoSection() {
  return `
    <section class="video-section">
      <h2 class="section-title">Tendencia</h2>
      <div class="video-grid">
        ${videosTendencia
          .map(
            (v) => `
          <button class="video-card" onclick="window.open('${v.url}', '_blank')" aria-label="Reproducir video: ${v.titulo}">
            <img src="${v.img}" alt="" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; z-index: 0;">
            <div class="video-play-icon" style="z-index: 1;"><i class="fa-solid fa-play"></i></div>
            <div class="video-overlay" style="z-index: 2;">
              <h4>${v.titulo}</h4>
              <p style="font-size: 0.8rem; opacity: 0.9;">${v.descripcion}</p>
            </div>
          </button>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderSections() {
  const container = $("sections-container");
  if (!container) return;

  const titulosMarketing = {
    "Electronica y gaming": "Descuentazos",
    "Hogar y Electrodomesticos": "Te puede interesar",
    "Despensa Basica": "Supermercado",
  };

  const cats = [
    "Electronica y gaming",
    "Hogar y Electrodomesticos",
    "Despensa Basica",
  ];
  let html = "";

  cats.forEach((catName, index) => {
    const tituloDisplay = titulosMarketing[catName] || catName;
    const dashboardProds = ITEMS.filter(
      (p) => p.categoria === catName && p.isdashboard,
    );

    html += `
        <section>
            <h2 class="section-title">${tituloDisplay}</h2>
            <div class="product-grid">${dashboardProds.map((p) => generarTarjeta(p)).join("")}</div>
        </section>
    `;

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
  const categoriasInfo = [
    { nombre: "Ahorro", file: "Ahorro.jpg" },
    { nombre: "Flash Deals", file: "Flash Deals.jpg" },
    { nombre: "Nuestras Marcas", file: "Nuestras Marcas.jpg" },
    { nombre: "Walmart Pass", file: "Walmart Pass.jpg" },
    { nombre: "Súper", file: "Súper.jpg" },
    { nombre: "Prichos", file: "prichos.jpg" },
    { nombre: "Goleada", file: "Goleada.jpg" },
    { nombre: "Express", file: "Express.jpg" },
  ];
  const container = $("quickCategories");
  if (!container) return;
  container.innerHTML = categoriasInfo
    .map(
      (cat) => `
    <button type="button" class="cat-item" onclick="abrirCategoriaSimulada('${cat.nombre}')">
        <div class="cat-img" style="overflow: hidden;">
            <img src="${cat.file}" alt="" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <span style="font-weight: bold; font-size: 0.9rem; color: var(--text-blue);">${cat.nombre}</span>
    </button>`,
    )
    .join("");
}

function abrirCategoria(nombreCat) {
  const title = $("category-title");
  const grid = $("category-grid");
  if (!title || !grid) return;
  title.textContent = nombreCat;
  const prods = ITEMS.filter((p) => p.categoria === nombreCat);
  grid.innerHTML = prods.map((p) => generarTarjeta(p)).join("");
  navigate("category", nombreCat);
}

function abrirCategoriaSimulada(nombreCat) {
  const title = $("category-title");
  const grid = $("category-grid");
  if (!title || !grid) return;
  title.textContent = nombreCat;
  const mixedProds = [...ITEMS].sort(() => 0.5 - Math.random()).slice(0, 20);
  grid.innerHTML = mixedProds.map((p) => generarTarjeta(p)).join("");
  navigate("category", nombreCat);
}

/* =========================================
   Búsqueda
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
    const matches = ITEMS.filter((p) =>
      removeAccents(p.nombre.toLowerCase()).includes(cleanQuery),
    ).slice(0, 6);

    if (matches.length > 0) {
      suggestions.innerHTML = matches
        .map(
          (m) => `
        <div class="suggestion-item" onclick="openProduct(${m.id}); $('searchSuggestions').classList.add('hidden');">
          <span class="prod-name">${m.nombre}</span>
          <span class="prod-cat">${m.categoria}</span>
        </div>`,
        )
        .join("");
      suggestions.classList.remove("hidden");
    } else {
      suggestions.classList.add("hidden");
    }
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target))
      suggestions.classList.add("hidden");
  });

  btn.addEventListener("click", () => {
    const query = input.value.trim();
    if (query) {
      abrirResultadosBusqueda(query);
      suggestions.classList.add("hidden");
    }
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") btn.click();
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
    grid.innerHTML = matches.map((p) => generarTarjeta(p)).join("");
  } else {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem;"><p>No hay resultados.</p></div>`;
  }
  navigate("category", "Búsqueda");
}

/* =========================================
   Navegación
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
  if (sidebar && sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
    $("sidebarOverlay").classList.remove("active");
  }
  const breadcrumb = $("breadcrumb-container");
  if (breadcrumb) {
    if (viewId === "home") {
      breadcrumb.classList.add("hidden");
    } else {
      breadcrumb.classList.remove("hidden");
      if (viewId === "product" && categoryName) {
        breadcrumb.innerHTML = `<button type="button" onclick="navigate('home')">Inicio</button> > <button type="button" onclick="abrirCategoria('${categoryName}')">${categoryName}</button> > <span style="font-weight:bold;">${viewName}</span>`;
      } else {
        breadcrumb.innerHTML = `<button type="button" onclick="navigate('home')">Inicio</button> > <span style="font-weight:bold;">${viewName}</span>`;
      }
    }
  }
  if (viewId === "cart") renderCart();
  if (viewId === "favorites") renderFavs();
  announce(`Se ha cargado ${viewName || viewId}`);
}

function openProduct(id) {
  const product = ITEMS.find((p) => p.id === id);
  if (!product) return;
  productoActual = product;
  $("detail-title").textContent = product.nombre;
  $("detail-price").textContent = formatPrice(product.precio);
  $("detail-img").innerHTML =
    `<img src="${product.imgurl}" alt="${product.nombre}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
  $("detail-description").textContent = product.descripcion;

  const favBtn = $("detail-fav-btn");
  if (favBtn) {
    const isFav = favoritos.some((f) => f.id === id);
    const icon = favBtn.querySelector("i");
    if (isFav) {
      favBtn.style.backgroundColor = "var(--primary-blue)";
      favBtn.style.color = "white";
      icon.classList.replace("fa-regular", "fa-solid");
    } else {
      favBtn.style.backgroundColor = "transparent";
      favBtn.style.color = "var(--accent-yellow)";
      icon.classList.replace("fa-solid", "fa-regular");
    }
  }

  const relatedGrid = $("related-grid");
  if (relatedGrid) {
    const related = ITEMS.filter(
      (p) => p.categoria === product.categoria && p.id !== id,
    ).slice(0, 5);
    relatedGrid.innerHTML = related.map((p) => generarTarjeta(p)).join("");
  }
  navigate("product", product.nombre, product.categoria);
}

/* =========================================
   Carrito y Favoritos
   ========================================= */
function addToCart(id, event) {
  const product = ITEMS.find((p) => p.id === id);
  if (product) {
    carrito.push(product);
    const countText = `Carrito (${carrito.length})`;
    const desktopCart = $("cartCount");
    const mobileCart = $("mobileCartCount");
    if (desktopCart) desktopCart.textContent = countText;
    if (mobileCart) mobileCart.textContent = countText;
    announce(`${product.nombre} agregado.`);
  }
  if (event && event.currentTarget) {
    const btn = event.currentTarget;
    btn.classList.add("active");
    setTimeout(() => btn.classList.remove("active"), 2000);
  }
}

function removeFromCart(index) {
  carrito.splice(index, 1);
  const countText = `Carrito (${carrito.length})`;
  const desktopCart = $("cartCount");
  const mobileCart = $("mobileCartCount");
  if (desktopCart) desktopCart.textContent = countText;
  if (mobileCart) mobileCart.textContent = countText;
  renderCart();
}

function comprarRapido(id) {
  addToCart(id, null);
  navigate("cart", "Carrito");
}

function comprarAhoraProdActual() {
  if (productoActual) comprarRapido(productoActual.id);
}

function toggleFav(id, event) {
  const index = favoritos.findIndex((f) => f.id === id);
  if (index === -1) {
    const product = ITEMS.find((p) => p.id === id);
    if (product) favoritos.push(product);
  } else favoritos.splice(index, 1);
  updateAllFavButtonsUI();
}

function toggleFavProdActual(event) {
  if (productoActual) {
    toggleFav(productoActual.id, event);
    const isFav = favoritos.some((f) => f.id === productoActual.id);
    const favBtn = $("detail-fav-btn");
    const icon = favBtn.querySelector("i");
    if (isFav) {
      favBtn.style.backgroundColor = "var(--primary-blue)";
      favBtn.style.color = "white";
      icon.classList.replace("fa-regular", "fa-solid");
    } else {
      favBtn.style.backgroundColor = "transparent";
      favBtn.style.color = "var(--accent-yellow)";
      icon.classList.replace("fa-solid", "fa-regular");
    }
  }
}

function updateAllFavButtonsUI() {
  document.querySelectorAll(".btn-fav").forEach((btn) => {
    const id = parseInt(btn.dataset.id);
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
  if (!container) return;
  if (carrito.length === 0) {
    container.innerHTML = "<p>Tu carrito está vacío.</p>";
    $("cart-footer").style.display = "none";
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
  $("cart-footer").style.display = "block";
  $("cart-total").textContent = `Total: ${formatPrice(total)}`;
}

function renderFavs() {
  const container = $("fav-list");
  if (!container) return;
  if (favoritos.length === 0) {
    container.innerHTML = "<p>Sin favoritos.</p>";
    return;
  }
  container.innerHTML = favoritos
    .map(
      (item) =>
        `<div class="list-item"><span>${item.nombre}</span><button class="btn-back" onclick="openProduct(${item.id})">Ver</button></div>`,
    )
    .join("");
}

/* =========================================
   UI
   ========================================= */
function setupSidebar() {
  const toggle = () => {
    $("sidebar").classList.toggle("active");
    $("sidebarOverlay").classList.toggle("active");
  };
  $("menuBtn").addEventListener("click", toggle);
  $("closeSidebar").addEventListener("click", toggle);
  $("sidebarOverlay").addEventListener("click", toggle);
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
}

function changeFontSize(step) {
  const html = document.documentElement;
  let size = parseInt(window.getComputedStyle(html).fontSize);
  html.style.fontSize = size + step * 2 + "px";
}

function openModal(id) {
  $(id).classList.add("active");
}

function closeModals() {
  ["loginModal", "registerModal", "checkoutModal", "locationModal"].forEach(
    (id) => $(id).classList.remove("active"),
  );
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

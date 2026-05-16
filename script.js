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

  $("detail-add-cart").onclick = function (e) {
    if (productoActual)
      addToCart(
        productoActual.id,
        productoActual.nombre,
        productoActual.precio,
        e,
      );
  };
}

function renderSections() {
  const container = $("sections-container");
  container.innerHTML = categorias
    .map(
      (cat, index) => `
        <section>
            <h2 class="section-title">${cat.titulo}</h2>
            <div class="product-grid">${cat.productos.map((p) => generarTarjeta(p)).join("")}</div>
        </section>
        ${index < categorias.length - 1 ? '<hr class="section-divider">' : ""}
    `,
    )
    .join("");
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
  $("quickCategories").innerHTML = nombres
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
   Navegación & Vistas
   ========================================= */
function navigate(viewId, viewName = "") {
  [
    "home",
    "product",
    "cart",
    "favorites",
    "account",
    "faq",
    "category",
  ].forEach((id) => {
    $(`view-${id}`).classList.add("hidden");
  });

  $(`view-${viewId}`).classList.remove("hidden");
  window.scrollTo(0, 0);

  // Cerrar sidebar automáticamente en móvil tras navegar
  if ($("sidebar").classList.contains("active")) {
    $("sidebar").classList.remove("active");
    $("sidebarOverlay").classList.remove("active");
  }

  // Resaltar ítem activo en el menú (Mejora predictiva)
  document.querySelectorAll(".sidebar .menu-item").forEach((item) => {
    item.classList.remove("active");
    // Si el texto del item coincide o contiene la vista, marcar como activo
    if (
      item.innerText.toLowerCase().includes(viewId.toLowerCase()) ||
      (viewId === "home" && item.innerText.toLowerCase().includes("inicio"))
    ) {
      item.classList.add("active");
    }
  });

  const breadcrumb = $("breadcrumb-container");
  if (viewId === "home")
    breadcrumb.innerHTML = `<button type="button" onclick="navigate('home')">Inicio</button>`;
  else
    breadcrumb.innerHTML = `<button type="button" onclick="navigate('home')">Inicio</button> > <span style="font-weight:bold;">${viewName}</span>`;

  if (viewId === "cart") renderCart();
  if (viewId === "favorites") renderFavs();
}

function openProduct(id, nombre, precio) {
  productoActual = { id, nombre, precio };
  $("detail-title").textContent = nombre;
  $("detail-price").textContent = precio;
  $("detail-img").innerHTML = `<span>[Imagen Grande Prod ${id}]</span>`;
  navigate("product", nombre);
}

function abrirCategoria(nombreCat) {
  $("category-title").textContent = nombreCat;
  let gridHTML = "";
  for (let i = 1; i <= 30; i++) {
    gridHTML += generarTarjeta({
      id: 100 + i,
      nombre: `${nombreCat} Producto ${i}`,
      precio: `$${(Math.random() * 500).toFixed(2)}`,
    });
  }
  $("category-grid").innerHTML = gridHTML;
  navigate("category", nombreCat);
}

/* =========================================
   Interacciones de Compra y Carrito
   ========================================= */
function addToCart(id, nombre, precio, event) {
  carrito.push({ id, nombre, precio });
  $("cartCount").textContent = `Carrito (${carrito.length})`;

  if (event && event.currentTarget) {
    const btn = event.currentTarget;
    const originalBG = btn.style.backgroundColor;
    btn.style.backgroundColor = "var(--primary-blue)";
    setTimeout(() => {
      btn.style.backgroundColor = originalBG;
    }, 2000);
  }
}

function removeFromCart(index) {
  carrito.splice(index, 1);
  $("cartCount").textContent = `Carrito (${carrito.length})`;
  renderCart(); // Re-renderizar la vista para actualizar el total y la lista
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
    icon.classList.replace("fa-regular", "fa-solid");
  } else {
    favoritos.splice(index, 1);
    btn.style.backgroundColor = "var(--accent-yellow)";
    icon.classList.replace("fa-solid", "fa-regular");
  }
}

function renderCart() {
  const container = $("cart-list");
  const footer = $("cart-footer");

  if (carrito.length === 0) {
    container.innerHTML = "<p>Tu carrito está vacío.</p>";
    if (footer) footer.style.display = "none";
    return;
  }

  let total = 0;
  container.innerHTML = carrito
    .map((item, index) => {
      total += parsePrice(item.precio); // Sumar al total
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

  // Mostrar el footer de pago y actualizar el texto del total
  if (footer) {
    footer.style.display = "block";
    $("cart-total").textContent = `Total: ${formatPrice(total)}`;
  }
}

/* =========================================
   Flujo de Ticket y Modal Checkout
   ========================================= */
function abrirCheckout() {
  let total = 0;
  let resumenHTML =
    '<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.95rem;">';

  // Llenar la lista del ticket dinámicamente
  carrito.forEach((item) => {
    total += parsePrice(item.precio);
    resumenHTML += `
            <li style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; border-bottom: 1px dashed var(--text-light); padding-bottom: 0.5rem;">
                <span style="flex: 1; padding-right: 1rem;">${item.nombre}</span>
                <strong>${item.precio}</strong>
            </li>`;
  });
  resumenHTML += "</ul>";
  resumenHTML += `
        <div style="text-align: right; font-size: 1.3rem; color: var(--text-blue); margin-top: 1rem;">
            <strong>Total: ${formatPrice(total)}</strong>
        </div>`;

  $("checkoutSummary").innerHTML = resumenHTML;
  openModal("checkoutModal");
}

function cerrarTicket() {
  // El flujo dicta que al cerrar la ventana modal de pago se elimina todo del carrito
  carrito = [];
  $("cartCount").textContent = `Carrito (0)`;
  renderCart();
  $("checkoutModal").classList.remove("active");
  navigate("home");
}

function renderFavs() {
  const container = $("fav-list");
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
  const toggleMenu = () => {
    $("sidebar").classList.toggle("active");
    $("sidebarOverlay").classList.toggle("active");
  };
  $("menuBtn").addEventListener("click", toggleMenu);
  $("closeSidebar").addEventListener("click", toggleMenu);
  $("sidebarOverlay").addEventListener("click", toggleMenu);
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
  $(id).classList.add("active");
}
function closeModals() {
  $("loginModal").classList.remove("active");
  $("registerModal").classList.remove("active");
  $("checkoutModal").classList.remove("active");
}

let curSlide = 0;
let slideTimer;
function iniciarCarrusel() {
  slideTimer = setInterval(() => moveCarousel(1), 10000);
}
function moveCarousel(step) {
  const slides = document.querySelectorAll(".slide");
  slides[curSlide].classList.remove("active");
  curSlide = (curSlide + step + slides.length) % slides.length;
  slides[curSlide].classList.add("active");
  clearInterval(slideTimer);
  iniciarCarrusel();
}

document.addEventListener("DOMContentLoaded", initApp);

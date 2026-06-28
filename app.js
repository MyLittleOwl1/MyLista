// ============================================
// MyLista — App principal
// ============================================

// ----- TOAST NOTIFICATIONS -----
function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const icons = {
        success: "✅",
        error: "❌",
        info: "ℹ️",
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || "ℹ️"}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("removing");
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

// ----- LOADING OVERLAY -----
function showLoading(show = true) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
        overlay.style.display = show ? "flex" : "none";
    }
}

// ----- THEME TOGGLE -----
const themeToggle = document.getElementById("themeToggle");
const html = document.documentElement;

function getPreferredTheme() {
    const saved = localStorage.getItem("mylista-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
}

function setTheme(theme) {
    html.setAttribute("data-theme", theme);
    localStorage.setItem("mylista-theme", theme);

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.content = theme === "dark" ? "#0a0a0f" : "#f5f5f7";
    }
}

// Init theme
setTheme(getPreferredTheme());

themeToggle.addEventListener("click", () => {
    const current = html.getAttribute("data-theme");
    setTheme(current === "dark" ? "light" : "dark");
});

// ----- AUTENTICACIÓN -----
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const authSection = document.getElementById("authSection");
const appMain = document.getElementById("appMain");

// Ocultar app hasta login
appMain.style.display = "none";

// Registro
registerBtn.addEventListener("click", async () => {
    if (!emailInput.value || !passwordInput.value) {
        return showToast("Introduce email y contraseña", "error");
    }
    try {
        showLoading(true);
        await auth.createUserWithEmailAndPassword(
            emailInput.value,
            passwordInput.value
        );
        showToast("¡Cuenta creada correctamente!", "success");
    } catch (err) {
        showToast(getFirebaseErrorMessage(err.code), "error");
    } finally {
        showLoading(false);
    }
});

// Login
loginBtn.addEventListener("click", async () => {
    if (!emailInput.value || !passwordInput.value) {
        return showToast("Introduce email y contraseña", "error");
    }
    try {
        showLoading(true);
        await auth.signInWithEmailAndPassword(
            emailInput.value,
            passwordInput.value
        );
        showToast("Sesión iniciada", "success");
    } catch (err) {
        showToast(getFirebaseErrorMessage(err.code), "error");
    } finally {
        showLoading(false);
    }
});

// Logout
logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    showToast("Sesión cerrada", "info");
});

// Detectar usuario
auth.onAuthStateChanged((user) => {
    if (user) {
        authSection.style.display = "none";
        appMain.style.display = "block";
    } else {
        authSection.style.display = "flex";
        appMain.style.display = "none";
    }
});

// Traducir errores de Firebase
function getFirebaseErrorMessage(code) {
    const messages = {
        "auth/user-not-found": "Usuario no encontrado",
        "auth/wrong-password": "Contraseña incorrecta",
        "auth/invalid-credential": "Credenciales inválidas",
        "auth/email-already-in-use": "Este email ya está registrado",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
        "auth/invalid-email": "Email no válido",
        "auth/too-many-requests": "Demasiados intentos. Inténtalo más tarde",
        "auth/network-request-failed": "Error de conexión. Comprueba tu red",
    };
    return messages[code] || "Error: " + code;
}

// ----- CATÁLOGO -----
let catalog = [];
let currentDate = null;
let currentItems = [];

async function loadCatalog() {
    const docRef = db.collection("catalog").doc("items");
    const snap = await docRef.get();

    if (snap.exists) {
        catalog = snap.data().list || [];
    } else {
        catalog = [];
        await docRef.set({ list: catalog });
    }
}

async function saveCatalog() {
    await db.collection("catalog").doc("items").set({ list: catalog });
}

async function ensureItemInCatalog(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!catalog.includes(trimmed)) {
        catalog.push(trimmed);
        await saveCatalog();
        updateAllSelectOptions();
    }
}

// ----- LISTA POR USUARIO -----
async function loadList(date) {
    const user = auth.currentUser;
    const docRef = db
        .collection("shoppingLists")
        .doc(user.uid)
        .collection("lists")
        .doc(date);

    const snap = await docRef.get();

    if (snap.exists) {
        currentItems = snap.data().items || [];
    } else {
        currentItems = [];
        await docRef.set({ items: currentItems });
    }

    currentDate = date;
    currentDateTitle.textContent = `Lista del ${formatDate(date)}`;
    renderList();
}

async function saveList(date) {
    const user = auth.currentUser;
    await db
        .collection("shoppingLists")
        .doc(user.uid)
        .collection("lists")
        .doc(date)
        .set({ items: currentItems });
}

async function syncList() {
    if (currentDate) await saveList(currentDate);
}

// Formatear fecha YYYY-MM-DD a algo más legible
function formatDate(dateStr) {
    const [y, m, d] = dateStr.split("-");
    const date = new Date(+y, +m - 1, +d);
    const options = { weekday: "long", day: "numeric", month: "long" };
    return date.toLocaleDateString("es-ES", options);
}

// ----- DOM -----
const dateInput = document.getElementById("dateInput");
const loadListBtn = document.getElementById("loadListBtn");
const addItemBtn = document.getElementById("addItemBtn");
const saveListBtn = document.getElementById("saveListBtn");
const itemsContainer = document.getElementById("itemsContainer");
const currentDateTitle = document.getElementById("currentDateTitle");
const emptyState = document.getElementById("emptyState");
const itemCount = document.getElementById("itemCount");

// Establecer fecha de hoy por defecto
const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

loadListBtn.addEventListener("click", async () => {
    if (!dateInput.value) return showToast("Selecciona una fecha", "error");
    try {
        showLoading(true);
        await loadCatalog();
        await loadList(dateInput.value);
        showToast("Lista cargada", "success");
    } catch (err) {
        showToast("Error al cargar la lista", "error");
    } finally {
        showLoading(false);
    }
});

addItemBtn.addEventListener("click", () => {
    if (!currentDate) return showToast("Primero carga una lista", "error");
    currentItems.push({ name: catalog[0] || "", quantity: 1 });
    renderList();
    syncList();
});

saveListBtn.addEventListener("click", async () => {
    if (!currentDate) return showToast("No hay lista cargada", "error");
    try {
        showLoading(true);
        await saveList(currentDate);
        showToast("Lista guardada correctamente", "success");
    } catch (err) {
        showToast("Error al guardar la lista", "error");
    } finally {
        showLoading(false);
    }
});

// ----- RENDER -----
function renderList() {
    itemsContainer.innerHTML = "";

    currentItems.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "item-row";

        // Grip icon
        const grip = document.createElement("span");
        grip.className = "item-grip";
        grip.textContent = "⠿";

        // Select con catálogo
        const select = document.createElement("select");
        const customOption = document.createElement("option");
        customOption.value = "__custom__";
        customOption.textContent = "Nuevo artículo...";
        select.appendChild(customOption);

        catalog.forEach((name) => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });

        // Input para artículo nuevo
        const customInput = document.createElement("input");
        customInput.type = "text";
        customInput.placeholder = "Escribe un artículo nuevo...";
        customInput.style.display = "none";

        // Cantidad
        const qty = document.createElement("input");
        qty.type = "number";
        qty.min = "1";
        qty.value = item.quantity;
        qty.className = "item-qty";
        qty.inputMode = "numeric";

        // Botón eliminar
        const del = document.createElement("button");
        del.className = "item-delete";
        del.textContent = "✕";
        del.setAttribute("aria-label", "Eliminar artículo");

        // Estado inicial
        if (catalog.includes(item.name)) {
            select.value = item.name;
        } else {
            select.value = "__custom__";
            if (item.name) {
                customInput.value = item.name;
                customInput.style.display = "block";
            }
        }

        // Eventos
        select.addEventListener("change", async () => {
            if (select.value === "__custom__") {
                customInput.style.display = "block";
                customInput.focus();
                currentItems[index].name = customInput.value;
            } else {
                customInput.style.display = "none";
                currentItems[index].name = select.value;
                syncList();
            }
        });

        customInput.addEventListener("input", async () => {
            currentItems[index].name = customInput.value;
            await ensureItemInCatalog(customInput.value);
            syncList();
        });

        customInput.addEventListener("blur", () => {
            if (!customInput.value && select.value === "__custom__") {
                customInput.style.display = "none";
                select.value = catalog[0] || "__custom__";
                currentItems[index].name = select.value;
            }
        });

        qty.addEventListener("input", () => {
            const val = parseInt(qty.value);
            currentItems[index].quantity = val > 0 ? val : 1;
            if (val <= 0) qty.value = 1;
            syncList();
        });

        del.addEventListener("click", () => {
            currentItems.splice(index, 1);
            renderList();
            syncList();
        });

        row.appendChild(grip);
        row.appendChild(select);
        row.appendChild(qty);
        row.appendChild(del);
        row.appendChild(customInput);

        itemsContainer.appendChild(row);
    });

    updateEmptyState();
    updateItemCount();
}

function updateEmptyState() {
    if (!emptyState) return;
    const hasItems = currentItems.length > 0;
    emptyState.classList.toggle("visible", !hasItems);
}

function updateItemCount() {
    if (!itemCount) return;
    const count = currentItems.length;
    itemCount.textContent = `${count} ${count === 1 ? "artículo" : "artículos"}`;
}

function updateAllSelectOptions() {
    const rows = itemsContainer.querySelectorAll(".item-row");
    rows.forEach((row, index) => {
        const select = row.querySelector("select");
        const customInput = row.querySelector('input[type="text"]');
        const currentValue = currentItems[index]?.name || "";

        select.innerHTML = "";

        const customOption = document.createElement("option");
        customOption.value = "__custom__";
        customOption.textContent = "Nuevo artículo...";
        select.appendChild(customOption);

        catalog.forEach((name) => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });

        if (catalog.includes(currentValue)) {
            select.value = currentValue;
            if (customInput) customInput.style.display = "none";
        } else {
            select.value = "__custom__";
            if (customInput && currentValue) {
                customInput.value = currentValue;
                customInput.style.display = "block";
            }
        }
    });
}

// ----- INICIO -----
// Cargar catálogo al inicio
loadCatalog();

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
    catalog.sort((a, b) => a.localeCompare(b, "es"));
    populateQuickAdd();
}

async function saveCatalog() {
    await db.collection("catalog").doc("items").set({ list: catalog });
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
    // Filtrar artículos vacíos antes de guardar
    const clean = currentItems.filter((it) => it.name.trim());
    currentItems.length = 0;
    currentItems.push(...clean);
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
    // Guardar lo escrito antes de añadir
    syncList();
    // Si ya hay una fila vacía, la enfocamos en vez de crear otra
    const emptyIndex = currentItems.findIndex((it) => !it.name.trim());
    if (emptyIndex !== -1) {
        const inputs = itemsContainer.querySelectorAll(".item-name-input");
        if (inputs[emptyIndex]) {
            inputs[emptyIndex].focus();
            showToast("Completa el artículo vacío primero", "info");
        }
        return;
    }
    currentItems.push({ name: "", quantity: 1 });
    renderList();
    const inputs = itemsContainer.querySelectorAll(".item-name-input");
    const last = inputs[inputs.length - 1];
    if (last) setTimeout(() => last.focus(), 100);
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

// ----- MODAL DE CATÁLOGO -----
const catalogModal = document.getElementById("catalogModal");
const catalogModalTitle = document.getElementById("catalogModalTitle");
const catalogModalList = document.getElementById("catalogModalList");
const catalogModalSearch = document.getElementById("catalogModalSearch");
const catalogModalClose = document.getElementById("catalogModalClose");

function openCatalogManager() {
    catalogModalTitle.textContent = "Gestionar catálogo";
    catalogModalSearch.value = "";
    catalogModalSearch.placeholder = "Buscar productos para eliminar...";
    renderCatalogModalList("");
    catalogModal.style.display = "flex";
    setTimeout(() => catalogModalSearch.focus(), 150);
}

function closeCatalogModal() {
    catalogModal.style.display = "none";
    catalogModalSearch.value = "";
}

function renderCatalogModalList(filter) {
    catalogModalList.innerHTML = "";
    const lower = filter.toLowerCase();
    const filtered = catalog.filter((n) => n.toLowerCase().includes(lower));

    if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "modal-empty";
        empty.textContent = filter ? "Sin resultados" : "El catálogo está vacío";
        catalogModalList.appendChild(empty);
        return;
    }

    filtered.forEach((name) => {
        const item = document.createElement("div");
        item.className = "modal-list-item";

        const nameSpan = document.createElement("span");
        nameSpan.className = "item-name";
        nameSpan.textContent = name;

        item.appendChild(nameSpan);

        const delBtn = document.createElement("button");
        delBtn.className = "item-delete-btn";
        delBtn.textContent = "🗑️";
        delBtn.setAttribute("aria-label", `Eliminar ${name}`);
        delBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            catalog = catalog.filter((n) => n !== name);
            catalog.sort((a, b) => a.localeCompare(b, "es"));
            await saveCatalog();
            populateQuickAdd();
            renderCatalogModalList(catalogModalSearch.value);
            showToast(`"${name}" eliminado del catálogo`, "info");
        });
        item.appendChild(delBtn);
        item.addEventListener("click", () => delBtn.click());

        catalogModalList.appendChild(item);
    });
}

// Eventos del modal
catalogModalClose.addEventListener("click", closeCatalogModal);
catalogModal.addEventListener("click", (e) => {
    if (e.target === catalogModal) closeCatalogModal();
});
catalogModalSearch.addEventListener("input", () => {
    renderCatalogModalList(catalogModalSearch.value);
});

// Botón de gestionar catálogo
document.getElementById("catalogMgrBtn").addEventListener("click", openCatalogManager);

// ----- RENDER -----
function renderList() {
    itemsContainer.innerHTML = "";

    currentItems.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "item-row";

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "Escribe un producto...";
        nameInput.value = item.name || "";
        nameInput.setAttribute("autocomplete", "off");
        nameInput.className = "item-name-input";

        const del = document.createElement("button");
        del.className = "item-delete";
        del.textContent = "✕";
        del.setAttribute("aria-label", "Eliminar artículo");

        let debounceTimer;

        nameInput.addEventListener("input", async () => {
            if (!currentItems[index]) return;
            currentItems[index].name = nameInput.value;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                if (!currentItems[index]) return;
                const trimmed = nameInput.value.trim();
                if (trimmed && !catalog.includes(trimmed)) {
                    catalog.push(trimmed);
                    catalog.sort((a, b) => a.localeCompare(b, "es"));
                    await saveCatalog();
                    populateQuickAdd();
                }
                syncList();
            }, 400);
        });

        nameInput.addEventListener("blur", () => {
            if (!nameInput.value.trim()) {
                setTimeout(() => {
                    if (nameInput.value.trim()) return;
                    if (!currentItems[index] || currentItems[index].name.trim()) return;
                    currentItems.splice(index, 1);
                    renderList();
                    syncList();
                }, 150);
            }
        });

        del.addEventListener("click", () => {
            if (!currentItems[index]) return;
            currentItems.splice(index, 1);
            renderList();
            syncList();
        });

        row.appendChild(nameInput);
        row.appendChild(del);
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

// ----- QUICK ADD SELECT -----
const quickAddSelect = document.getElementById("quickAddSelect");

function populateQuickAdd() {
    const currentVal = quickAddSelect.value;
    quickAddSelect.innerHTML = '<option value="">➕ Añadir desde catálogo...</option>';
    catalog.forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        quickAddSelect.appendChild(opt);
    });
    quickAddSelect.value = currentVal !== "" && catalog.includes(currentVal) ? currentVal : "";
}

quickAddSelect.addEventListener("change", () => {
    const name = quickAddSelect.value;
    if (!name) return;
    // Si ya existe un item igual, lo saltamos
    const exists = currentItems.some((it) => it.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        showToast(`"${name}" ya está en la lista`, "info");
        quickAddSelect.value = "";
        return;
    }
    currentItems.push({ name, quantity: 1 });
    renderList();
    syncList();
    quickAddSelect.value = "";
    showToast(`"${name}" añadido`, "success");
});

// ----- INICIO -----
loadCatalog();

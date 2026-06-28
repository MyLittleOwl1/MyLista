// ----------------------
// AUTENTICACIÓN
// ----------------------

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const authSection = document.getElementById("authSection");
const appMain = document.querySelector(".app-main");

// Ocultar app hasta login
appMain.style.display = "none";

// Registro
registerBtn.addEventListener("click", async () => {
    try {
        await auth.createUserWithEmailAndPassword(
            emailInput.value,
            passwordInput.value
        );
        alert("Usuario registrado");
    } catch (err) {
        alert("Error: " + err.message);
    }
});

// Login
loginBtn.addEventListener("click", async () => {
    try {
        await auth.signInWithEmailAndPassword(
            emailInput.value,
            passwordInput.value
        );
        alert("Sesión iniciada");
    } catch (err) {
        alert("Error: " + err.message);
    }
});

// Logout
logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
});

// Detectar usuario
auth.onAuthStateChanged((user) => {
    if (user) {
        authSection.style.display = "none";
        appMain.style.display = "block";
    } else {
        authSection.style.display = "block";
        appMain.style.display = "none";
    }
});

// ----------------------
// CATALOGO
// ----------------------

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

// ----------------------
// LISTA POR USUARIO
// ----------------------

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
    currentDateTitle.textContent = `Lista para el ${date}`;
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

// ----------------------
// DOM
// ----------------------

const dateInput = document.getElementById("dateInput");
const loadListBtn = document.getElementById("loadListBtn");
const addItemBtn = document.getElementById("addItemBtn");
const saveListBtn = document.getElementById("saveListBtn");
const itemsContainer = document.getElementById("itemsContainer");
const currentDateTitle = document.getElementById("currentDateTitle");

loadListBtn.addEventListener("click", async () => {
    if (!dateInput.value) return alert("Selecciona una fecha");
    await loadCatalog();
    await loadList(dateInput.value);
});

addItemBtn.addEventListener("click", () => {
    if (!currentDate) return alert("Primero carga una lista");
    currentItems.push({ name: catalog[0] || "", quantity: 1 });
    renderList();
    syncList();
});

saveListBtn.addEventListener("click", async () => {
    if (!currentDate) return alert("No hay lista cargada");
    await saveList(currentDate);
    alert("Lista guardada");
});

function renderList() {
    itemsContainer.innerHTML = "";

    currentItems.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "item-row";

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

        const customInput = document.createElement("input");
        customInput.type = "text";
        customInput.placeholder = "Artículo nuevo";
        customInput.style.display = "none";

        const qty = document.createElement("input");
        qty.type = "number";
        qty.min = "1";
        qty.value = item.quantity;

        const del = document.createElement("button");
        del.textContent = "Eliminar";

        if (catalog.includes(item.name)) {
            select.value = item.name;
        } else {
            select.value = "__custom__";
            customInput.value = item.name;
            customInput.style.display = "block";
        }

        select.addEventListener("change", async () => {
            if (select.value === "__custom__") {
                customInput.style.display = "block";
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

        qty.addEventListener("input", () => {
            currentItems[index].quantity = parseInt(qty.value) || 1;
            syncList();
        });

        del.addEventListener("click", () => {
            currentItems.splice(index, 1);
            renderList();
            syncList();
        });

        row.appendChild(select);
        row.appendChild(qty);
        row.appendChild(del);
        row.appendChild(customInput);

        itemsContainer.appendChild(row);
    });
}

function updateAllSelectOptions() {
    const rows = itemsContainer.querySelectorAll(".item-row");
    rows.forEach((row, index) => {
        const select = row.querySelector("select");
        const currentValue = currentItems[index].name;

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
        } else {
            select.value = "__custom__";
        }
    });
}

// Cargar catálogo al inicio
loadCatalog();

document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Config --- (Sin cambios)
    const firebaseConfig = {
      apiKey: "AIzaSyAGLOrAVlbGHxxA2CWJsMOVyxPPsICQBVA", // TU API KEY
      authDomain: "lamesashopweb.firebaseapp.com",
      databaseURL: "https://lamesashopweb-default-rtdb.firebaseio.com",
      projectId: "lamesashopweb",
      storageBucket: "lamesashopweb.firebasestorage.app",
      messagingSenderId: "445763500979",
      appId: "1:445763500979:web:5c4dfa7c402b3a75f069c6",
      measurementId: "G-KM4WBQPN0X"
    };

    // --- Initialize Firebase ---
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) {
        console.error("Error inicializando Firebase:", e);
        // Podrías mostrar un mensaje de error más amigable al usuario aquí
        document.getElementById('app-loader').innerHTML = '<p style="color:red;">Error al conectar con el servidor. Por favor, recarga la página.</p>';
        return; // Detener la ejecución si Firebase no se inicializa
    }
    
    const auth = firebase.auth();
    const db = firebase.database();

    // --- DOM Elements --- (Sin cambios en las declaraciones)
    const body = document.body;
    const appLoader = document.getElementById('app-loader');
    const appContainer = document.getElementById('app-container');
    const loginScreen = document.getElementById('login-screen');
    const mainAppScreen = document.getElementById('main-app-screen');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutButton = document.getElementById('logout-button');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const copyrightYearSpan = document.getElementById('copyright-year');
    const productListContainer = document.getElementById('product-list-container');
    const categoryTabsContainer = document.querySelector('.category-tabs');
    const showAddProductModalButton = document.getElementById('show-add-product-modal-button');
    const productModal = document.getElementById('product-modal');
    const productModalContent = productModal.querySelector('.modal-content');
    const closeProductModalButton = productModal.querySelector('.close-button');
    const productForm = document.getElementById('product-form');
    const modalTitle = document.getElementById('modal-title');
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productCategorySelect = document.getElementById('product-category');
    const subcategoryGroup = document.getElementById('subcategory-group');
    const productSubcategorySelect = document.getElementById('product-subcategory');
    const productInitialStockInput = document.getElementById('product-initial-stock');
    const productInitialStockGroup = document.getElementById('product-initial-stock-group');
    const productImageNameInput = document.getElementById('product-image-name');

    // --- Constants --- (Sin cambios)
    const DEFAULT_IMAGE_URL = 'default-product.png';
    const PRODUCT_IMAGE_FOLDER = 'productos/';
    const CATEGORIES_CONFIG = {
        "ARMAS": { name: "Armas", subcategories: ["PISTOLAS", "SUBFUSILES", "FUSILES", "ESCOPETAS"] },
        "DROGAS": { name: "Drogas", subcategories: [] },
        "CARGADORES": { name: "Cargadores", subcategories: [] },
        "PLANOS": { name: "Planos", subcategories: [] },
        "QUIMICOS": { name: "Químicos", subcategories: [] }
    };
    const CATEGORY_ORDER = Object.keys(CATEGORIES_CONFIG);

    // --- App State --- (Sin cambios)
    let productsData = {};
    let activeCategory = CATEGORY_ORDER[0];

    // --- SLUGIFY --- (Sin cambios)
    function slugify(text) {
        if (!text) return '';
        return text.toString().toLowerCase()
            .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_').replace(/[^\w-]+/g, '')
            .replace(/--+/g, '_').replace(/^-+/, '').replace(/-+$/, '');
    }

    // --- INITIAL APP SETUP ---
    function initializeAppUI() {
        console.log("initializeAppUI called");
        // Set copyright year
        if (copyrightYearSpan) {
            copyrightYearSpan.textContent = new Date().getFullYear();
        }

        // Apply saved theme or default to dark
        const savedTheme = localStorage.getItem('theme') || 'dark'; 
        applyTheme(savedTheme);

        // Theme toggle listener
        themeToggleButton.addEventListener('click', () => {
            const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });

        // Modal listeners (solo si los elementos existen para evitar errores si no hay user)
        if (showAddProductModalButton) showAddProductModalButton.addEventListener('click', () => openModal('add'));
        if (closeProductModalButton) closeProductModalButton.addEventListener('click', () => productModal.classList.remove('active'));
        
        window.addEventListener('click', (event) => { // Este es seguro
            if (event.target === productModal) productModal.classList.remove('active');
        });

        if (productCategorySelect) productCategorySelect.addEventListener('change', handleCategoryChangeForModal);
        if (productForm) productForm.addEventListener('submit', handleProductFormSubmit);
        
        // Login form listener (seguro)
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (logoutButton) logoutButton.addEventListener('click', () => {
            auth.signOut().catch(error => console.error("Error al cerrar sesión:", error));
        });
    }
    
    // --- THEME --- (Sin cambios)
    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            body.classList.remove('dark-mode');
            themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    // --- AUTHENTICATION ---
    function handleAuthStateChange(user) {
        console.log("Auth state changed. User:", user ? user.email : "null");
        
        // Hide loader and show app container AFTER auth state is known
        if (appLoader) appLoader.classList.add('hidden');
        if (appContainer) appContainer.style.display = 'block';

        if (user) {
            if (loginScreen) loginScreen.classList.remove('active');
            if (mainAppScreen) mainAppScreen.classList.add('active');
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            setupCategoryTabs();
            loadProducts();
        } else {
            if (mainAppScreen) mainAppScreen.classList.remove('active');
            if (loginScreen) loginScreen.classList.add('active');
            if (userEmailDisplay) userEmailDisplay.textContent = '';
            if (productListContainer) productListContainer.innerHTML = '';
            if (categoryTabsContainer) categoryTabsContainer.innerHTML = '';
        }
    }

    function handleLogin(e) {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (!emailInput || !passwordInput) return;

        const email = emailInput.value;
        const password = passwordInput.value;
        if (loginError) loginError.textContent = '';
        
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                console.error("Login error:", error);
                if (loginError) loginError.textContent = "Error: " + error.message;
            });
    }

    // --- CATEGORY TABS --- (Sin cambios)
    function setupCategoryTabs() {
        if (!categoryTabsContainer) return;
        categoryTabsContainer.innerHTML = '';
        CATEGORY_ORDER.forEach(catKey => {
            const tab = document.createElement('button');
            tab.className = 'tab-button';
            tab.textContent = CATEGORIES_CONFIG[catKey].name;
            tab.dataset.categoryKey = catKey;
            if (catKey === activeCategory) tab.classList.add('active');
            
            tab.addEventListener('click', () => {
                activeCategory = catKey;
                document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderProducts();
            });
            categoryTabsContainer.appendChild(tab);
        });
    }

    // --- MODAL HANDLING (ADD/EDIT) --- (Sin cambios en la lógica interna, pero wrappers si los elementos no existen)
    function openModal(mode = 'add', productData = null) {
        if (!productForm || !productIdInput || !modalTitle || !productModalContent || !productInitialStockGroup || !productModal) return;
        
        productForm.reset();
        productIdInput.value = '';
        if (subcategoryGroup) subcategoryGroup.style.display = 'none';
        if (productSubcategorySelect) productSubcategorySelect.required = false;

        if (mode === 'edit' && productData) {
            modalTitle.textContent = 'Editar Producto';
            productModalContent.classList.add('editing-mode');
            if (productInitialStockGroup) productInitialStockGroup.style.display = 'none';

            productIdInput.value = productData.id;
            if (productNameInput) productNameInput.value = productData.name;
            if (productCategorySelect) productCategorySelect.value = productData.category;
            if (productData.category === 'ARMAS' && subcategoryGroup && productSubcategorySelect) {
                subcategoryGroup.style.display = 'block';
                productSubcategorySelect.required = true;
                productSubcategorySelect.value = productData.subcategory || '';
            }
            if (productImageNameInput) productImageNameInput.value = productData.imageName || '';
        } else {
            modalTitle.textContent = 'Añadir Nuevo Producto';
            productModalContent.classList.remove('editing-mode');
            if (productInitialStockGroup) productInitialStockGroup.style.display = 'block';
            if (productInitialStockInput) productInitialStockInput.value = '0';
        }
        productModal.classList.add('active');
    }

    function handleCategoryChangeForModal() {
        if (!productCategorySelect || !subcategoryGroup || !productSubcategorySelect) return;
        if (productCategorySelect.value === 'ARMAS') {
            subcategoryGroup.style.display = 'block';
            productSubcategorySelect.required = true;
        } else {
            subcategoryGroup.style.display = 'none';
            productSubcategorySelect.required = false;
            productSubcategorySelect.value = '';
        }
    }

    function handleProductFormSubmit(e) {
        e.preventDefault();
        if (!productIdInput || !productNameInput || !productCategorySelect || !productImageNameInput || !productModal) return;

        const id = productIdInput.value;
        const name = productNameInput.value.trim();
        const category = productCategorySelect.value;
        const subcategory = (category === 'ARMAS' && productSubcategorySelect) ? productSubcategorySelect.value : '';
        const imageName = productImageNameInput.value.trim();

        if (!name || !category || (category === 'ARMAS' && !subcategory)) {
            alert("Completa Nombre, Categoría (y Subcategoría para Armas).");
            return;
        }

        const productPayload = { name, category, subcategory, imageName };

        if (id) { // Edit
            const updates = {};
            updates[`/products/${id}/name`] = name;
            updates[`/products/${id}/category`] = category;
            updates[`/products/${id}/subcategory`] = subcategory;
            updates[`/products/${id}/imageName`] = imageName;
            
            db.ref().update(updates)
                .then(() => productModal.classList.remove('active'))
                .catch(error => console.error("Error actualizando: ", error));
        } else { // Add
            if (productInitialStockInput) {
                productPayload.stock = parseInt(productInitialStockInput.value) || 0;
            } else {
                productPayload.stock = 0; // Default si el input no existe por alguna razón
            }
            const newProductRef = db.ref('products').push();
            productPayload.id = newProductRef.key;

            newProductRef.set(productPayload)
                .then(() => productModal.classList.remove('active'))
                .catch(error => console.error("Error añadiendo: ", error));
        }
    }
    
    // --- PRODUCT LOGIC --- (renderProducts, createProductCard, updateStock, deleteProduct sin cambios mayores, solo verificar que los contenedores existan antes de manipularlos)
    function loadProducts() {
        const productsRef = db.ref('products');
        productsRef.on('value', (snapshot) => {
            productsData = snapshot.val() || {};
            renderProducts();
        }, (error) => {
            console.error("Error al cargar productos:", error);
            if (productListContainer) productListContainer.innerHTML = "<p class='error-message'>Error al cargar productos.</p>";
        });
    }

    function renderProducts() {
        if (!productListContainer || !CATEGORIES_CONFIG[activeCategory]) return;
        productListContainer.innerHTML = '';
        const productGrid = document.createElement('div');
        productGrid.className = 'product-grid';
        let hasProductsInView = false;

        for (const id in productsData) {
            const product = productsData[id];
            if (product.category === activeCategory) {
                hasProductsInView = true;
                productGrid.appendChild(createProductCard(product));
            }
        }
        
        if (hasProductsInView) {
            productListContainer.appendChild(productGrid);
        } else {
            productListContainer.innerHTML = `<p>No hay productos en "${CATEGORIES_CONFIG[activeCategory].name}".</p>`;
        }
    }

    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.id = product.id;

        let imageName = product.imageName && product.imageName.trim() !== ''
            ? (product.imageName.includes('.') ? product.imageName : `${product.imageName}.png`)
            : `${slugify(product.name)}.png`;
        const imageUrl = `${PRODUCT_IMAGE_FOLDER}${imageName}`;
        
        const categoryDisplayName = CATEGORIES_CONFIG[product.category]?.name || product.category;
        const subCategoryDisplayName = product.subcategory ? ` / ${product.subcategory}` : '';

        card.innerHTML = `
            <img src="${imageUrl}" alt="${product.name}" onerror="this.onerror=null; this.src='${DEFAULT_IMAGE_URL}';">
            <div class="product-info">
                <h4>${product.name}</h4>
                <span class="product-category-display">${categoryDisplayName}${subCategoryDisplayName}</span>
                <p class="stock-display">Stock: <strong id="stock-${product.id}">${product.stock || 0}</strong></p>
                <div class="stock-controls">
                    <button class="btn-icon-small stock-adjust" data-action="remove" title="Restar cantidad"><i class="fas fa-minus"></i></button>
                    <input type="number" class="bulk-stock-amount" value="1" min="1" aria-label="Cantidad a modificar">
                    <button class="btn-icon-small stock-adjust" data-action="add" title="Sumar cantidad"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn btn-secondary btn-edit-product"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn btn-danger btn-delete-product"><i class="fas fa-trash-alt"></i> Eliminar</button>
            </div>
        `;

        const bulkAmountInput = card.querySelector('.bulk-stock-amount');
        card.querySelectorAll('.stock-adjust').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                let amount = parseInt(bulkAmountInput.value);

                if (isNaN(amount) || amount <= 0) {
                    alert("Por favor, introduce una cantidad positiva válida.");
                    bulkAmountInput.value = "1";
                    return;
                }
                if (action === 'remove') amount = -amount;
                
                updateStock(product.id, amount);
            });
        });
        
        card.querySelector('.btn-edit-product').addEventListener('click', () => openModal('edit', product));
        card.querySelector('.btn-delete-product').addEventListener('click', () => {
            if (confirm(`¿Seguro que quieres eliminar "${product.name}"?`)) {
                deleteProduct(product.id);
            }
        });
        return card;
    }

    function updateStock(productId, change) {
        if (isNaN(change)) return;
        const productRef = db.ref(`products/${productId}/stock`);
        productRef.transaction(currentStock => {
            const newStock = (currentStock || 0) + change;
            return Math.max(0, newStock);
        }).catch(error => console.error("Error actualizando stock:", error));
    }

    function deleteProduct(productId) {
        db.ref(`products/${productId}`).remove()
            .catch(error => console.error("Error eliminando producto:", error));
    }

    // --- Start the app logic ---
    // 1. Initialize UI elements (theme, copyright) that don't depend on auth.
    initializeAppUI();
    // 2. Firebase auth will then trigger handleAuthStateChange.
    //    No need to call it explicitly here, `onAuthStateChanged` handles the initial check.
});

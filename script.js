document.addEventListener('DOMContentLoaded', () => {
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

    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) {
        console.error("Error inicializando Firebase:", e);
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.innerHTML = '<p style="color:red; text-align:center; padding:20px;">Error al conectar con el servidor.<br>Por favor, recarga la página.</p>';
        }
        return; 
    }
    
    const auth = firebase.auth();
    const db = firebase.database();

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
    const productPriceInput = document.getElementById('product-price');
    const armaPricesGroup = document.getElementById('arma-prices-group');
    const productPriceLoadedInput = document.getElementById('product-price-loaded');
    const productPriceUnloadedInput = document.getElementById('product-price-unloaded');
    const totalInventoryValueDisplay = document.getElementById('total-inventory-value');


    const DEFAULT_IMAGE_URL = 'default-product.png'; // Make sure this image exists or provide a valid URL
    const PRODUCT_IMAGE_FOLDER = 'productos/';
    const CATEGORIES_CONFIG = {
        "ARMAS": { name: "Armas", subcategories: ["PISTOLAS", "SUBFUSILES", "FUSILES", "ESCOPETAS"] },
        "DROGAS": { name: "Drogas", subcategories: [] },
        "CARGADORES": { name: "Cargadores", subcategories: [] },
        "PLANOS": { name: "Planos", subcategories: [] },
        "QUIMICOS": { name: "Químicos", subcategories: [] }
    };
    const CATEGORY_ORDER = Object.keys(CATEGORIES_CONFIG);

    let productsData = {};
    let activeCategory = CATEGORY_ORDER[0];

    function slugify(text) {
        if (!text) return '';
        return text.toString().toLowerCase()
            .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_').replace(/[^\w-]+/g, '')
            .replace(/--+/g, '_').replace(/^-+/, '').replace(/-+$/, '');
    }

    function initializeAppUI() {
        if (copyrightYearSpan) {
            copyrightYearSpan.textContent = new Date().getFullYear();
        }

        const savedTheme = localStorage.getItem('theme') || 'dark'; 
        applyTheme(savedTheme);

        if (themeToggleButton) {
            themeToggleButton.addEventListener('click', () => {
                const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
                localStorage.setItem('theme', newTheme);
                applyTheme(newTheme);
            });
        }
        
        if (showAddProductModalButton) showAddProductModalButton.addEventListener('click', () => openModal('add'));
        if (closeProductModalButton) closeProductModalButton.addEventListener('click', () => productModal.classList.remove('active'));
        
        window.addEventListener('click', (event) => {
            if (event.target === productModal) productModal.classList.remove('active');
        });

        if (productCategorySelect) productCategorySelect.addEventListener('change', handleCategoryChangeForModal);
        if (productForm) productForm.addEventListener('submit', handleProductFormSubmit);
        
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (logoutButton) logoutButton.addEventListener('click', () => {
            auth.signOut().catch(error => console.error("Error al cerrar sesión:", error));
        });
    }
    
    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            if (themeToggleButton) themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            body.classList.remove('dark-mode');
            if (themeToggleButton) themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    function handleAuthStateChange(user) {
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
            if (totalInventoryValueDisplay) totalInventoryValueDisplay.textContent = '$0.00';
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

    function openModal(mode = 'add', productData = null) {
        if (!productForm || !productIdInput || !modalTitle || !productModalContent || !productModal || !productPriceInput || !productPriceLoadedInput || !productPriceUnloadedInput) return;
        
        productForm.reset();
        productIdInput.value = '';
        productPriceInput.value = '0';
        productPriceLoadedInput.value = '0';
        productPriceUnloadedInput.value = '0';

        handleCategoryChangeForModal(); // Initial setup for price fields visibility

        if (mode === 'edit' && productData) {
            modalTitle.textContent = 'Editar Producto';
            productModalContent.classList.add('editing-mode');
            if (productInitialStockGroup) productInitialStockGroup.style.display = 'none';

            productIdInput.value = productData.id;
            if (productNameInput) productNameInput.value = productData.name;
            if (productCategorySelect) productCategorySelect.value = productData.category;
            
            handleCategoryChangeForModal(); // Update visibility based on loaded category

            if (productData.category === 'ARMAS' && subcategoryGroup && productSubcategorySelect) {
                productSubcategorySelect.value = productData.subcategory || '';
            }
            if (productImageNameInput) productImageNameInput.value = productData.imageName || '';
            productPriceInput.value = productData.price || '0';
            productPriceLoadedInput.value = productData.priceLoaded || '0';
            productPriceUnloadedInput.value = productData.priceUnloaded || '0';

        } else {
            modalTitle.textContent = 'Añadir Nuevo Producto';
            productModalContent.classList.remove('editing-mode');
            if (productInitialStockGroup) productInitialStockGroup.style.display = 'block';
            if (productInitialStockInput) productInitialStockInput.value = '0';
        }
        productModal.classList.add('active');
    }

    function handleCategoryChangeForModal() {
        if (!productCategorySelect || !subcategoryGroup || !productSubcategorySelect || !armaPricesGroup || !productPriceInput) return;
        const isArmas = productCategorySelect.value === 'ARMAS';

        if (isArmas) {
            subcategoryGroup.style.display = 'block';
            productSubcategorySelect.required = true;
            armaPricesGroup.style.display = 'block';
            productPriceInput.parentElement.style.display = 'none'; // Hide base price
            if (productPriceLoadedInput) productPriceLoadedInput.required = true;
            if (productPriceUnloadedInput) productPriceUnloadedInput.required = true;
        } else {
            subcategoryGroup.style.display = 'none';
            productSubcategorySelect.required = false;
            productSubcategorySelect.value = '';
            armaPricesGroup.style.display = 'none';
            productPriceInput.parentElement.style.display = 'block'; // Show base price
            if (productPriceLoadedInput) productPriceLoadedInput.required = false;
            if (productPriceUnloadedInput) productPriceUnloadedInput.required = false;
        }
    }

    function handleProductFormSubmit(e) {
        e.preventDefault();
        if (!productIdInput || !productNameInput || !productCategorySelect || !productImageNameInput || !productModal || !productPriceInput || !productPriceLoadedInput || !productPriceUnloadedInput) return;

        const id = productIdInput.value;
        const name = productNameInput.value.trim();
        const category = productCategorySelect.value;
        const subcategory = (category === 'ARMAS' && productSubcategorySelect) ? productSubcategorySelect.value : '';
        const imageName = productImageNameInput.value.trim();
        
        let price = parseFloat(productPriceInput.value) || 0;
        let priceLoaded = 0;
        let priceUnloaded = 0;

        if (category === 'ARMAS') {
            priceLoaded = parseFloat(productPriceLoadedInput.value) || 0;
            priceUnloaded = parseFloat(productPriceUnloadedInput.value) || 0;
            price = 0; // Base price not used for ARMAS
             if (!subcategory) {
                alert("Para Armas, la subcategoría es obligatoria.");
                return;
            }
        } else {
            if (!price && price !==0) { // Allow 0 price
                alert("Por favor, introduce un precio base válido.");
                return;
            }
        }


        if (!name || !category ) {
            alert("Completa Nombre y Categoría.");
            return;
        }

        const productPayload = { name, category, subcategory, imageName, price, priceLoaded, priceUnloaded };

        if (id) { // Editing existing product
            const updates = {};
            updates[`/products/${id}/name`] = name;
            updates[`/products/${id}/category`] = category;
            updates[`/products/${id}/subcategory`] = subcategory;
            updates[`/products/${id}/imageName`] = imageName;
            updates[`/products/${id}/price`] = price;
            updates[`/products/${id}/priceLoaded`] = priceLoaded;
            updates[`/products/${id}/priceUnloaded`] = priceUnloaded;
            
            db.ref().update(updates)
                .then(() => productModal.classList.remove('active'))
                .catch(error => console.error("Error actualizando: ", error));
        } else { // Adding new product
            if (productInitialStockInput) {
                productPayload.stock = parseInt(productInitialStockInput.value) || 0;
            } else {
                productPayload.stock = 0;
            }
            const newProductRef = db.ref('products').push();
            productPayload.id = newProductRef.key;

            newProductRef.set(productPayload)
                .then(() => productModal.classList.remove('active'))
                .catch(error => console.error("Error añadiendo: ", error));
        }
    }
    
    function loadProducts() {
        const productsRef = db.ref('products');
        productsRef.on('value', (snapshot) => {
            productsData = snapshot.val() || {};
            renderProducts();
            calculateTotalInventoryValue();
        }, (error) => {
            console.error("Error al cargar productos:", error);
            if (productListContainer) productListContainer.innerHTML = "<p class='error-message'>Error al cargar productos.</p>";
        });
    }
    
    function calculateTotalInventoryValue() {
        let totalValue = 0;
        for (const id in productsData) {
            const product = productsData[id];
            const stock = product.stock || 0;
            let itemPrice = 0;

            if (product.category === 'ARMAS') {
                itemPrice = parseFloat(product.priceUnloaded) || 0;
            } else {
                itemPrice = parseFloat(product.price) || 0;
            }
            totalValue += stock * itemPrice;
        }
        if (totalInventoryValueDisplay) {
            totalInventoryValueDisplay.textContent = `$${totalValue.toFixed(2)}`;
        }
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
        
        let displayCategoryText = '';
        if (product.category === 'ARMAS' && product.subcategory) {
            displayCategoryText = product.subcategory.toUpperCase();
        } else {
            displayCategoryText = CATEGORIES_CONFIG[product.category]?.name || product.category;
        }

        let priceInfoHTML = '';
        let stockValue = 0;
        const currentStock = product.stock || 0;

        if (product.category === 'ARMAS') {
            const priceUnloaded = parseFloat(product.priceUnloaded) || 0;
            const priceLoaded = parseFloat(product.priceLoaded) || 0;
            priceInfoHTML = `
                <p>Descargada: <strong>$${priceUnloaded.toFixed(2)}</strong></p>
                <p>Cargada: <strong>$${priceLoaded.toFixed(2)}</strong></p>
            `;
            stockValue = currentStock * priceUnloaded; // Using unloaded price for stock value of armas
        } else {
            const price = parseFloat(product.price) || 0;
            priceInfoHTML = `<p>Precio: <strong>$${price.toFixed(2)}</strong></p>`;
            stockValue = currentStock * price;
        }


        card.innerHTML = `
            <img src="${imageUrl}" alt="${product.name}" onerror="this.onerror=null; this.src='${DEFAULT_IMAGE_URL}';">
            <div class="product-info">
                <h4>${product.name}</h4>
                <span class="product-category-display">${displayCategoryText}</span>
                <div class="product-price-info">
                    ${priceInfoHTML}
                </div>
                <p class="product-stock-value">Valor Stock: <strong id="stock-value-${product.id}">$${stockValue.toFixed(2)}</strong></p>
                <p class="stock-display">Stock: <strong id="stock-${product.id}">${currentStock}</strong></p>
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
            return Math.max(0, newStock); // Ensure stock doesn't go below 0
        }).then(transactionResult => {
            if (transactionResult.committed) {
                const updatedStock = transactionResult.snapshot.val();
                const product = productsData[productId];
                if (product) {
                    let itemPrice = 0;
                    if (product.category === 'ARMAS') {
                        itemPrice = parseFloat(product.priceUnloaded) || 0;
                    } else {
                        itemPrice = parseFloat(product.price) || 0;
                    }
                    const newStockValue = updatedStock * itemPrice;
                    
                    const stockValueElement = document.getElementById(`stock-value-${productId}`);
                    if (stockValueElement) {
                        stockValueElement.textContent = `$${newStockValue.toFixed(2)}`;
                    }
                }
                calculateTotalInventoryValue(); // Recalculate overall total
            }
        }).catch(error => console.error("Error actualizando stock:", error));
    }


    function deleteProduct(productId) {
        db.ref(`products/${productId}`).remove()
            .catch(error => console.error("Error eliminando producto:", error));
    }
    
    initializeAppUI();
    auth.onAuthStateChanged(handleAuthStateChange);
});

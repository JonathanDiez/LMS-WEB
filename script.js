document.addEventListener('DOMContentLoaded', () => {
    // Import the functions you need from the SDKs you need
    // import { initializeApp } from "firebase/app";  // Estos imports no son necesarios porque usamos el SDK global
    // import { getAnalytics } from "firebase/analytics";

    // Your web app's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
      apiKey: "AIzaSyAGLOrAVlbGHxxA2CWJsMOVyxPPsICQBVA",
      authDomain: "lamesashopweb.firebaseapp.com",
      databaseURL: "https://lamesashopweb-default-rtdb.firebaseio.com",
      projectId: "lamesashopweb",
      storageBucket: "lamesashopweb.firebasestorage.app",
      messagingSenderId: "445763500979",
      appId: "1:445763500979:web:5c4dfa7c402b3a75f069c6",
      measurementId: "G-KM4WBQPN0X"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig); // El objeto firebase está disponible globalmente con los SDKs que importamos en el HTML
    // const app = initializeApp(firebaseConfig);  // Inicializamos usando el objeto firebase global
    // const analytics = getAnalytics(app);  // Esto no lo estamos usando

    const auth = firebase.auth();
    const db = firebase.database();

    // Elementos del DOM
    const loginScreen = document.getElementById('login-screen');
    const mainAppScreen = document.getElementById('main-app-screen');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutButton = document.getElementById('logout-button');

    const productListContainer = document.getElementById('product-list-container');
    const showAddProductModalButton = document.getElementById('show-add-product-modal-button');
    const addProductModal = document.getElementById('add-product-modal');
    const closeProductModalButton = addProductModal.querySelector('.close-button');
    const addProductForm = document.getElementById('add-product-form');
    const productCategorySelect = document.getElementById('product-category');
    const subcategoryGroup = document.getElementById('subcategory-group');
    const productSubcategorySelect = document.getElementById('product-subcategory');

    const DEFAULT_IMAGE_URL = 'default-product.png'; // Nombre de tu imagen por defecto

    // Estado de la aplicación
    let productsData = {};
    const categoriesConfig = {
        "ARMAS": ["PISTOLAS", "SUBFUSILES", "FUSILES", "ESCOPETAS"],
        "DROGAS": [],
        "CARGADORES": [],
        "PLANOS": [],
        "QUIMICOS": []
    };


    // --- AUTENTICACIÓN ---
    auth.onAuthStateChanged(user => {
        if (user) {
            loginScreen.classList.remove('active');
            mainAppScreen.classList.add('active');
            userEmailDisplay.textContent = user.email;
            loadProducts();
        } else {
            mainAppScreen.classList.remove('active');
            loginScreen.classList.add('active');
            userEmailDisplay.textContent = '';
            productListContainer.innerHTML = ''; // Limpiar productos si cierra sesión
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        loginError.textContent = '';

        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                console.error("Error de inicio de sesión:", error);
                loginError.textContent = "Error: " + error.message;
            });
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut();
    });

    // --- MODAL DE AÑADIR PRODUCTO ---
    showAddProductModalButton.addEventListener('click', () => {
        addProductForm.reset();
        subcategoryGroup.style.display = 'none'; // Ocultar subcategorías por defecto
        addProductModal.classList.add('active');
    });

    closeProductModalButton.addEventListener('click', () => {
        addProductModal.classList.remove('active');
    });

    window.addEventListener('click', (event) => {
        if (event.target === addProductModal) {
            addProductModal.classList.remove('active');
        }
    });

    productCategorySelect.addEventListener('change', (e) => {
        if (e.target.value === 'ARMAS') {
            subcategoryGroup.style.display = 'block';
            productSubcategorySelect.required = true;
        } else {
            subcategoryGroup.style.display = 'none';
            productSubcategorySelect.required = false;
            productSubcategorySelect.value = '';
        }
    });
    
    addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('product-name').value;
        const category = productCategorySelect.value;
        const subcategory = (category === 'ARMAS') ? productSubcategorySelect.value : '';
        const stock = parseInt(document.getElementById('product-stock').value);
        let imageUrl = document.getElementById('product-image-url').value.trim();

        if (!imageUrl) {
            imageUrl = DEFAULT_IMAGE_URL;
        }

        if (!category || (category === 'ARMAS' && !subcategory)) {
            alert("Por favor, selecciona categoría y subcategoría si es necesario.");
            return;
        }

        const newProductRef = db.ref('products').push();
        newProductRef.set({
            id: newProductRef.key, // Guardamos el ID generado por Firebase
            name: name,
            category: category,
            subcategory: subcategory,
            stock: stock,
            imageUrl: imageUrl
        })
        .then(() => {
            addProductModal.classList.remove('active');
            // No es necesario llamar a loadProducts() aquí, Firebase 'on value' lo hará.
        })
        .catch(error => console.error("Error añadiendo producto: ", error));
    });


    // --- LÓGICA DE PRODUCTOS ---
    function loadProducts() {
        const productsRef = db.ref('products');
        productsRef.on('value', (snapshot) => {
            productsData = snapshot.val() || {};
            renderProducts();
        });
    }

    function renderProducts() {
        productListContainer.innerHTML = ''; // Limpiar lista actual

        // Agrupar productos por categoría y subcategoría
        const groupedProducts = {};
        for (const id in productsData) {
            const product = productsData[id];
            if (!groupedProducts[product.category]) {
                groupedProducts[product.category] = {};
            }
            if (product.subcategory) {
                if (!groupedProducts[product.category][product.subcategory]) {
                    groupedProducts[product.category][product.subcategory] = [];
                }
                groupedProducts[product.category][product.subcategory].push(product);
            } else {
                if (!groupedProducts[product.category]['_main']) { // Usar '_main' para productos sin subcategoría
                    groupedProducts[product.category]['_main'] = [];
                }
                groupedProducts[product.category]['_main'].push(product);
            }
        }
        
        // Orden de las categorías principales
        const categoryOrder = ["ARMAS", "DROGAS", "CARGADORES", "PLANOS", "QUIMICOS"];

        categoryOrder.forEach(catName => {
            if (groupedProducts[catName]) {
                const categoryData = groupedProducts[catName];
                const categorySection = document.createElement('div');
                categorySection.className = 'category-section';
                categorySection.innerHTML = `<h2>${catName.replace(/_/g, ' ').toUpperCase()}</h2>`;
                
                if (catName === "ARMAS") { // Manejo especial para ARMAS con subcategorías
                    categoriesConfig["ARMAS"].forEach(subCatName => {
                        if (categoryData[subCatName] && categoryData[subCatName].length > 0) {
                            const subCategoryTitle = document.createElement('h3');
                            subCategoryTitle.textContent = subCatName.replace(/_/g, ' ').toUpperCase();
                            categorySection.appendChild(subCategoryTitle);
                            
                            const productGrid = document.createElement('div');
                            productGrid.className = 'product-grid';
                            categoryData[subCatName].forEach(product => {
                                productGrid.appendChild(createProductCard(product));
                            });
                            categorySection.appendChild(productGrid);
                        }
                    });
                } else { // Para otras categorías sin subcategorías explícitas
                     if (categoryData['_main'] && categoryData['_main'].length > 0) {
                        const productGrid = document.createElement('div');
                        productGrid.className = 'product-grid';
                        categoryData['_main'].forEach(product => {
                            productGrid.appendChild(createProductCard(product));
                        });
                        categorySection.appendChild(productGrid);
                    }
                }
                if (categorySection.querySelector('.product-grid')) { // Solo añadir si tiene productos
                    productListContainer.appendChild(categorySection);
                }
            }
        });
         if (productListContainer.children.length === 0) {
            productListContainer.innerHTML = "<p>No hay productos en el inventario. ¡Añade algunos!</p>";
        }
    }
    
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.id = product.id;

        card.innerHTML = `
            <img src="${product.imageUrl || DEFAULT_IMAGE_URL}" alt="${product.name}" onerror="this.src='${DEFAULT_IMAGE_URL}'">
            <div class="product-info">
                <h4>${product.name}</h4>
                <p>Stock: <strong id="stock-${product.id}">${product.stock}</strong></p>
                <div class="stock-controls">
                    <button class="btn btn-small btn-primary stock-adjust" data-action="add" data-amount="1"><i class="fas fa-plus"></i></button>
                    <button class="btn btn-small btn-danger stock-adjust" data-action="remove" data-amount="1"><i class="fas fa-minus"></i></button>
                    <input type="number" class="bulk-amount" value="1" min="1">
                    <button class="btn btn-small btn-success stock-adjust" data-action="add-bulk"><i class="fas fa-cart-plus"></i> Añadir</button>
                    <button class="btn btn-small btn-warning stock-adjust" data-action="remove-bulk"><i class="fas fa-cart-arrow-down"></i> Quitar</button>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn btn-danger delete-product"><i class="fas fa-trash-alt"></i> Eliminar Producto</button>
            </div>
        `;

        // Event listeners para los controles de stock y eliminación
        card.querySelectorAll('.stock-adjust').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = button.dataset.action;
                let amount = parseInt(button.dataset.amount) || 0;
                
                if (action === 'add-bulk' || action === 'remove-bulk') {
                    const bulkInput = card.querySelector('.bulk-amount');
                    amount = parseInt(bulkInput.value);
                    if (isNaN(amount) || amount <= 0) {
                        alert("Por favor, introduce una cantidad válida.");
                        return;
                    }
                }
                updateStock(product.id, action.includes('add') ? amount : -amount);
            });
        });
        
        card.querySelector('.delete-product').addEventListener('click', () => {
            if (confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
                deleteProduct(product.id);
            }
        });

        return card;
    }

    function updateStock(productId, change) {
        const productRef = db.ref(`products/${productId}`);
        productRef.transaction(currentData => {
            if (currentData === null) {
                return null; // El producto ya no existe
            }
            const newStock = (currentData.stock || 0) + change;
            currentData.stock = Math.max(0, newStock); // No permitir stock negativo
            return currentData;
        })
        .catch(error => console.error("Error actualizando stock:", error));
        // La UI se actualizará automáticamente por el listener 'on value' en loadProducts
    }

    function deleteProduct(productId) {
        db.ref(`products/${productId}`).remove()
            .catch(error => console.error("Error eliminando producto:", error));
        // La UI se actualizará automáticamente
    }

});

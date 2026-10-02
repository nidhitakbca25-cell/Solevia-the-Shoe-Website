/* =========================================================
   SOLEVIA - FRONTEND + XAMPP/PHP BACKEND CONNECTION
   ========================================================= */

const API = "api.php";

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.querySelector(".nav-links");
if (menuBtn) {
    menuBtn.addEventListener("click", () => navLinks.classList.toggle("show"));
}
document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => navLinks.classList.remove("show"));
});

/* ---------------- SEARCH ---------------- */
const searchBtn = document.getElementById("searchBtn");
const searchBox = document.getElementById("searchBox");
const searchInput = document.getElementById("searchInput");

searchBtn.addEventListener("click", () => {
    searchBox.classList.toggle("show");
    if (searchBox.classList.contains("show")) searchInput.focus();
});

searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();
    document.querySelectorAll(".product-card").forEach(product => {
        const name = product.querySelector("h3").textContent.toLowerCase();
        const type = product.querySelector(".product-type").textContent.toLowerCase();
        product.style.display = (!value || name.includes(value) || type.includes(value)) ? "" : "none";
    });
});

/* ---------------- CATEGORY FILTER ---------------- */
const categoryButtons = document.querySelectorAll(".category-item");
const products = document.querySelectorAll(".product-card");

categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
        categoryButtons.forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        const selected = button.dataset.category;
        products.forEach(product => {
            const show = selected === "all" || product.dataset.category === selected;
            product.style.display = show ? "block" : "none";
            if (show) product.style.animation = "fadeUp 0.5s ease";
        });
    });
});

/* ---------------- API HELPER ---------------- */
async function api(action, data = {}) {
    const response = await fetch(`${API}?action=${encodeURIComponent(action)}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
        credentials: "same-origin"
    });

    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("Server returned an invalid response. Check XAMPP/Apache and PHP.");
    }

    if (!response.ok || result.success === false) {
        throw new Error(result.message || "Something went wrong.");
    }
    return result;
}

/* ---------------- AUTH ---------------- */
const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const authMode = document.getElementById("authMode");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authTitle = document.getElementById("authTitle");
const authLabel = document.getElementById("authLabel");
const authSubtitle = document.getElementById("authSubtitle");
const authSubmit = document.getElementById("authSubmit");
const authMessage = document.getElementById("authMessage");
const switchAuth = document.getElementById("switchAuth");

function openAuth(mode = "login") {
    authMode.value = mode;
    authName.style.display = mode === "signup" ? "block" : "none";
    authName.required = mode === "signup";
    authTitle.textContent = mode === "signup" ? "Create Account" : "Login";
    authLabel.textContent = mode === "signup" ? "JOIN SOLEVIA" : "WELCOME BACK";
    authSubtitle.textContent = mode === "signup"
        ? "Create an account to save your cart and orders."
        : "Login to save your cart and orders.";
    authSubmit.textContent = mode === "signup" ? "Create Account →" : "Login →";
    switchAuth.innerHTML = mode === "signup"
        ? `Already have an account? <button type="button">Login</button>`
        : `Don't have an account? <button type="button">Sign Up</button>`;
    authMessage.textContent = "";
    authForm.reset();
    authMode.value = mode;
    authName.style.display = mode === "signup" ? "block" : "none";
    authName.required = mode === "signup";
    authModal.classList.add("show");
    setTimeout(() => (mode === "signup" ? authName : authEmail).focus(), 100);
}

function closeModal(modal) {
    if (modal) modal.classList.remove("show");
}

document.getElementById("loginBtn").addEventListener("click", () => openAuth("login"));
document.getElementById("signupBtn").addEventListener("click", () => openAuth("signup"));
document.getElementById("closeAuth").addEventListener("click", () => closeModal(authModal));

switchAuth.addEventListener("click", e => {
    if (e.target.tagName === "BUTTON") openAuth(authMode.value === "login" ? "signup" : "login");
});

authForm.addEventListener("submit", async e => {
    e.preventDefault();
    authMessage.className = "form-message";
    authMessage.textContent = "Please wait...";
    const mode = authMode.value;

    try {
        const result = await api(mode === "signup" ? "signup" : "login", {
            name: authName.value.trim(),
            email: authEmail.value.trim(),
            password: authPassword.value
        });
        authMessage.className = "form-message success";
        authMessage.textContent = result.message;
        updateUserUI(result.user);
        await loadCart();
        setTimeout(() => closeModal(authModal), 700);
    } catch (err) {
        authMessage.className = "form-message error";
        authMessage.textContent = err.message;
    }
});

async function checkSession() {
    try {
        const result = await api("session");
        if (result.loggedIn) {
            updateUserUI(result.user);
            await loadCart();
        } else {
            updateUserUI(null);
        }
    } catch (err) {
        console.error(err);
    }
}

function updateUserUI(user) {
    const login = document.getElementById("loginBtn");
    const signup = document.getElementById("signupBtn");
    const userBtn = document.getElementById("userBtn");
    const logout = document.getElementById("logoutBtn");

    if (user) {
        login.style.display = "none";
        signup.style.display = "none";
        userBtn.style.display = "inline-flex";
        logout.style.display = "inline-flex";
        userBtn.textContent = `Hi, ${user.name.split(" ")[0]}`;
        userBtn.title = user.email;
    } else {
        login.style.display = "inline-flex";
        signup.style.display = "inline-flex";
        userBtn.style.display = "none";
        logout.style.display = "none";
    }
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
        await api("logout");
        updateUserUI(null);
        localStorage.removeItem("soleviaGuestCart");
        cartItems = [];
        renderCart();
        alert("You have been logged out.");
    } catch (err) {
        alert(err.message);
    }
});

/* ---------------- CART ---------------- */
let cartItems = [];
const cartBtn = document.getElementById("cartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const closeCart = document.getElementById("closeCart");
const cartContainer = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCounter = document.querySelector(".cart-count");

function productFromCard(card) {
    return {
        product_id: Number(card.dataset.productId),
        name: card.querySelector("h3").textContent.trim(),
        category: card.querySelector(".product-type").textContent.trim(),
        price: parseFloat(card.querySelector("strong").textContent.replace("$", "")),
        image: card.querySelector("img").src
    };
}

function guestCart() {
    try { return JSON.parse(localStorage.getItem("soleviaGuestCart")) || []; }
    catch { return []; }
}

function saveGuestCart() {
    localStorage.setItem("soleviaGuestCart", JSON.stringify(cartItems));
}

async function addToCart(product) {
    try {
        const session = await api("session");
        if (session.loggedIn) {
            await api("add_cart", {product_id: product.product_id, quantity: 1});
            await loadCart();
        } else {
            const existing = cartItems.find(i => i.product_id === product.product_id);
            if (existing) existing.quantity++;
            else cartItems.push({...product, quantity: 1});
            saveGuestCart();
            renderCart();
        }
        showAddedMessage(product.product_id);
    } catch (err) {
        alert(err.message);
    }
}

function showAddedMessage(productId) {
    const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    const button = card?.querySelector(".add-cart");
    if (!button) return;
    const original = button.textContent;
    button.textContent = "✓ Added";
    button.style.background = "#43a95c";
    setTimeout(() => {
        button.textContent = original;
        button.style.background = "";
    }, 1200);
    cartCounter.animate([{transform:"scale(1)"},{transform:"scale(1.5)"},{transform:"scale(1)"}], {duration:400});
}

document.querySelectorAll(".add-cart").forEach(button => {
    button.addEventListener("click", () => {
        const card = button.closest(".product-card");
        addToCart(productFromCard(card));
    });
});

async function loadCart() {
    try {
        const session = await api("session");
        if (session.loggedIn) {
            const result = await api("get_cart");
            cartItems = result.items || [];
        } else {
            cartItems = guestCart();
        }
        renderCart();
    } catch (err) {
        console.error(err);
    }
}

function renderCart() {
    const count = cartItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    cartCounter.textContent = count;

    if (!cartItems.length) {
        cartContainer.innerHTML = '<p class="empty-state">Your cart is empty. Add a pair to continue.</p>';
        cartTotal.textContent = "$0.00";
        return;
    }

    let total = 0;
    cartContainer.innerHTML = cartItems.map(item => {
        const line = Number(item.price) * Number(item.quantity);
        total += line;
        return `
            <div class="cart-row">
                <img src="${escapeHtml(item.image)}" alt="">
                <div class="cart-row-info">
                    <strong>${escapeHtml(item.name)}</strong>
                    <small>${escapeHtml(item.category || "")}</small>
                    <div class="cart-row-bottom">
                        <span>$${Number(item.price).toFixed(2)}</span>
                        <div class="qty">
                            <button data-cart-action="minus" data-id="${item.product_id}">−</button>
                            <b>${item.quantity}</b>
                            <button data-cart-action="plus" data-id="${item.product_id}">+</button>
                        </div>
                    </div>
                </div>
                <button class="remove-cart" data-id="${item.product_id}">×</button>
            </div>`;
    }).join("");

    cartTotal.textContent = `$${total.toFixed(2)}`;

    cartContainer.querySelectorAll("[data-cart-action]").forEach(btn => {
        btn.addEventListener("click", () => changeQuantity(Number(btn.dataset.id), btn.dataset.cartAction));
    });
    cartContainer.querySelectorAll(".remove-cart").forEach(btn => {
        btn.addEventListener("click", () => removeFromCart(Number(btn.dataset.id)));
    });
}

async function changeQuantity(productId, action) {
    const item = cartItems.find(i => Number(i.product_id) === productId);
    if (!item) return;
    const quantity = action === "plus" ? Number(item.quantity) + 1 : Number(item.quantity) - 1;

    try {
        const session = await api("session");
        if (session.loggedIn) {
            if (quantity <= 0) await api("remove_cart", {product_id: productId});
            else await api("update_cart", {product_id: productId, quantity});
            await loadCart();
        } else {
            if (quantity <= 0) cartItems = cartItems.filter(i => Number(i.product_id) !== productId);
            else item.quantity = quantity;
            saveGuestCart();
            renderCart();
        }
    } catch (err) { alert(err.message); }
}

async function removeFromCart(productId) {
    try {
        const session = await api("session");
        if (session.loggedIn) {
            await api("remove_cart", {product_id: productId});
            await loadCart();
        } else {
            cartItems = cartItems.filter(i => Number(i.product_id) !== productId);
            saveGuestCart();
            renderCart();
        }
    } catch (err) { alert(err.message); }
}

cartBtn.addEventListener("click", () => {
    cartDrawer.classList.add("show");
    cartOverlay.classList.add("show");
});
function closeCartDrawer() {
    cartDrawer.classList.remove("show");
    cartOverlay.classList.remove("show");
}
closeCart.addEventListener("click", closeCartDrawer);
cartOverlay.addEventListener("click", closeCartDrawer);

/* ---------------- CHECKOUT ---------------- */
const checkoutModal = document.getElementById("checkoutModal");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutMessage = document.getElementById("checkoutMessage");

document.getElementById("closeCheckout").addEventListener("click", () => closeModal(checkoutModal));

document.getElementById("checkoutBtn").addEventListener("click", async () => {
    if (!cartItems.length) {
        alert("Your cart is empty.");
        return;
    }
    const session = await api("session");
    if (!session.loggedIn) {
        closeCartDrawer();
        openAuth("login");
        authMessage.textContent = "Please login before placing an order.";
        return;
    }
    closeCartDrawer();
    checkoutForm.reset();
    checkoutMessage.textContent = "";
    checkoutModal.classList.add("show");
});

checkoutForm.addEventListener("submit", async e => {
    e.preventDefault();
    checkoutMessage.className = "form-message";
    checkoutMessage.textContent = "Saving your order...";
    try {
        const result = await api("place_order", {
            name: document.getElementById("orderName").value.trim(),
            phone: document.getElementById("orderPhone").value.trim(),
            address: document.getElementById("orderAddress").value.trim(),
            payment_method: document.getElementById("orderPayment").value
        });
        checkoutMessage.className = "form-message success";
        checkoutMessage.textContent = `${result.message} Order #${result.order_id}`;
        cartItems = [];
        renderCart();
        setTimeout(() => closeModal(checkoutModal), 1200);
    } catch (err) {
        checkoutMessage.className = "form-message error";
        checkoutMessage.textContent = err.message;
    }
});

/* ---------------- CONTACT ---------------- */
const contactForm = document.getElementById("contactForm");
contactForm.addEventListener("submit", async e => {
    e.preventDefault();
    const button = contactForm.querySelector(".submit-btn");
    button.disabled = true;
    button.textContent = "Saving...";
    try {
        const result = await api("contact", {
            name: document.getElementById("contactName").value.trim(),
            email: document.getElementById("contactEmail").value.trim(),
            subject: document.getElementById("contactSubject").value.trim(),
            message: document.getElementById("contactMessage").value.trim()
        });
        button.textContent = "✓ Message Saved!";
        button.style.background = "#43a95c";
        contactForm.reset();
        setTimeout(() => {
            button.disabled = false;
            button.textContent = "Send Message →";
            button.style.background = "";
        }, 2200);
        console.log(result);
    } catch (err) {
        button.disabled = false;
        button.textContent = "Send Message →";
        alert(err.message);
    }
});

/* ---------------- WISHLIST ---------------- */
document.querySelectorAll(".heart").forEach(heart => {
    heart.addEventListener("click", async () => {
        const card = heart.closest(".product-card");
        const product = productFromCard(card);
        try {
            const session = await api("session");
            if (!session.loggedIn) {
                openAuth("login");
                authMessage.textContent = "Login to save your wishlist.";
                return;
            }
            if (heart.textContent.trim() === "♡") {
                await api("add_wishlist", {product_id: product.product_id});
                heart.textContent = "♥";
                heart.style.color = "#ed1745";
            } else {
                await api("remove_wishlist", {product_id: product.product_id});
                heart.textContent = "♡";
                heart.style.color = "";
            }
        } catch (err) { alert(err.message); }
    });
});

/* ---------------- UTIL ---------------- */
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[char]));
}

/* ---------------- SCROLL REVEAL ---------------- */
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
        }
    });
}, {threshold: 0.12});

document.querySelectorAll(".section, .offer-section, .contact-wrapper").forEach(section => {
    section.style.opacity = "0";
    section.style.transform = "translateY(25px)";
    section.style.transition = "opacity 0.7s ease, transform 0.7s ease";
    observer.observe(section);
});

/* Start */
checkSession();
loadCart();

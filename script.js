const API = "https://www.themealdb.com/api/json/v1/1";
const FAVORITES_KEY = "rf_favorites_v1";
const PRICE_RATING_KEY = "rf_price_rating_v1";
const CART_KEY = "rf_cart_v1";

const grid = document.getElementById("grid");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const sortSelect = document.getElementById("sortSelect");
const resultsInfo = document.getElementById("resultsInfo");
const modalRoot = document.getElementById("modalRoot");
const viewFav = document.getElementById("viewFav");
const clearStorageBtn = document.getElementById("clearStorage");
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");

let currentList = [];

function seededRandom(seed) {
    let t = Math.abs(hashCode(seed)) + 1;
    return () => {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function hashCode(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return h | 0;
}
const priceRatingStore = JSON.parse(localStorage.getItem(PRICE_RATING_KEY) || "{}");

function getPriceAndRatingFor(id) {
    if (priceRatingStore[id]) return priceRatingStore[id];
    const rnd = seededRandom(id);
    const price = Math.round(5 + rnd() * 45);
    const rating = (3 + rnd() * 2).toFixed(1);
    priceRatingStore[id] = {
        price,
        rating
    };
    localStorage.setItem(PRICE_RATING_KEY, JSON.stringify(priceRatingStore));
    return priceRatingStore[id];
}

function getFavorites() {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
}

function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function updateCartUI() {
    const cart = getCart();
    const total = cart.reduce((sum, i) => sum + getPriceAndRatingFor(i.idMeal).price, 0);
    cartCount.textContent = cart.length;
    cartTotal.textContent = total;
}

function toggleFavorite(recipe) {
    const favs = getFavorites();
    const exists = favs.find((f) => f.idMeal === recipe.idMeal);
    if (exists) {
        const next = favs.filter((f) => f.idMeal !== recipe.idMeal);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } else {
        favs.push({
            idMeal: recipe.idMeal,
            strMeal: recipe.strMeal,
            strMealThumb: recipe.strMealThumb
        });
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    }
    renderGrid(currentList);
}

function addToCart(recipe) {
    const cart = getCart();
    if (cart.find((i) => i.idMeal === recipe.idMeal)) return alert("Already in cart!");
    cart.push({
        idMeal: recipe.idMeal,
        strMeal: recipe.strMeal
    });
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
    alert("Added to cart!");
}

async function searchRecipes() {
    const q = searchInput.value.trim() || "chicken";
    resultsInfo.textContent = "Searching...";
    grid.innerHTML = "";
    try {
        const res = await fetch(`${API}/search.php?s=${q}`);
        const json = await res.json();
        if (!json.meals) {
            grid.innerHTML = "<div class='muted'>No recipes found.</div>";
            resultsInfo.textContent = "No results found.";
            return;
        }
        currentList = json.meals;
        applySortAndRender();
        resultsInfo.textContent = ``;
    } catch {
        resultsInfo.textContent = "Failed to fetch recipes.";
    }
}

function applySortAndRender() {
    const sort = sortSelect.value;
    let arr = [...currentList];
    if (sort === "rating") arr.sort((a, b) => getPriceAndRatingFor(b.idMeal).rating - getPriceAndRatingFor(a.idMeal).rating);
    if (sort === "price_low") arr.sort((a, b) => getPriceAndRatingFor(a.idMeal).price - getPriceAndRatingFor(b.idMeal).price);
    if (sort === "price_high") arr.sort((a, b) => getPriceAndRatingFor(b.idMeal).price - getPriceAndRatingFor(a.idMeal).price);
    renderGrid(arr);
}

function renderGrid(list) {
    grid.innerHTML = "";
    const favs = getFavorites();
    const favIds = new Set(favs.map((f) => f.idMeal));
    list.forEach((r) => {
        const {
            price,
            rating
        } = getPriceAndRatingFor(r.idMeal);
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
          <img class="thumb" src="${r.strMealThumb}" />
          <div class="meta">
            <div>${r.strMeal}</div>
            <div>
              <div class="price">₹${price}</div>
              <div class="rating">★ ${rating}</div>
            </div>
          </div>
          <div class="actions">
            <button data-id="${r.idMeal}" data-action="view">View</button>
            <button data-id="${r.idMeal}" data-action="fav">${favIds.has(r.idMeal) ? "Unfavorite" : "Favorite"}</button>
            <button data-id="${r.idMeal}" data-action="cart">Add to Cart</button>
          </div>`;
        div.querySelector('[data-action="view"]').onclick = () => openDetails(r.idMeal);
        div.querySelector('[data-action="fav"]').onclick = () => toggleFavorite(r);
        div.querySelector('[data-action="cart"]').onclick = () => addToCart(r);
        grid.appendChild(div);
    });
}

async function openDetails(id) {
    modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal">Loading...</div></div>`;
    const res = await fetch(`${API}/lookup.php?i=${id}`);
    const json = await res.json();
    const d = json.meals[0];
    const ing = [];
    for (let i = 1; i <= 20; i++)
        if (d[`strIngredient${i}`]) ing.push(`${d[`strIngredient${i}`]} - ${d[`strMeasure${i}`]}`);
    const {
        price,
        rating
    } = getPriceAndRatingFor(id);
    modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h2>${d.strMeal}</h2>
            <img src="${d.strMealThumb}" style="width:200px;border-radius:8px" />
            <p>₹${price} — ★ ${rating}</p>
            <h4>Ingredients:</h4>
            <ul>${ing.map(i=>`<li>${i}</li>`).join("")}</ul>
            <h4>Instructions:</h4>
            <p>${d.strInstructions}</p>
            <button onclick="document.getElementById('modalRoot').innerHTML=''">Close</button>
          </div>
        </div>`;
}

// Events
searchBtn.onclick = searchRecipes;
searchInput.addEventListener("keypress", e => e.key === "Enter" && searchRecipes());
sortSelect.onchange = applySortAndRender;
viewFav.onclick = () => {
    const favs = getFavorites();
    if (!favs.length) return alert("No favorites yet!");
    currentList = favs;
    renderGrid(favs);
    resultsInfo.textContent = `${favs.length} favorites`;
};

cartBtn.onclick = () => showCart();

function showCart() {
    const cart = getCart();
    if (!cart.length) return alert("Cart is empty!");
    let total = 0;
    const items = cart.map(i => {
        const {
            price
        } = getPriceAndRatingFor(i.idMeal);
        total += price;
        return `<li>${i.strMeal} - ₹${price} <button onclick="removeFromCart('${i.idMeal}')">❌</button></li>`;
    }).join("");
    modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h2>🛒 Your Cart</h2>
            <ul>${items}</ul>
            <p><b>Total:</b> ₹${total}</p>
            <button onclick="document.getElementById('modalRoot').innerHTML=''">Close</button>
          </div>
        </div>`;
}

function removeFromCart(id) {
    let cart = getCart().filter(i => i.idMeal !== id);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
    showCart();
}
viewFav.onclick = () => {
    const favs = getFavorites();
    if (!favs.length) return alert("No favorites yet!");

    currentList = favs;
    renderGrid(favs);
    resultsInfo.innerHTML = `
    ${favs.length} favorites 
    <button id="backHomeBtn" style="
      margin-left:10px;
      background:#2563eb;
      color:white;
      border:none;
      border-radius:6px;
      padding:4px 8px;
      cursor:pointer;
    ">⬅ Back to Home</button>
  `;

    // add event listener for back button
    document.getElementById("backHomeBtn").onclick = () => {
        searchRecipes(); // reload the main recipe list
    };
};

searchInput.value = "";
searchRecipes();
updateCartUI();

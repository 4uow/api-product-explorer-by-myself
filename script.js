const API_BASE = "https://dummyjson.com";
const PAGE_SIZE = 12;
const FAVORITES_KEY = "api-product-explorer:favorites";

const state = {
    products: [],
    requestId: 0,
    total: 0,
    page: 1,
    query: "",
    order: "asc",
    sortBy: "title",
    category: "",
    loading: false,
    favorites: loadFavorites(),
    lowInventory: false,
    showFavorites: false,
};

const el = {
    searchForm: document.querySelector("#searchForm"),
    searchInput: document.querySelector("#searchInput"),
    category: document.querySelector("#categorySelect"),
    sort: document.querySelector("#sortSelect"),
    reset: document.querySelector("#resetButton"),
    retry: document.querySelector("#retryButton"),
    state: document.querySelector("#statusText"),
    errorBox: document.querySelector("#errorBox"),
    errorText: document.querySelector("#errorText"),
    grid: document.querySelector("#productGrid"),
    previous: document.querySelector("#prevButton"),
    next: document.querySelector("#nextButton"),
    pageText: document.querySelector("#pageText"),
    dialog: document.querySelector("#productDialog"),
    dialogContent: document.querySelector("#dialogContent"),
    closeDialog: document.querySelector("#closeDialogButton"),
    lowInventory: document.querySelector("#low-inventory"),
    showFavorites: document.querySelector("#show-favorites"),
};

let requestController = null;

function loadFavorites() {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
}

function saveFavorites() {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
    } catch {
        el.state.textContent = "浏览器没有保存收藏的权限，本次收藏只在当前页面有效。";
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatPrice(price) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(price) || 0);
}

function formatCategory(category) {
    return String(category || "uncategorized")
        .replaceAll("-", " ")
        .replaceAll(/\b\w/g, letter => letter.toUpperCase());
}

function buildProductUrl() {
    const param = new URLSearchParams();
    let path = "/products";
    if (state.category) {
        path += "/category/" + encodeURIComponent(state.category);
    } else if (state.query) {
        path += "/search";
        param.set("q", state.query);
    }
    param.set("limit", "0");
    param.set("sortBy", state.sortBy);
    param.set("order", state.order);
    return API_BASE + path + "?" + param.toString();
}

async function requestJson(url,signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error("接口返回了 HTTP " + response.status);
    return response.json();
}

function debounce(fn,wait) {
    let timer = null;
    const debounced = (...args) => {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, wait)
    }

    debounced.cancel = () => {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    return debounced;
}



async function loadCategories() {
    try {
        const categories = await requestJson(API_BASE + "/products/category-list");
        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = formatCategory(category);
            el.category.append(option);
        });
    } catch {
        const option = document.createElement("option");
        option.textContent = "分类加载失败";
        option.disabled = true;
        el.category.append(option);
    }
}

function hideError() {
    el.errorBox.classList.add("hidden");
    el.errorText.textContent = "";
}

function showError(message) {
    el.state.textContent = "接口暂时不可用，请检查网络后重试。";
    el.errorBox.classList.remove("hidden");
    el.errorText.textContent = message;
}

function renderSkeletons() {
    el.grid.innerHTML = Array.from({ length: 8 }, () =>
        '<div class="skeleton-card" aria-hidden="true">' +
        '<div class="skeleton skeleton-image"></div>' +
        '<div class="skeleton skeleton-line"></div>' +
        '<div class="skeleton skeleton-line short"></div>' +
        "</div>"
    ).join("");
}

function getFilteredProducts() {
    let products = state.products;
    if (state.lowInventory) {
        products = products.filter(item => item.stock <= 10);
    }
    if (state.showFavorites) {
        products = products.filter(item => state.favorites.has(item.id));
    }
    return products;
}

function renderPagination(filtered) {
    const total = filtered.length;
    const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    el.pageText.textContent = "第 " + state.page + " / " + maxPage + " 页";
    el.previous.disabled = state.loading || state.page <= 1;
    el.next.disabled = state.loading || state.page >= maxPage;
}

function renderStatus(filtered) {
    const total = filtered.length;
    if (total === 0) {
        el.state.textContent = "没有找到你要的商品，换一个关键词或筛选条件吧。";
    } else {
        const first = (state.page - 1) * PAGE_SIZE + 1;
        const last = Math.min(state.page * PAGE_SIZE, total);
        el.state.textContent = "共 " + total + " 个结果，当前显示第 " + first + " - " + last + " 个。";
    }
}

function renderView() {
    const filtered = getFilteredProducts();
    const first = (state.page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(first, first + PAGE_SIZE);

    if (filtered.length === 0) {
        el.grid.innerHTML = '<div class="empty-state"><p>这里暂时没有商品。请修改关键词或筛选条件。</p></div>';
    } else {
        el.grid.innerHTML = pageItems.map(product => {
            const favorite = state.favorites.has(product.id);
            return (
                '<article class="product-card">' +
                '<div class="image-wrap">' +
                '<img class="product-image" src="' + escapeHtml(product.thumbnail) +
                '" alt="' + escapeHtml(product.title) + '" loading="lazy"' +
                ' onerror="this.style.visibility=\'hidden\'">' +
                '<button class="favorite-button ' + (favorite ? "is-favorite" : "") +
                '" type="button" data-favorite-id="' + product.id +
                '" aria-pressed="' + favorite +
                '" aria-label="' + (favorite ? "取消收藏" : "收藏") + '">' +
                (favorite ? "♥" : "♡") +
                "</button></div>" +
                '<div class="product-body">' +
                '<p class="category">' + escapeHtml(formatCategory(product.category)) + "</p>" +
                '<h2 class="product-title">' + escapeHtml(product.title) + "</h2>" +
                '<div class="product-meta">' +
                '<span class="price">' + formatPrice(product.price) + "</span>" +
                '<span class="rating">★ ' + Number(product.rating || 0).toFixed(1) + "</span>" +
                "</div>" +
                '<button class="details-button" type="button" data-detail-id="' + product.id + '">查看详情</button>' +
                "</div></article>"
            );
        }).join("");
    }

    renderStatus(filtered);
    renderPagination(filtered);
}

async function loadProducts() {
    const requestId = ++state.requestId;
    if(requestController) {
        requestController.abort();
    }
    requestController = new AbortController();
    const { signal } = requestController;
    state.loading = true;
    hideError();
    renderSkeletons();
    el.state.textContent = "正在请求接口...";
    el.previous.disabled = true;
    el.next.disabled = true;

    try {
        const data = await requestJson(buildProductUrl(), signal);
        if (requestId !== state.requestId) return;
        state.products = Array.isArray(data.products) ? data.products : [];
        state.loading = false;
        renderView();
    } catch (error) {
        if (requestId !== state.requestId) return;
        if (error.name === "AbortError") return;
        state.products = [];
        state.loading = false;
        renderView();
        showError("请求失败：" + (error instanceof Error ? error.message : "未知错误"));
    }
}

function changePage(page) {
    const filtered = getFilteredProducts();
    const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page < 1 || page > maxPage || state.loading) return;
    state.page = page;
    renderView();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetFilters() {
    state.page = 1;
    state.query = "";
    state.order = "asc";
    state.sortBy = "title";
    state.category = "";
    state.lowInventory = false;
    state.showFavorites = false;
    el.searchInput.value = "";
    el.category.value = "";
    el.sort.value = "title-asc";
    el.lowInventory.checked = false;
    el.showFavorites.checked = false;
    loadProducts();
}

function openProductDetails(product) {
    el.dialogContent.innerHTML =
        '<div class="dialog-product"><img src="' +
        escapeHtml(product.images?.[0] || product.thumbnail) +
        '" alt="' + escapeHtml(product.title) + '">' +
        "<div>" +
        '<p class="category">' + escapeHtml(formatCategory(product.category)) + "</p>" +
        "<h2>" + escapeHtml(product.title) + "</h2>" +
        "<p>" + escapeHtml(product.description) + "</p>" +
        '<ul class="dialog-list">' +
        "<li><strong>价格：</strong>" + formatPrice(product.price) + "</li>" +
        "<li><strong>评分：</strong>" + Number(product.rating || 0).toFixed(1) + " / 5</li>" +
        "<li><strong>库存：</strong>" + escapeHtml(product.stock) + "</li>" +
        "<li><strong>品牌：</strong>" + escapeHtml(product.brand || "未提供") + "</li>" +
        "</ul></div></div>";
    el.dialog.showModal();
}

const debouncedSearch = debounce(() => {   
    state.query = el.searchInput.value.trim();
    state.category = "";
    el.category.value = "";
    state.page = 1;
    loadProducts();
}, 1000);

// ── Event listeners ──────────────────────────────────────────────────────────

el.searchInput.addEventListener("input", debouncedSearch);

el.searchForm.addEventListener("submit", event => {
    event.preventDefault();
    debouncedSearch.cancel();
    state.query = el.searchInput.value.trim();
    state.category = "";
    el.category.value = "";
    state.page = 1;
    loadProducts();
});

el.category.addEventListener("change", () => {
    state.query = "";
    state.category = el.category.value;
    el.searchInput.value = "";
    state.page = 1;
    loadProducts();
});

el.sort.addEventListener("change", () => {
    [state.sortBy, state.order] = el.sort.value.split("-");
    state.page = 1;
    loadProducts();
});

el.lowInventory.addEventListener("change", () => {
    state.lowInventory = el.lowInventory.checked;
    state.page = 1;
    renderView();
});

el.showFavorites.addEventListener("change", () => {
    state.showFavorites = el.showFavorites.checked;
    state.page = 1;
    renderView();
});

el.reset.addEventListener("click", resetFilters);
el.retry.addEventListener("click", loadProducts);
el.previous.addEventListener("click", () => changePage(state.page - 1));
el.next.addEventListener("click", () => changePage(state.page + 1));

el.grid.addEventListener("click", event => {
    const favoriteBtn = event.target.closest("[data-favorite-id]");
    const detailBtn = event.target.closest("[data-detail-id]");

    if (favoriteBtn) {
        const id = Number(favoriteBtn.dataset.favoriteId);
        if (state.favorites.has(id)) {
            state.favorites.delete(id);
        } else {
            state.favorites.add(id);
        }
        saveFavorites();
        renderView();
        return;
    }

    if (detailBtn) {
        const id = Number(detailBtn.dataset.detailId);
        const product = state.products.find(item => item.id === id);
        if (product) openProductDetails(product);
    }
});

el.closeDialog.addEventListener("click", () => el.dialog.close());

el.dialog.addEventListener("click", event => {
    if (event.target !== el.dialog) return;
    const rect = el.dialog.getBoundingClientRect();
    if (
        event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top  || event.clientY > rect.bottom
    ) el.dialog.close();
});

// ── Init ─────────────────────────────────────────────────────────────────────

loadCategories();
loadProducts();


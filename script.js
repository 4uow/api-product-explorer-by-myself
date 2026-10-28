const API_BASE = "https://dummyjson.com";
const PAGE_SIZE = 12;
const FAVORITES_KEY = "api-product-explorer:favorites";

const state = {
    products : [],
    requestId : 0,
    total : 0,
    page : 1,
    skip : 0,
    limit : 0,
    query : "",
    order : "asc",
    sortBy : "title",
    category : "",
    loading : false,
    favorites : loadFavorites()
};

const el = {
    searchForm : document.querySelector("#searchForm"),
    searchInput : document.querySelector("#searchInput"),
    category : document.querySelector("#categorySelect"),
    sort : document.querySelector("#sortSelect"),
    reset : document.querySelector("#resetButton"),
    retry : document.querySelector("#retryButton"),
    state : document.querySelector("#statusText"),
    errorBox: document.querySelector("#errorBox"),
    errorText: document.querySelector("#errorText"),
    grid : document.querySelector("#productGrid"),
    previous : document.querySelector("#prevButton"),
    next : document.querySelector("#nextButton"),
    pageText : document.querySelector("#pageText"),
    dialog : document.querySelector("#productDialog"),
    dialogContent : document.querySelector("#dialogContent"),
    closeDialog : document.querySelector("#closeDialogButton"),
};

function loadFavorites(){
    try{
        const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")
        return new Set(Array.isArray(saved)?saved:"[]");
    }catch{
        return new Set();
    }
}

function saveFavorites(){
    try{
        localStorage.setItem(FAVORITES_KEY,JSON.stringify(...state.favorites));
    }catch{
        el.state.textContent = "浏览器没有保存收藏的权限，本次收藏只在当前页面有效。";
    }
}

function escapeHtml(value){
    return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"quot;")
    .replaceAll("'","&#039;");
}

function formatPrice(price){
    return new Intl.NumberFormat("en-US",{
        style : "currency",
        currency : "USD"
    }).format(Number(price) || 0);
}

function formatCategory(category){
    return String(category || "uncategoried")
    .replaceAll("-"," ")
    .replaceAll(/\b\w/g,letter => letter.toUpperCase());
}

function buildProductUrl(){
    const skip = (state.page-1)*PAGE_SIZE;
    const param = new URLSearchParams({
        limit : String(PAGE_SIZE),
        skip : String(skip),
        sortBy : state.sortBy,
        order : state.order
    })

    let path = "/products"
    if(state.category){
        path += "/category/" + encodeURIComponent(state.category)
    }else if(state.query){
        path += "/search";
        param.set("q",state.query);
    }

    return API_BASE + path + "?" + param.toString();
}

async function requestJson(url) {
    const response = await fetch(url);
    if(!response.ok){
        throw new Error("接口返回了 HTTP " + response.status)
    }
    return response.json();
}

async function loadCategories() {
    try{
    const categories = await requestJson(API_BASE + "/products/category-list");
    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = formatCategory(category);
        el.category.append(option);
    })}catch{
        const option = document.createElement("option");
        option.textContent = "分类加载失败"
        option.disabled = true;
        el.category.append(option);
    }
}

function hideError(){
    el.errorBox.classList.add("hidden");
    el.errorText = "";
}
function showError(message){
    el.state.textContent = "接口暂时不可用，请检查网络后重试。"
    el.errorBox.classList.remove("hidden");
    el.errorText = message
}

function renderSkeletons(){
    el.grid.innerHTML = Array.from({length:8},
        () => 
            ('<div class="skeleton-card" aria-hidden="true">' +
            '<div class="skeleton skeleton-image"></div>' +
            '<div class="skeleton skeleton-line"></div>' +
            '<div class="skeleton skeleton-line short"></div>' +
            "</div>")
    ).join("")
}

function renderPagination(){
    const maxPage = Math.max(1,Math.ceil(state.total/PAGE_SIZE));
    el.pageText.textContent = "第 "+state.page+" / "+maxPage+" 页";
    el.previous.disabled = state.loading || state.page <=1;
    el.next.disabled = state.loading || state.page >= maxPage;
}

function renderStatus(message){
    el.state.textContent = message
} 

async function loadProducts() {
    const requestId = ++state.requestId;
    state.loading = true;
    hideError();
    renderSkeletons();
    renderStatus("正在请求接口...");
    renderPagination();

    try{
        const data =await requestJson(buildProductUrl());
        if (requestId !== state.requestId) return;
        state.products = Array.isArray(data.products)?data.products : [];
        state.total = Number(data.total) || 0;
        renderProject();
        renderPagination();
        if(state.total === 0){
            renderStatus("没有找到你要的商品，换一个关键词或筛选条件吧。")
        }else{
            const first = (state.page - 1)*PAGE_SIZE+1;
            const last = Math.min(state.page*PAGE_SIZE,state.total);
            renderStatus("共" + state.total+" 个结果，当前显示第 "+ first + "-" + last +"个。");
        }
    }catch(error){
        if (requestId !== state.requestId) return;
        state.products = [];
        state.total = 0;
        renderProject();
        renderPagination();
        showError("请求失败"+error instanceof Error ? error.message : "未知错误");
    }finally{
        if(requestId !== state.requestId) return;
        state.loading = false;
        renderPagination();
    }
}

function renderProject(){
    if (state.products.length === 0){
        el.grid.innerHTML = '<div class="empty-state"><p>这里暂时没有商品。请修改关键词或筛选条件。</p></div>';
        return;
    }

    el.grid.innerHTML = state.products.map((product) => {
        const favorite = state.favorites.has(product.id);
        return (
            '<article class="product-card">' +
            '<div class="image-wrap">' +
            '<img class="product-image" src="' +
            escapeHtml(product.thumbnail) +
            '" alt="' +
            escapeHtml(product.title) +
            '" loading="lazy">' +
            '<button class="favorite-button ' +
            (favorite ? "is-favorite" : "") +
            '" type="button" data-favorite-id="' +
            product.id +
            '" aria-label="' +
            (favorite ? "取消收藏" : "收藏") +
            '">' +
            (favorite ? "♥" : "♡") +
            "</button></div>" +
            '<div class="product-body">' +
            '<p class="category">' +
            escapeHtml(formatCategory(product.category)) +
            "</p>" +
            '<h2 class="product-title">' +
            escapeHtml(product.title) +
            "</h2>" +
            '<div class="product-meta"><span class="price">' +
            formatPrice(product.price) +
            '</span><span class="rating">★ ' +
            Number(product.rating || 0).toFixed(1) +
            "</span></div>" +
            '<button class="details-button" type="button" data-detail-id="' +
            product.id +
            '">查看详情</button></div></article>'
        );
    })
    .join("");
}

function changePage(page) {
    const totalPage = Math.max(1,Math.ceil(state.total/PAGE_SIZE));
    if(page < 0 || page > totalPage || state.loading) return;
    state.page = page;
    loadProducts();
    window.scrollTo({top:0,behavior:"smooth"});
}

function resetFilters() {
    state.page = 1;
    state.query = "";
    state.order = "asc";
    state.sortBy = "title";
    state.category = "";
    el.searchInput.value = "";
    el.category.value = "";
    el.sort.value = "title-asc";
    loadProducts();
}

function openProductDetails(product){
    el.dialogContent.innerHTML =
    '<div class="dialog-product"><img src="' +
    escapeHtml(product.images?.[0] || product.thumbnail) +
    '" alt="' +
    escapeHtml(product.title) +
    '"><div><p class="category">' +
    escapeHtml(formatCategory(product.category)) +
    "</p><h2>" +
    escapeHtml(product.title) +
    "</h2><p>" +
    escapeHtml(product.description) +
    '</p><ul class="dialog-list"><li><strong>价格：</strong>' +
    formatPrice(product.price) +
    '</li><li><strong>评分：</strong>' +
    Number(product.rating || 0).toFixed(1) +
    " / 5</li><li><strong>库存：</strong>" +
    escapeHtml(product.stock) +
    "</li><li><strong>品牌：</strong>" +
    escapeHtml(product.brand || "未提供") +
    "</li></ul></div></div>";
  el.dialog.showModal();
}

el.searchForm.addEventListener("submit",(event) =>{
    event.preventDefault();
    state.query = el.searchInput.value.trim();
    state.category = "";
    el.category.value = "";
    state.page = 1;
    loadProducts();
});

el.category.addEventListener("change",() => {
    state.query = "";
    state.category = el.category.value;
    el.searchInput.value = "";
    state.page = 1;
    loadProducts();
})

el.sort.addEventListener("change",() => {
    [state.sortBy,state.order] = el.sort.value.split("-");
    state.page = 1;
    loadProducts();
})

el.reset.addEventListener("click", resetFilters);
el.retry.addEventListener("click", loadProducts);
el.previous.addEventListener("click", () => changePage(state.page - 1));
el.next.addEventListener("click", () => changePage(state.page + 1));

el.grid.addEventListener("click",(event) => {
    const favorite = event.target.closest("[data-favorite-id]");
    const detail = event.target.closest("[data-detail-id]");

    if(favorite){
        const favoriteId = Number(favorite.dataset.favoriteId);
        const isFavorite = state.favorites.has(favoriteId);
        if (isFavorite){
            state.favorites.delete(favoriteId);
        }else{
            state.favorites.add(favoriteId);
        }
        saveFavorites();
        renderProject();
        return ;
    }

    if(detail){
        const detailId = Number(detail.dataset.detailId);
        const product = state.products.find(item => item === detailId);

        if (product) openProductDetails(product);
    }
});

el.closeDialog.addEventListener("click",() => {
    el.dialog.close()
});

el.dialog.addEventListener("click",(event) => {
    if(event.target !== state.dialog) return;
    const rect = el.dialog.getBoundingClientRect();

    if(event.clientX < rect.left || event.clientX > rect.right || 
        event.clientY > rect.top || event.clientY < rect.bottom
    ) el.dialog.close();
});

loadCategories();
loadProducts();

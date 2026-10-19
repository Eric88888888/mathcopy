(() => {
  "use strict";

  const DATA = window.SYMBOL_DATA;
  if (!DATA || !Array.isArray(DATA.categories)) {
    document.body.innerHTML = "<p style='padding:40px;color:#fca5a5'>符号数据加载失败，请重新安装应用。</p>";
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const STORAGE_KEY = "mathcopy.state.v1";
  const RECENT_LIMIT = 24;

  const els = {
    search: $("#searchInput"),
    searchClear: $("#searchClear"),
    categoryPills: $("#categoryPills"),
    symbolGrid: $("#symbolGrid"),
    emptyState: $("#emptyState"),
    resultHeading: $("#resultHeading"),
    categoryIntro: $("#categoryIntro"),
    categoryInfo: $("#categoryInfo"),
    resultCount: $("#resultCount"),
    resetFilters: $("#resetFilters"),
    favoritesToggle: $("#favoritesToggle"),
    navFavCount: $("#navFavCount"),
    heroCopiedCount: $("#heroCopiedCount"),
    heroSymbolCount: $("#heroSymbolCount"),
    heroCategoryCount: $("#heroCategoryCount"),
    overlay: $("#overlay"),
    toast: $("#toast"),
    toastSymbol: $("#toastSymbol"),
    toastTitle: $("#toastTitle"),
    toastSub: $("#toastSub"),
    detailModal: $("#detailModal"),
    detailSymbol: $("#detailSymbol"),
    detailName: $("#detailName"),
    detailCategory: $("#detailCategory"),
    detailUnicode: $("#detailUnicode"),
    detailEntity: $("#detailEntity"),
    detailUtf8: $("#detailUtf8"),
    detailLatex: $("#detailLatex"),
    detailCopyBtn: $("#detailCopyBtn"),
    detailLatexBtn: $("#detailLatexBtn"),
    detailFavBtn: $("#detailFavBtn"),
    detailGoCategory: $("#detailGoCategory"),
    latexModal: $("#latexModal"),
    latexInput: $("#latexInput"),
    latexPreview: $("#latexPreview"),
    latexError: $("#latexError"),
    latexStatus: $("#latexStatus"),
    recentDrawer: $("#recentDrawer"),
    recentList: $("#recentList"),
    clearRecent: $("#clearRecent"),
    shortcutsModal: $("#shortcutsModal"),
    windowbar: $("#windowbar"),
    winMin: $("#winMin"),
    winMax: $("#winMax"),
    winClose: $("#winClose"),
  };

  const categoryById = new Map(DATA.categories.map((category) => [category.id, category]));
  let currentDetail = null;
  let lastFocused = null;
  let toastTimer = 0;
  let saveTimer = 0;
  let searchTimer = 0;
  let latexTimer = 0;
  let recentTimer = 0;

  const copyIconSvg = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2"></rect>
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
    </svg>`;
  const starSvg = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2-5.6-3.1-5.6 3.1 1.2-6.2L3 9.5l6.3-.8L12 3Z"></path>
    </svg>`;

  function sizeClass(text) {
    const length = Array.from(text).length;
    if (length <= 1) return "";
    if (length === 2) return "size-2";
    if (length === 3) return "size-3";
    if (length <= 5) return "size-4";
    return "size-5";
  }

  function prepare(symbol) {
    if (symbol._prepared) return symbol;
    const chars = Array.from(symbol.char);
    const codepoints = chars.map((char) => {
      const hex = char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
      return `U+${hex}`;
    });
    const bytes = Array.from(new TextEncoder().encode(symbol.char))
      .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"));
    symbol.unicode = codepoints.join(" ");
    symbol.entity = chars
      .map((char) => `&#x${char.codePointAt(0).toString(16).toUpperCase()};`)
      .join("");
    symbol.utf8 = bytes.join(" ");
    symbol.sizeClass = sizeClass(symbol.char);
    symbol.haystack = [
      symbol.char,
      symbol.name,
      symbol.latex,
      symbol.aliases,
      symbol.categoryName,
      symbol.unicode,
      symbol.unicode.replace(/U\+/g, ""),
      symbol.unicode.replace(/U\+/g, "U"),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    symbol._prepared = true;
    return symbol;
  }

  const all = DATA.all.map(prepare);
  const categories = DATA.categories.map((category) => ({
    ...category,
    symbols: category.symbols.map(prepare),
  }));
  categoryById.clear();
  categories.forEach((category) => categoryById.set(category.id, category));
  const universe = DATA.universe.map(prepare);
  const symbolByKey = new Map();
  universe.forEach((symbol) => {
    if (!symbolByKey.has(symbol.key)) symbolByKey.set(symbol.key, symbol);
  });
  all.forEach((symbol) => {
    if (!symbolByKey.has(symbol.key)) symbolByKey.set(symbol.key, symbol);
  });
  categories.forEach((category) => {
    category.symbols.forEach((symbol) => {
      if (!symbolByKey.has(symbol.key)) symbolByKey.set(symbol.key, symbol);
    });
  });

  function emptyState() {
    return {
      favorites: [],
      recent: [],
      copiedCount: 0,
      updatedAt: 0,
      query: "",
      category: "all",
      favoritesOnly: false,
    };
  }

  function sanitizeState(raw) {
    const clean = emptyState();
    if (!raw || typeof raw !== "object") return clean;
    if (Array.isArray(raw.favorites)) {
      for (const key of raw.favorites) {
        if (typeof key !== "string" || !key || clean.favorites.includes(key)) continue;
        clean.favorites.push(key);
        if (clean.favorites.length >= 500) break;
      }
    }
    if (Array.isArray(raw.recent)) {
      for (const entry of raw.recent) {
        if (!entry || typeof entry !== "object") continue;
        if (typeof entry.key !== "string" || typeof entry.char !== "string") continue;
        clean.recent.push({
          key: entry.key,
          char: entry.char,
          name: typeof entry.name === "string" ? entry.name : "",
          categoryName: typeof entry.categoryName === "string" ? entry.categoryName : "",
          latex: typeof entry.latex === "string" ? entry.latex : "",
          ts: Number.isFinite(entry.ts) ? entry.ts : Date.now(),
        });
        if (clean.recent.length >= RECENT_LIMIT) break;
      }
    }
    if (Number.isFinite(raw.copiedCount) && raw.copiedCount >= 0) {
      clean.copiedCount = Math.floor(raw.copiedCount);
    }
    if (Number.isFinite(raw.updatedAt)) clean.updatedAt = raw.updatedAt;
    return clean;
  }

  function loadLocalState() {
    try {
      return sanitizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch {
      return emptyState();
    }
  }

  let state = loadLocalState();
  let favorites = new Set(state.favorites.filter((key) => symbolByKey.has(key)));
  state.favorites = [...favorites];

  function adoptState(next) {
    const clean = sanitizeState(next);
    const ui = {
      query: state.query || "",
      category: state.category || "all",
      favoritesOnly: Boolean(state.favoritesOnly),
    };
    const hadFavorites = favorites.size;
    state = Object.assign(clean, ui);
    favorites = new Set(state.favorites.filter((key) => symbolByKey.has(key)));
    state.favorites = [...favorites];
    if (els.navFavCount) els.navFavCount.dataset.zero = favorites.size === 0 ? "true" : "false";
    updateFavoritesUi();
    render();
    if (hadFavorites !== favorites.size) syncDetailFavorite();
  }

  function saveState() {
    state.favorites = [...favorites];
    state.updatedAt = Date.now();
    const payload = {
      favorites: state.favorites,
      recent: state.recent,
      copiedCount: state.copiedCount,
      updatedAt: state.updatedAt,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* Local storage can be unavailable for file:// in some runtimes. */
    }
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      if (window.pywebview?.api?.save_state) {
        try {
          window.pywebview.api.save_state(payload).catch(() => {});
        } catch {
          /* Bridge can disappear while the window is closing. */
        }
      }
    }, 320);
  }

  function callApi(name, ...args) {
    const api = window.pywebview?.api;
    if (!api || typeof api[name] !== "function") return Promise.resolve(undefined);
    try {
      return Promise.resolve(api[name](...args)).catch(() => undefined);
    } catch {
      return Promise.resolve(undefined);
    }
  }

  async function copyText(text) {
    if (window.pywebview?.api?.copy_text) {
      try {
        const ok = await window.pywebview.api.copy_text(text);
        if (ok) return true;
      } catch {
        /* Fall through to the browser clipboard APIs. */
      }
    }    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* Fall through to the legacy path. */
    }
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    field.style.top = "0";
    document.body.appendChild(field);
    field.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    field.remove();
    return ok;
  }

  function showToast(glyph, title, sub, isError = false) {
    window.clearTimeout(toastTimer);
    els.toastSymbol.textContent = glyph || "✓";
    els.toastTitle.textContent = title;
    els.toastSub.textContent = sub || "";
    els.toast.classList.toggle("is-error", isError);
    els.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, isError ? 2600 : 1900);
  }

  function relativeTime(timestamp) {
    const delta = Math.max(0, Date.now() - timestamp);
    if (delta < 60_000) return "刚刚";
    if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
    if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
    if (delta < 604_800_000) return `${Math.floor(delta / 86_400_000)} 天前`;
    return new Date(timestamp).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  }

  function addRecent(symbol) {
    const entry = {
      key: symbol.key,
      char: symbol.char,
      name: symbol.name,
      categoryName: symbol.categoryName || "",
      latex: symbol.latex || "",
      ts: Date.now(),
    };
    state.recent = [entry, ...state.recent.filter((item) => item.key !== symbol.key)].slice(0, RECENT_LIMIT);
    state.copiedCount = (state.copiedCount || 0) + 1;
    els.heroCopiedCount.textContent = state.copiedCount.toLocaleString("zh-CN");
    saveState();
    if (!els.recentDrawer.hidden) renderRecent();
  }

  function markCopied(card) {
    if (!card) return;
    card.classList.add("is-copied");
    const hint = $(".copy-hint", card);
    if (hint) hint.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"></path></svg>`;
    window.setTimeout(() => {
      card.classList.remove("is-copied");
      if (hint) hint.innerHTML = copyIconSvg;
    }, 1300);
  }

  async function copySymbol(symbol, card = null, announce = null) {
    const ok = await copyText(symbol.char);
    if (!ok) {
      showToast("!", "复制失败", "剪贴板暂时不可用，请重试", true);
      return false;
    }
    markCopied(card);
    addRecent(symbol);
    const note = symbol.latex ? `${symbol.name} · ${symbol.latex}` : symbol.name;
    showToast(symbol.char, announce || "已复制到剪贴板", note);
    return true;
  }

  function toggleFavorite(key) {
    const symbol = symbolByKey.get(key);
    if (!symbol) return;
    if (favorites.has(key)) {
      favorites.delete(key);
      showToast("☆", "已取消收藏", symbol.name);
    } else {
      favorites.add(key);
      showToast("★", "已加入收藏", symbol.name);
    }
    state.favorites = [...favorites];
    saveState();
    updateFavoritesUi();
    if (state.favoritesOnly) render();
  }

  function updateFavoritesUi() {
    els.navFavCount.textContent = String(favorites.size);
    els.navFavCount.dataset.zero = favorites.size === 0 ? "true" : "false";
    $$(".symbol-card").forEach((card) => {
      const button = $(".fav-btn", card);
      if (!button) return;
      const active = favorites.has(card.dataset.key);
      button.classList.toggle("is-fav", active);
      button.setAttribute("aria-pressed", String(active));
      button.title = active ? "取消收藏" : "收藏";
      button.setAttribute("aria-label", `${active ? "取消收藏" : "收藏"} ${card.dataset.name || ""}`.trim());
    });
    const favPill = $(".favorites-pill", els.categoryPills);
    if (favPill) {
      const count = $(".pill-count", favPill);
      if (count) count.textContent = String(favorites.size);
    }
    syncDetailFavorite();
  }

  function renderCategories() {
    const fragment = document.createDocumentFragment();
    const items = [
      { id: "all", label: "全部", count: all.length },
      ...categories.map((category) => ({
        id: category.id,
        label: category.name,
        count: category.symbols.length,
      })),
    ];
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-btn";
      button.dataset.category = item.id;
      button.innerHTML = `<span>${item.label}</span><span class="pill-count">${item.count}</span>`;
      button.addEventListener("click", () => setCategory(item.id));
      fragment.appendChild(button);
    });
    const favButton = document.createElement("button");
    favButton.type = "button";
    favButton.className = "category-btn favorites-pill";
    favButton.dataset.category = "favorites";
    favButton.innerHTML = `<span class="star-glyph">★</span><span>收藏</span><span class="pill-count">${favorites.size}</span>`;
    favButton.addEventListener("click", () => setFavoritesOnly(!state.favoritesOnly));
    fragment.appendChild(favButton);
    els.categoryPills.replaceChildren(fragment);
  }

  function searchSymbols(list, rawQuery) {
    const query = rawQuery.toLowerCase().trim();
    const tokens = query.split(/\s+/).filter(Boolean);
    if (!tokens.length) return list;
    const matches = [];
    list.forEach((symbol, index) => {
      if (!tokens.every((token) => symbol.haystack.includes(token))) return;
      const name = symbol.name.toLowerCase();
      const char = symbol.char.toLowerCase();
      const latex = (symbol.latex || "").toLowerCase();
      const aliases = (symbol.aliases || "").toLowerCase();
      let score = 5;
      if (name === query || char === query) score = 0;
      else if (name.startsWith(query) || char.startsWith(query)) score = 1;
      else if (name.includes(query) || char.includes(query)) score = 2;
      else if (latex.includes(query) || aliases.includes(query)) score = 3;
      matches.push({ symbol, index, score });
    });
    matches.sort((a, b) => a.score - b.score || a.index - b.index);
    return matches.map((match) => match.symbol);
  }

  function getScopeName() {
    if (state.favoritesOnly) return "收藏夹";
    if (state.category === "all") return "全部符号";
    return categoryById.get(state.category)?.name || "全部符号";
  }

  function visibleSymbols() {
    let list;
    if (state.favoritesOnly) {
      list = state.favorites.map((key) => symbolByKey.get(key)).filter(Boolean);
    } else if (state.category === "all") {
      list = state.query.trim() ? universe : all;
    } else {
      list = categoryById.get(state.category)?.symbols || [];
    }
    const query = state.query.trim();
    if (query) list = searchSymbols(list, query);
    return list;
  }

  function updateTopUi() {
    $$(".category-btn", els.categoryPills).forEach((button) => {
      const isFavorites = button.dataset.category === "favorites";
      const active = isFavorites ? state.favoritesOnly : !state.favoritesOnly && state.category === button.dataset.category;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $$(".nav-link").forEach((link) => {
      const action = link.dataset.action;
      if (action === "library") link.classList.toggle("is-active", !state.favoritesOnly && els.recentDrawer.hidden);
      if (action === "favorites") link.classList.toggle("is-active", state.favoritesOnly && els.recentDrawer.hidden);
      if (action === "recent") link.classList.toggle("is-active", !els.recentDrawer.hidden);
    });
    els.favoritesToggle.setAttribute("aria-pressed", String(state.favoritesOnly));
    els.favoritesToggle.classList.toggle("is-active", state.favoritesOnly);
    els.navFavCount.textContent = String(favorites.size);
    els.navFavCount.dataset.zero = favorites.size === 0 ? "true" : "false";
    const navFavPill = $(".favorites-pill .pill-count", els.categoryPills);
    if (navFavPill) navFavPill.textContent = String(favorites.size);
    els.resetFilters.hidden = state.category === "all" && !state.favoritesOnly && !state.query.trim();
    els.searchClear.hidden = !els.search.value;
    els.heroCopiedCount.textContent = (state.copiedCount || 0).toLocaleString("zh-CN");
    els.heroSymbolCount.textContent = DATA.meta.symbolCount.toLocaleString("zh-CN");
    els.heroCategoryCount.textContent = String(DATA.meta.categoryCount);
  }

  function render() {
    const symbols = visibleSymbols();
    const query = state.query.trim();
    const scopeName = getScopeName();
    const heading = state.favoritesOnly
      ? "收藏夹"
      : query
        ? "搜索结果"
        : state.category === "all"
          ? "全部符号"
          : categoryById.get(state.category)?.name || "全部符号";

    els.resultHeading.textContent = heading;
    if (query) {
      els.categoryIntro.textContent = `在${scopeName}中搜索 “${query}” · 找到 ${symbols.length} 个符号。按 Enter 可复制第一个结果。`;
    } else if (state.favoritesOnly) {
      els.categoryIntro.textContent = `共 ${symbols.length} 个收藏。点击卡片左上角的星标可取消收藏，收藏会保存在本机。`;
    } else if (state.category === "all") {
      els.categoryIntro.textContent = `精选 ${all.length} 个最常用的数学符号。选择上方分类查看完整清单，或直接搜索全部 ${DATA.meta.symbolCount} 个符号。`;
    } else {
      const category = categoryById.get(state.category);
      els.categoryIntro.textContent = category?.description || `共 ${symbols.length} 个${scopeName}。`;
    }
    els.categoryInfo.title = els.categoryIntro.textContent;
    els.categoryInfo.setAttribute("aria-label", `分类说明：${els.categoryIntro.textContent}`);
    els.resultCount.textContent = symbols.length.toLocaleString("zh-CN");

    const emptyTitle = $("h3", els.emptyState);
    const emptyText = $("p", els.emptyState);
    if (state.favoritesOnly && !query && symbols.length === 0) {
      emptyTitle.textContent = "还没有收藏的符号";
      emptyText.innerHTML = "在任意符号卡片左上角点击 <b>☆</b>，就能把它收藏到这里。";
      $("#emptyReset").textContent = "浏览全部符号";
    } else {
      emptyTitle.textContent = "没有找到匹配的符号";
      emptyText.innerHTML =
        '试试符号本身、中文名称，或 Unicode 编码，例如 <button type="button" class="inline-example" data-query="2211">2211</button>。';
      $("#emptyReset").textContent = "清空筛选";
    }

    updateTopUi();

    if (!symbols.length) {
      els.symbolGrid.hidden = true;
      els.emptyState.hidden = false;
      els.symbolGrid.replaceChildren();
      return;
    }

    els.emptyState.hidden = true;
    els.symbolGrid.hidden = false;
    els.symbolGrid.classList.toggle("no-anim", query.length > 0);
    const fragment = document.createDocumentFragment();
    symbols.forEach((symbol, index) => fragment.appendChild(createCard(symbol, index)));
    els.symbolGrid.replaceChildren(fragment);
  }

  function createCard(symbol, index) {
    const card = document.createElement("div");
    card.className = "symbol-card";
    card.dataset.key = symbol.key;
    card.dataset.name = symbol.name;
    card.setAttribute("role", "listitem");
    card.tabIndex = 0;
    card.style.setProperty("--delay", `${Math.min(index * 7, 190)}ms`);
    const title = `${symbol.name} ${symbol.unicode}${symbol.latex ? ` · ${symbol.latex}` : ""} — 点击复制，右键详情`;
    card.title = title;
    card.setAttribute("aria-label", `${symbol.name}，点击复制`);
    card.innerHTML = `
      <button class="fav-btn${favorites.has(symbol.key) ? " is-fav" : ""}" type="button"
              aria-pressed="${favorites.has(symbol.key)}" aria-label="收藏"
              title="${favorites.has(symbol.key) ? "取消收藏" : "收藏"}">${starSvg}</button>
      <span class="symbol-face ${symbol.sizeClass}"></span>
      <span class="symbol-name"></span>
      <span class="copy-hint" aria-hidden="true">${copyIconSvg}</span>
    `;
    $(".symbol-face", card).textContent = symbol.char;
    $(".symbol-name", card).textContent = symbol.name;
    const favButton = $(".fav-btn", card);
    favButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(symbol.key);
    });
    card.addEventListener("click", () => copySymbol(symbol, card));
    card.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openDetail(symbol);
    });
    card.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        copySymbol(symbol, card);
      } else if (event.key.toLowerCase() === "f" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        toggleFavorite(symbol.key);
      } else if (event.key.toLowerCase() === "i" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        openDetail(symbol);
      }
    });
    return card;
  }

  function setCategory(id) {
    if (id === "favorites") {
      setFavoritesOnly(true);
      return;
    }
    state.category = categoryById.has(id) ? id : "all";
    state.favoritesOnly = false;
    render();
    scrollToLibrary();
  }

  function setFavoritesOnly(value) {
    state.favoritesOnly = Boolean(value);
    if (state.favoritesOnly) state.category = "all";
    render();
    scrollToLibrary();
  }

  function resetFilters() {
    state.category = "all";
    state.favoritesOnly = false;
    state.query = "";
    els.search.value = "";
    render();
  }

  function scrollToLibrary() {
    const library = $(".library");
    if (!library) return;
    const top = library.getBoundingClientRect().top;
    if (top < 70 || top > window.innerHeight * 0.72) {
      library.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function openDetail(symbol) {
    currentDetail = symbol;
    els.detailSymbol.textContent = symbol.char;
    els.detailSymbol.className = `detail-symbol ${symbol.sizeClass}`;
    els.detailName.textContent = symbol.name;
    els.detailCategory.textContent = symbol.categoryName || "常用符号";
    els.detailUnicode.textContent = symbol.unicode;
    els.detailUnicode.dataset.copyValue = symbol.unicode;
    els.detailEntity.textContent = symbol.entity;
    els.detailEntity.dataset.copyValue = symbol.entity;
    els.detailUtf8.textContent = symbol.utf8;
    els.detailUtf8.dataset.copyValue = symbol.utf8;
    els.detailLatex.textContent = symbol.latex || "—";
    els.detailLatex.dataset.copyValue = symbol.latex || "";
    els.detailLatexBtn.disabled = !symbol.latex;
    els.detailGoCategory.hidden = !symbol.categoryId || symbol.categoryId === "common";
    syncDetailFavorite();
    openModal(els.detailModal);
  }

  function syncDetailFavorite() {
    if (!currentDetail) return;
    const active = favorites.has(currentDetail.key);
    els.detailFavBtn.classList.toggle("is-fav", active);
    els.detailFavBtn.setAttribute("aria-pressed", String(active));
    $("span", els.detailFavBtn).textContent = active ? "已收藏" : "收藏";
  }

  function openModal(modal) {
    lastFocused = document.activeElement;
    hideAllModals();
    els.overlay.hidden = false;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    const focusTarget = $("input, textarea, button", modal);
    if (focusTarget) window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 40);
  }

  function hideAllModals() {
    els.detailModal.hidden = true;
    els.latexModal.hidden = true;
    els.shortcutsModal.hidden = true;
    els.recentDrawer.hidden = true;
    els.overlay.hidden = true;
    document.body.classList.remove("modal-open");
    clearInterval(recentTimer);
  }

  function closeAll() {
    hideAllModals();
    currentDetail = null;
    updateTopUi();
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus({ preventScroll: true });
    }
    lastFocused = null;
  }

  function openRecent() {
    lastFocused = document.activeElement;
    hideAllModals();
    renderRecent();
    els.overlay.hidden = false;
    els.recentDrawer.hidden = false;
    document.body.classList.add("modal-open");
    updateTopUi();
    $(".drawer-close", els.recentDrawer)?.focus({ preventScroll: true });
    clearInterval(recentTimer);
    recentTimer = window.setInterval(() => {
      if (!els.recentDrawer.hidden) renderRecent();
    }, 30_000);
  }

  function renderRecent() {
    if (!els.recentList) return;
    if (!state.recent.length) {
      els.recentList.innerHTML = `
        <div class="drawer-empty">
          <span>∅</span>
          <b>还没有复制记录</b>
          <small>点击任意符号，最近复制会出现在这里。</small>
        </div>`;
      els.clearRecent.disabled = true;
      return;
    }
    els.clearRecent.disabled = false;
    const fragment = document.createDocumentFragment();
    state.recent.forEach((entry) => {
      const symbol = symbolByKey.get(entry.key) || prepare({ ...entry, aliases: "", _prepared: false });
      const button = document.createElement("button");
      button.type = "button";
      button.className = "recent-item";
      button.title = `再次复制 ${entry.name}`;
      button.innerHTML = `
        <span class="recent-symbol ${sizeClass(entry.char)}"></span>
        <span class="recent-meta"><b></b><small></small></span>
        <span class="recent-copy" aria-hidden="true">⧉</span>
      `;
      $(".recent-symbol", button).textContent = entry.char;
      $(".recent-meta b", button).textContent = entry.name;
      $(".recent-meta small", button).textContent = `${entry.categoryName || "符号"} · ${relativeTime(entry.ts)}`;
      button.addEventListener("click", () => copySymbol(symbol));
      fragment.appendChild(button);
    });
    els.recentList.replaceChildren(fragment);
  }

  function openLatex() {
    openModal(els.latexModal);
    renderLatex();
    window.setTimeout(() => {
      els.latexInput.focus();
      els.latexInput.setSelectionRange(els.latexInput.value.length, els.latexInput.value.length);
    }, 60);
  }

  function renderLatex() {
    if (!window.katex) {
      els.latexPreview.innerHTML = '<span class="latex-placeholder">KaTeX 未加载</span>';
      els.latexError.hidden = false;
      els.latexError.textContent = "本地 KaTeX 资源缺失，请重新安装应用。";
      return;
    }
    const source = els.latexInput.value.trim();
    els.latexError.hidden = true;
    els.latexStatus.textContent = "实时渲染";
    els.latexStatus.style.color = "";
    if (!source) {
      els.latexPreview.innerHTML = '<span class="latex-placeholder">在左侧输入 LaTeX 公式</span>';
      return;
    }
    try {
      window.katex.render(source, els.latexPreview, {
        displayMode: true,
        throwOnError: true,
        strict: false,
        trust: false,
        output: "htmlAndMathml",
      });
    } catch (error) {
      els.latexPreview.innerHTML = '<span class="latex-placeholder">无法渲染这个公式</span>';
      els.latexError.hidden = false;
      els.latexError.textContent = String(error.message || error).replace(/^KaTeX parse error:\s*/, "");
      els.latexStatus.textContent = "语法错误";
      els.latexStatus.style.color = "#fca5a5";
    }
  }

  function insertLatex(text, caretOffset = null) {
    const input = els.latexInput;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.setRangeText(text, start, end, "end");
    if (caretOffset !== null) {
      const position = start + caretOffset;
      input.setSelectionRange(position, position);
    }
    input.focus();
    renderLatex();
  }

  async function syncMaximized() {
    const maximized = await callApi("window_is_maximized");
    if (typeof maximized !== "boolean") return;
    document.documentElement.classList.toggle("is-maximized", maximized);
    els.winMax.title = maximized ? "还原" : "最大化";
    els.winMax.setAttribute("aria-label", maximized ? "还原" : "最大化");
  }

  async function toggleMaximized() {
    const maximized = await callApi("window_maximize");
    if (typeof maximized !== "boolean") return;
    document.documentElement.classList.toggle("is-maximized", maximized);
    els.winMax.title = maximized ? "还原" : "最大化";
    els.winMax.setAttribute("aria-label", maximized ? "还原" : "最大化");
  }

  async function copyLatex() {
    const source = els.latexInput.value.trim();
    if (!source) {
      showToast("∑", "还没有公式", "请先输入 LaTeX 代码", true);
      return;
    }
    const ok = await copyText(source);
    if (!ok) {
      showToast("!", "复制失败", "剪贴板暂时不可用，请重试", true);
      return;
    }
    showToast("∑", "已复制 LaTeX", source.length > 42 ? `${source.slice(0, 42)}…` : source);
  }

  function bindEvents() {
    els.winMin.addEventListener("click", () => {
      callApi("window_minimize");
    });
    els.winMax.addEventListener("click", toggleMaximized);
    els.winClose.addEventListener("click", () => {
      callApi("window_close");
    });
    els.windowbar.addEventListener("dblclick", (event) => {
      if (event.target.closest(".window-controls")) return;
      toggleMaximized();
    });
    $$(".resize-handle").forEach((handle) => {
      handle.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        if (!window.pywebview?.api?.begin_resize) return;
        try {
          window.pywebview.api.begin_resize(handle.dataset.resize);
        } catch {
          /* Ignore bridge failures while closing. */
        }
      });
    });
    window.addEventListener("resize", () => syncMaximized());

    $("#brandBtn").addEventListener("click", () => {
      resetFilters();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $$(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        const action = link.dataset.action;
        if (action === "library") {
          resetFilters();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (action === "favorites") {
          setFavoritesOnly(!state.favoritesOnly);
        } else if (action === "recent") {
          openRecent();
        } else if (action === "shortcuts") {
          openModal(els.shortcutsModal);
        }
      });
    });

    els.search.addEventListener("input", () => {
      els.searchClear.hidden = !els.search.value;
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        state.query = els.search.value;
        render();
      }, 60);
    });

    els.search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (els.search.value) {
          els.search.value = "";
          state.query = "";
          render();
        } else {
          els.search.blur();
        }
      } else if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        window.clearTimeout(searchTimer);
        state.query = els.search.value;
        render();
        const first = visibleSymbols()[0];
        if (first) copySymbol(first);
      }
    });

    els.searchClear.addEventListener("click", () => {
      els.search.value = "";
      state.query = "";
      els.search.focus();
      render();
    });

    els.favoritesToggle.addEventListener("click", () => setFavoritesOnly(!state.favoritesOnly));
    els.resetFilters.addEventListener("click", resetFilters);
    $("#emptyReset").addEventListener("click", () => {
      if (state.favoritesOnly) {
        resetFilters();
      } else {
        resetFilters();
      }
    });
    els.emptyState.addEventListener("click", (event) => {
      const example = event.target.closest(".inline-example");
      if (!example) return;
      els.search.value = example.dataset.query;
      state.query = example.dataset.query;
      els.search.focus();
      render();
    });

    els.overlay.addEventListener("click", closeAll);
    document.addEventListener("click", (event) => {
      const closer = event.target.closest("[data-close]");
      if (closer) closeAll();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (!els.detailModal.hidden || !els.latexModal.hidden || !els.shortcutsModal.hidden || !els.recentDrawer.hidden) {
          event.preventDefault();
          closeAll();
          return;
        }
        if (els.search.value) {
          els.search.value = "";
          state.query = "";
          render();
          return;
        }
      }

      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
      if (!typing && (event.key === "/" || (event.ctrlKey && event.key.toLowerCase() === "k"))) {
        event.preventDefault();
        els.search.focus();
        els.search.select();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        els.search.focus();
        els.search.select();
        return;
      }
      if (event.key === "F5" || (event.ctrlKey && event.key.toLowerCase() === "r")) {
        event.preventDefault();
      }
    });

    els.detailCopyBtn.addEventListener("click", () => {
      if (currentDetail) copySymbol(currentDetail, null, "已复制符号");
    });
    els.detailLatexBtn.addEventListener("click", async () => {
      if (!currentDetail?.latex) return;
      const ok = await copyText(currentDetail.latex);
      showToast(ok ? "∑" : "!", ok ? "已复制 LaTeX" : "复制失败", currentDetail.latex, !ok);
    });
    els.detailFavBtn.addEventListener("click", () => {
      if (currentDetail) {
        toggleFavorite(currentDetail.key);
        syncDetailFavorite();
      }
    });
    els.detailGoCategory.addEventListener("click", () => {
      if (!currentDetail?.categoryId) return;
      const id = currentDetail.categoryId;
      closeAll();
      setCategory(id);
    });
    $(".detail-grid").addEventListener("click", async (event) => {
      const button = event.target.closest(".copy-value");
      if (!button || !button.dataset.copyValue) return;
      const ok = await copyText(button.dataset.copyValue);
      showToast(ok ? "⧉" : "!", ok ? "已复制" : "复制失败", button.dataset.copyValue, !ok);
    });

    $("#latexBtn").addEventListener("click", openLatex);
    els.latexInput.addEventListener("input", () => {
      window.clearTimeout(latexTimer);
      latexTimer = window.setTimeout(renderLatex, 130);
    });
    $("#latexClear").addEventListener("click", () => {
      els.latexInput.value = "";
      renderLatex();
      els.latexInput.focus();
    });
    $("#latexReset").addEventListener("click", () => {
      els.latexInput.value = "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}";
      renderLatex();
      els.latexInput.focus();
    });
    $("#latexCopy").addEventListener("click", copyLatex);
    $("#latexPalette").addEventListener("click", (event) => {
      const button = event.target.closest("[data-insert]");
      if (!button) return;
      const insert = button.dataset.insert;
      const caret = insert.startsWith("\\frac") ? 6 : insert.startsWith("\\sqrt") ? 6 : insert.startsWith("\\sum") ? 6 : null;
      insertLatex(insert, caret);
    });

    els.clearRecent.addEventListener("click", () => {
      if (!state.recent.length) return;
      state.recent = [];
      saveState();
      renderRecent();
      showToast("∅", "已清空复制记录", "最近复制已重置");
    });

    document.addEventListener("contextmenu", (event) => {
      if (!event.target.closest("input, textarea")) event.preventDefault();
    });
    document.addEventListener("dragover", (event) => event.preventDefault());
    document.addEventListener("drop", (event) => event.preventDefault());

    window.addEventListener("pywebviewready", async () => {
      syncMaximized();
      try {
        const remote = await window.pywebview.api.load_state();
        if (remote && typeof remote === "object") {
          const localTime = state.updatedAt || 0;
          const remoteTime = Number(remote.updatedAt) || 0;
          if (remoteTime > localTime) adoptState(remote);
        }
      } catch {
        /* Local storage remains the fallback. */
      }
    });
  }

  function init() {
    renderCategories();
    els.search.value = "";
    els.searchClear.hidden = true;
    bindEvents();
    render();
  }

  init();
})();

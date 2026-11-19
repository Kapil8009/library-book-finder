/* ==========================================================================
   app.js — navigation, search, book details, library layout, toasts.
   Exposes a single global object, LBF, used by scanner.js and admin.js.
   ========================================================================== */
const LBF = (function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const VIEWS = ["home", "find", "scan", "layout", "details", "admin", "about"];
  const COVERS = {
    "Computer Science": ["#0b1f3a", "#14b8a6"], "Mathematics": ["#3b1f6b", "#8b5cf6"],
    "Physics": ["#0c3b66", "#38bdf8"], "Chemistry": ["#14532d", "#4ade80"],
    "English": ["#7c2d12", "#fb923c"], "History": ["#5b2a0b", "#d4a05a"],
    "General Knowledge": ["#134e4a", "#5eead4"]
  };

  let books = [];
  const state = { q: "", cat: "All", status: "All", selectedId: null, floor: "Ground Floor", rack: null, view: "home" };

  /* ---------- small helpers ---------- */

  /* Escape text before putting it in innerHTML (prevents broken markup / XSS). */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = id => books.find(x => x.id === id);
  const baseUrl = () => location.origin + location.pathname.replace(/index\.html$/, "");

  /* Show a toast message that disappears by itself. type: info | ok | error */
  function toast(msg, type = "info") {
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = msg;
    $("#toasts").appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 3200);
  }

  /* Brief full-screen loading spinner. */
  function loading(ms = 350) {
    const l = $("#loader");
    l.classList.add("show");
    setTimeout(() => l.classList.remove("show"), ms);
  }

  /* Draws a book cover as an SVG data URI (no image files needed). */
  function cover(book) {
    const [c1, c2] = COVERS[book.category] || COVERS["Computer Science"];
    const words = book.title.split(" "), lines = [];
    let cur = "";
    words.forEach(w => { if ((cur + " " + w).trim().length > 13) { lines.push(cur.trim()); cur = w; } else cur += " " + w; });
    if (cur.trim()) lines.push(cur.trim());
    const text = lines.slice(0, 5).map((l, i) =>
      `<text x="20" y="${70 + i * 24}" font-family="Georgia,serif" font-size="19" font-weight="700" fill="#fff">${esc(l)}</text>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs><rect width="200" height="280" fill="url(#g)"/><rect x="0" y="0" width="12" height="280" fill="${c2}"/><rect x="20" y="30" width="46" height="4" fill="${c2}"/>${text}<text x="20" y="258" font-family="Arial,sans-serif" font-size="11" fill="#e2e8f0">${esc(book.author.slice(0, 26))}</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  const badge = s => `<span class="badge ${s === "Available" ? "ok" : "no"}">${esc(s)}</span>`;

  /* ---------- search ---------- */

  /* Case-insensitive, partial-match search over title, author, ISBN, category,
     id and rack. Every typed word must match somewhere. Returns sorted books. */
  function search(q, cat = "All", status = "All") {
    const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const out = [];
    books.forEach(bk => {
      if (cat !== "All" && bk.category !== cat) return;
      if (status !== "All" && bk.status !== status) return;
      const title = bk.title.toLowerCase(), author = bk.author.toLowerCase();
      const isbn = bk.isbn.toLowerCase(), isbnDigits = isbn.replace(/-/g, "");
      const hay = [title, author, isbn, isbnDigits, bk.category.toLowerCase(), bk.id.toLowerCase(), bk.rack.toLowerCase()].join(" ");
      if (!tokens.every(t => hay.includes(t))) return;
      let score = 0;
      tokens.forEach(t => {
        if (title.startsWith(t)) score += 5; else if (title.includes(t)) score += 3;
        if (author.includes(t)) score += 2;
        if (isbnDigits.includes(t.replace(/-/g, ""))) score += 4;
      });
      out.push({ bk, score });
    });
    out.sort((a, b) => b.score - a.score || b.bk.popularity - a.bk.popularity || a.bk.title.localeCompare(b.bk.title));
    return out.map(o => o.bk);
  }

  /* One book card used in every list. */
  function card(bk) {
    return `<article class="book-card" tabindex="0" data-book="${esc(bk.id)}" role="button" aria-label="${esc(bk.title)} by ${esc(bk.author)}">
      <img src="${cover(bk)}" alt="Cover of ${esc(bk.title)}" loading="lazy">
      <div class="bc-body">
        <h3>${esc(bk.title)}</h3><p>${esc(bk.author)}</p>
        <div class="bc-meta">${badge(bk.status)}<span class="loc">${esc(bk.rack)} · Shelf ${esc(bk.shelf)}</span></div>
      </div></article>`;
  }

  /* Re-run the Find page search with current state. */
  function runSearch() {
    const res = search(state.q, state.cat, state.status);
    $("#results").innerHTML = res.map(card).join("");
    $("#emptyState").hidden = res.length > 0;
    const filtered = state.q || state.cat !== "All" || state.status !== "All";
    $("#resultInfo").textContent = res.length ? `${res.length} book${res.length > 1 ? "s" : ""} ${filtered ? "found" : "in the library"}` : "";
    if (!res.length) $("#emptyText").textContent = state.q ? `Nothing matches “${state.q}”. Check the spelling, try fewer words, or search by ISBN.` : "No books match these filters.";
    $("#clearSearch").hidden = !state.q;
    $$("#catFilters .chip").forEach(c => c.classList.toggle("active", c.dataset.cat === state.cat));
  }

  /* Live suggestions dropdown under the search box. */
  function showSuggestions() {
    const box = $("#suggestions");
    const q = $("#searchInput").value.trim();
    if (!q) { box.hidden = true; return; }
    const res = search(q).slice(0, 6);
    box.innerHTML = res.length
      ? res.map(bk => `<li role="option" data-book="${esc(bk.id)}"><b>${esc(bk.title)}</b><span>${esc(bk.author)} · ${esc(bk.category)}</span></li>`).join("")
      : `<li class="none">No suggestions</li>`;
    box.hidden = false;
  }

  function addHistory(q) {
    q = q.trim(); if (q.length < 2) return;
    let h = Store.read(Store.KEYS.history, []).filter(x => x.toLowerCase() !== q.toLowerCase());
    h.unshift(q); Store.write(Store.KEYS.history, h.slice(0, 8));
    renderHistory();
  }

  function renderHistory() {
    const h = Store.read(Store.KEYS.history, []);
    $("#historyBox").hidden = !h.length;
    $("#historyList").innerHTML = h.map(x => `<button class="chip" data-q="${esc(x)}">${esc(x)}</button>`).join("");
  }

  /* Go to the Find page with a query (used by hero, scanner, deep links). */
  function goSearch(q, cat) {
    state.q = q || ""; state.cat = cat || "All"; state.status = "All";
    $("#searchInput").value = state.q; $("#statusFilter").value = "All";
    if (state.q) addHistory(state.q);
    navigate("find");
  }

  /* ---------- home ---------- */

  function viewCount(id) { return Store.read(Store.KEYS.views, {})[id] || 0; }

  function renderHome() {
    const avail = books.filter(x => x.status === "Available").length;
    $("#stats").innerHTML = [[books.length, "Books"], [avail, "Available now"], [books.length - avail, "Issued"], [Object.keys(SECTIONS).length, "Sections"]]
      .map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
    $("#homeCats").innerHTML = CATEGORIES.map(c => `<button class="chip" data-gocat="${esc(c)}">${esc(c)} <small>${books.filter(x => x.category === c).length}</small></button>`).join("");
    const popular = books.slice().sort((a, b) => (b.popularity + viewCount(b.id) * 5) - (a.popularity + viewCount(a.id) * 5)).slice(0, 6);
    $("#popularList").innerHTML = popular.map(card).join("");
    const recent = Store.read(Store.KEYS.recent, []).map(byId).filter(Boolean);
    $("#recentBox").hidden = !recent.length;
    $("#recentList").innerHTML = recent.map(card).join("");
  }

  /* ---------- book details ---------- */

  function openBook(id) {
    const bk = byId(id);
    if (!bk) { toast("That book is no longer in the catalogue.", "error"); return; }
    loading(300);
    state.selectedId = id; state.floor = bk.floor; state.rack = bk.rack;
    const recent = Store.read(Store.KEYS.recent, []).filter(x => x !== id); recent.unshift(id);
    Store.write(Store.KEYS.recent, recent.slice(0, 6));
    const views = Store.read(Store.KEYS.views, {}); views[id] = (views[id] || 0) + 1; Store.write(Store.KEYS.views, views);
    if (state.q) addHistory(state.q);
    navigate("details");
  }

  function renderDetails() {
    const wrap = $("#detailsContent");
    const bk = byId(state.selectedId);
    if (!bk) {
      wrap.innerHTML = `<div class="empty"><div class="empty-icon">i</div><h3>No book selected</h3><p>Search for a book and select it to see where it sits.</p><button class="btn btn-teal" data-nav="find">Find a book</button></div>`;
      return;
    }
    const path = [["Library", bk.floor], ["Section " + bk.section, bk.category], ["Rack " + bk.rack, "Rack number"], ["Shelf " + bk.shelf, "Counted from the top"]];
    wrap.innerHTML = `
      <button class="link-btn no-print" data-nav="find">&larr; Back to results</button>
      <article class="card details print-area">
        <img class="d-cover" src="${cover(bk)}" alt="Cover of ${esc(bk.title)}">
        <div class="d-main">
          <div class="row-between"><span class="tag">${esc(bk.category)}</span>${badge(bk.status)}</div>
          <h1>${esc(bk.title)}</h1>
          <p class="muted">by ${esc(bk.author)}</p>
          <ul class="path" aria-label="Location path">${path.map(p => `<li><b>${esc(p[0])}</b><small>${esc(p[1])}</small></li>`).join("")}</ul>
          <dl class="facts">
            <div><dt>ISBN</dt><dd>${esc(bk.isbn)}</dd></div>
            <div><dt>Section</dt><dd>${esc(bk.section)}</dd></div>
            <div><dt>Floor</dt><dd>${esc(bk.floor)}</dd></div>
            <div><dt>Rack number</dt><dd>${esc(bk.rack)}</dd></div>
            <div><dt>Shelf number</dt><dd>${esc(bk.shelf)}</dd></div>
            <div><dt>Exact location</dt><dd>${esc(bk.floor)}, Section ${esc(bk.section)}, Rack ${esc(bk.rack)}, Shelf ${esc(bk.shelf)}</dd></div>
          </dl>
          ${bk.status === "Issued" ? `<p class="notice small">This copy is currently issued. Ask at the circulation desk to reserve it.</p>` : ""}
          <div class="btn-row no-print">
            <button class="btn btn-teal" data-nav="layout">Show on library map</button>
            <button class="btn btn-ghost-dark" id="printBook">Print location</button>
            <button class="btn btn-ghost-dark" id="shareBook">Copy link</button>
          </div>
        </div>
      </article>`;
  }

  /* ---------- library layout ---------- */

  function renderLayout() {
    $("#floorTabs").innerHTML = FLOORS.map(f => `<button class="chip ${f === state.floor ? "active" : ""}" role="tab" data-floor="${esc(f)}">${esc(f)}</button>`).join("");
    const counts = {};
    books.forEach(x => { counts[x.rack] = (counts[x.rack] || 0) + 1; });
    const bk = byId(state.selectedId);
    const secs = Object.keys(SECTIONS).filter(s => SECTIONS[s].floor === state.floor);
    let html = `<div class="map-top"><span class="door">Entrance / Stairs / Lift</span><span class="desk">Circulation desk</span></div><div class="map-sections">`;
    secs.forEach(s => {
      const hl = bk && bk.section === s;
      let racks = "";
      for (let i = 1; i <= RACKS_PER_SECTION; i++) {
        const r = `${s}-${String(i).padStart(2, "0")}`;
        const sel = bk && bk.rack === r, act = state.rack === r;
        racks += `<button class="rack ${sel ? "sel" : ""} ${act ? "act" : ""}" data-rack="${r}" title="${counts[r] || 0} book(s)">${r}<small>${counts[r] || 0}</small></button>`;
      }
      html += `<div class="section ${hl ? "hl" : ""}"><h3>Section ${s}<small>${esc(SECTIONS[s].category)}</small></h3><div class="racks">${racks}</div></div>`;
    });
    $("#layoutMap").innerHTML = html + "</div>";

    const g = $("#layoutGuide");
    if (bk) {
      g.innerHTML = `<h3>How to reach “${esc(bk.title)}”</h3><ol>
        <li>Go to the <b>${esc(bk.floor)}</b> (stairs or lift from the entrance).</li>
        <li>Find <b>Section ${esc(bk.section)}</b>: ${esc(bk.category)}.</li>
        <li>Walk to <b>Rack ${esc(bk.rack)}</b>, the highlighted rack on the map.</li>
        <li>Look at <b>Shelf ${esc(bk.shelf)}</b>, counting from the top. ${bk.status === "Issued" ? "This copy is issued, so ask the desk." : "The book should be there."}</li></ol>`;
    } else {
      g.innerHTML = `<h3>Location guide</h3><p class="muted">Select a book from the Find page and its rack will be highlighted here.</p>`;
    }
    showRackBooks();
  }

  function showRackBooks() {
    const box = $("#rackBooks");
    if (!state.rack) { box.innerHTML = ""; return; }
    const list = books.filter(x => x.rack === state.rack).sort((a, b) => a.shelf.localeCompare(b.shelf));
    box.innerHTML = `<h2>Books on rack ${esc(state.rack)}</h2>` + (list.length ? `<div class="grid">${list.map(card).join("")}</div>` : `<p class="muted">No books are recorded on this rack.</p>`);
  }

  /* ---------- navigation ---------- */

  /* Show one view, hide the rest, update the nav highlight and URL hash. */
  function navigate(view, push = true) {
    if (!VIEWS.includes(view)) view = "home";
    if (state.view === "scan" && view !== "scan" && window.Scanner) Scanner.stop();
    state.view = view;
    $$(".view").forEach(v => { v.hidden = v.id !== "view-" + view; });
    $$("#mainNav a").forEach(a => a.classList.toggle("active", a.dataset.nav === view));
    if (push && location.hash !== "#" + view) history.pushState(null, "", "#" + view);
    $("#mainNav").classList.remove("open"); $("#burger").setAttribute("aria-expanded", "false");
    if (view === "home") renderHome();
    if (view === "find") { runSearch(); renderHistory(); }
    if (view === "layout") renderLayout();
    if (view === "details") renderDetails();
    if (view === "admin" && window.Admin) Admin.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- events ---------- */

  function bindEvents() {
    // One delegated click handler covers nav links, cards, chips and suggestions.
    document.addEventListener("click", e => {
      const t = e.target;
      const nav = t.closest("[data-nav]"); if (nav) { e.preventDefault(); navigate(nav.dataset.nav); return; }
      const bookEl = t.closest("[data-book]"); if (bookEl) { $("#suggestions").hidden = true; openBook(bookEl.dataset.book); return; }
      const hq = t.closest("[data-q]"); if (hq) { goSearch(hq.dataset.q); return; }
      const gc = t.closest("[data-gocat]"); if (gc) { goSearch("", gc.dataset.gocat); return; }
      const fc = t.closest("#catFilters .chip"); if (fc) { state.cat = fc.dataset.cat; runSearch(); return; }
      const fl = t.closest("[data-floor]"); if (fl) { state.floor = fl.dataset.floor; state.rack = null; renderLayout(); return; }
      const rk = t.closest("[data-rack]"); if (rk) { state.rack = rk.dataset.rack; renderLayout(); return; }
      if (!t.closest(".searchbox")) $("#suggestions").hidden = true;
    });
    document.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches(".book-card")) { e.preventDefault(); openBook(e.target.dataset.book); }
    });

    $("#burger").addEventListener("click", () => {
      const open = $("#mainNav").classList.toggle("open"); $("#burger").setAttribute("aria-expanded", open);
    });
    window.addEventListener("hashchange", () => navigate(location.hash.slice(1) || "home", false));

    $("#heroForm").addEventListener("submit", e => { e.preventDefault(); goSearch($("#heroInput").value); });

    const input = $("#searchInput");
    input.addEventListener("input", () => { state.q = input.value; runSearch(); showSuggestions(); });
    input.addEventListener("keydown", e => { if (e.key === "Enter") { addHistory(input.value); $("#suggestions").hidden = true; loading(250); } });
    $("#clearSearch").addEventListener("click", () => { input.value = ""; state.q = ""; runSearch(); $("#suggestions").hidden = true; input.focus(); });
    $("#statusFilter").addEventListener("change", e => { state.status = e.target.value; runSearch(); });
    $("#resetFilters").addEventListener("click", () => { state.q = ""; state.cat = "All"; state.status = "All"; input.value = ""; $("#statusFilter").value = "All"; runSearch(); });
    $("#clearHistory").addEventListener("click", () => { Store.write(Store.KEYS.history, []); renderHistory(); toast("Search history cleared"); });
    $("#clearRecent").addEventListener("click", () => { Store.write(Store.KEYS.recent, []); renderHome(); toast("Recently viewed cleared"); });

    // Buttons inside the details card are re-rendered, so listen on the container.
    $("#detailsContent").addEventListener("click", e => {
      if (e.target.id === "printBook") window.print();
      if (e.target.id === "shareBook") copyText(`${baseUrl()}?book=${state.selectedId}`);
    });
  }

  /* Copy text to the clipboard, with a fallback for older browsers. */
  function copyText(text) {
    const done = () => toast("Link copied", "ok");
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, () => toast("Could not copy the link", "error")); return; }
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("Could not copy the link", "error"); }
    ta.remove();
  }

  /* ---------- start-up ---------- */

  function init() {
    books = Store.loadBooks();
    $("#catFilters").innerHTML = `<button class="chip" data-cat="All">All</button>` + CATEGORIES.map(c => `<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
    bindEvents();
    const params = new URLSearchParams(location.search);
    const startView = location.hash.slice(1);
    if (params.get("book") && byId(params.get("book"))) { state.selectedId = params.get("book"); navigate("details", false); }
    else if (params.get("q")) { goSearch(params.get("q")); }
    else navigate(VIEWS.includes(startView) ? startView : "home", false);
    setTimeout(() => $("#loader").classList.remove("show"), 500);
  }

  return {
    init, navigate, toast, esc, openBook, goSearch, cover, badge, loading, copyText, baseUrl,
    books: () => books,
    /* Called by admin.js after it changes the books array. */
    commit() { Store.saveBooks(books) || toast("Could not save: browser storage is blocked", "error"); renderHome(); runSearch(); },
    replaceBooks(list) { books = list; this.commit(); }
  };
})();

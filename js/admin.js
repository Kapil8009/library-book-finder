/* ==========================================================================
   admin.js — add / edit / delete books, availability, import/export,
   and the QR code generator. Frontend-only: data is saved in localStorage.
   ========================================================================== */
const Admin = (function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const esc = s => LBF.esc(s);
  let editingId = null, filter = "";

  /* Fill the select boxes in the form (runs once). */
  function setupForm() {
    $("#fCategory").innerHTML = CATEGORIES.map(c => `<option>${esc(c)}</option>`).join("");
    $("#fSection").innerHTML = Object.keys(SECTIONS).map(s => `<option value="${s}">Section ${s} — ${esc(SECTIONS[s].category)}</option>`).join("");
    $("#fShelf").innerHTML = Array.from({ length: SHELVES_PER_RACK }, (_, i) => `<option>${String(i + 1).padStart(2, "0")}</option>`).join("");
    syncSection();
    $("#qrTarget").innerHTML = `<option value="site">The Book Finder home page</option>` +
      LBF.books().map(b => `<option value="${esc(b.id)}">Book: ${esc(b.title)}</option>`).join("");
    $("#qrUrl").value = LBF.baseUrl();
  }

  /* When the section changes: refill racks, set the floor, suggest the category. */
  function syncSection(keepRack) {
    const s = $("#fSection").value, prev = keepRack || "";
    $("#fFloor").value = SECTIONS[s].floor;
    $("#fRack").innerHTML = Array.from({ length: RACKS_PER_SECTION }, (_, i) => {
      const r = `${s}-${String(i + 1).padStart(2, "0")}`;
      return `<option ${r === prev ? "selected" : ""}>${r}</option>`;
    }).join("");
    if (!keepRack) $("#fCategory").value = SECTIONS[s].category;
  }

  function nextId() {
    const max = LBF.books().reduce((m, b) => Math.max(m, parseInt(b.id.replace(/\D/g, ""), 10) || 0), 0);
    return "B" + String(max + 1).padStart(3, "0");
  }

  /* ISBN-10 or ISBN-13, with or without hyphens (last char of ISBN-10 may be X). */
  const validIsbn = v => /^(\d{9}[\dX]|\d{13})$/i.test(v.replace(/[-\s]/g, ""));

  function resetForm() {
    editingId = null;
    $("#bookForm").reset();
    $("#formTitle").textContent = "Add a book";
    $("#fSubmit").textContent = "Add book";
    $("#fCancel").hidden = true;
    syncSection();
  }

  /* Validate the form, then add or update a record. */
  function submitForm(e) {
    e.preventDefault();
    const title = $("#fTitle").value.trim(), author = $("#fAuthor").value.trim(), isbn = $("#fIsbn").value.trim();
    if (!title || !author) { LBF.toast("Title and author are required", "error"); return; }
    if (!validIsbn(isbn)) { LBF.toast("Enter a valid 10 or 13 digit ISBN", "error"); return; }
    const clean = isbn.replace(/[-\s]/g, "").toUpperCase();
    const dup = LBF.books().find(b => b.isbn.replace(/[-\s]/g, "").toUpperCase() === clean && b.id !== editingId);
    if (dup) { LBF.toast(`That ISBN already belongs to “${dup.title}”`, "error"); return; }

    const section = $("#fSection").value;
    const data = {
      title, author, isbn, category: $("#fCategory").value, section, floor: SECTIONS[section].floor,
      rack: $("#fRack").value, shelf: $("#fShelf").value, status: $("#fStatus").value
    };
    const list = LBF.books();
    if (editingId) {
      const i = list.findIndex(b => b.id === editingId);
      if (i < 0) { LBF.toast("That record no longer exists", "error"); resetForm(); return; }
      list[i] = Object.assign({}, list[i], data);
      LBF.toast("Book updated", "ok");
    } else {
      list.push(Object.assign({ id: nextId(), popularity: 40 }, data));
      LBF.toast("Book added", "ok");
    }
    LBF.commit(); resetForm(); render();
  }

  function startEdit(id) {
    const b = LBF.books().find(x => x.id === id); if (!b) return;
    editingId = id;
    $("#fTitle").value = b.title; $("#fAuthor").value = b.author; $("#fIsbn").value = b.isbn;
    $("#fSection").value = b.section; syncSection(b.rack);
    $("#fCategory").value = b.category; $("#fShelf").value = b.shelf; $("#fStatus").value = b.status;
    $("#formTitle").textContent = "Edit book " + b.id;
    $("#fSubmit").textContent = "Save changes";
    $("#fCancel").hidden = false;
    $("#bookForm").scrollIntoView({ behavior: "smooth", block: "center" });
    $("#fTitle").focus();
  }

  function remove(id) {
    const list = LBF.books(), i = list.findIndex(b => b.id === id); if (i < 0) return;
    if (!confirm(`Delete “${list[i].title}”? This cannot be undone.`)) return;
    list.splice(i, 1);
    if (editingId === id) resetForm();
    LBF.commit(); render(); LBF.toast("Book deleted", "ok");
  }

  function toggleStatus(id) {
    const b = LBF.books().find(x => x.id === id); if (!b) return;
    b.status = b.status === "Available" ? "Issued" : "Available";
    LBF.commit(); render(); LBF.toast(`${b.title}: ${b.status}`, "ok");
  }

  /* Draw the records table (filtered by the admin search box). */
  function render() {
    const q = filter.toLowerCase();
    const list = LBF.books().filter(b => !q || [b.title, b.author, b.isbn, b.id, b.rack, b.category].join(" ").toLowerCase().includes(q));
    $("#adminCount").textContent = `(${list.length} of ${LBF.books().length})`;
    $("#adminRows").innerHTML = list.length ? list.map(b => `<tr>
      <td><b>${esc(b.title)}</b><br><span class="muted small">${esc(b.author)} · ${esc(b.id)}</span></td>
      <td>${esc(b.isbn)}</td>
      <td>${esc(b.floor)}<br><span class="muted small">Rack ${esc(b.rack)} · Shelf ${esc(b.shelf)}</span></td>
      <td><button class="status-btn" data-act="toggle" data-id="${esc(b.id)}" title="Click to change availability">${LBF.badge(b.status)}</button></td>
      <td class="actions"><button class="link-btn" data-act="edit" data-id="${esc(b.id)}">Edit</button><button class="link-btn danger" data-act="delete" data-id="${esc(b.id)}">Delete</button></td>
    </tr>`).join("") : `<tr><td colspan="5" class="muted center">No records match.</td></tr>`;
    // Keep the QR "book" dropdown in sync with the catalogue.
    const sel = $("#qrTarget"), cur = sel.value;
    sel.innerHTML = `<option value="site">The Book Finder home page</option>` + LBF.books().map(b => `<option value="${esc(b.id)}">Book: ${esc(b.title)}</option>`).join("");
    sel.value = [...sel.options].some(o => o.value === cur) ? cur : "site";
  }

  /* ---------- QR code generator ---------- */

  function qrText() {
    let url = $("#qrUrl").value.trim();
    if (!/^https?:\/\//i.test(url)) return null;
    if (!url.endsWith("/") && !/\.html?$/i.test(url)) url += "/";
    const t = $("#qrTarget").value;
    return t === "site" ? url : `${url}?book=${encodeURIComponent(t)}`;
  }

  function makeQr() {
    const text = qrText();
    if (!text) { LBF.toast("Enter a full URL starting with https://", "error"); return false; }
    if (typeof QRCode === "undefined") { LBF.toast("QR library failed to load. Check your internet connection.", "error"); return false; }
    if (/localhost|127\.0\.0\.1|^file:/i.test(text)) LBF.toast("This looks like a local address. Phones can't open it. Use your GitHub Pages URL.", "error");
    const box = $("#qrBox"); box.innerHTML = "";
    new QRCode(box, { text, width: 512, height: 512, colorDark: "#0b1f3a", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
    $("#qrLink").textContent = text;
    return true;
  }

  /* Returns a canvas with the QR plus a white margin, or null if none exists. */
  function qrCanvas() {
    const src = $("#qrBox canvas"); if (!src) return null;
    const pad = 48, c = document.createElement("canvas");
    c.width = src.width + pad * 2; c.height = src.height + pad * 2;
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(src, pad, pad);
    return c;
  }

  function downloadQr() {
    if (!$("#qrBox canvas") && !makeQr()) return;
    const c = qrCanvas(); if (!c) { LBF.toast("Could not create the PNG", "error"); return; }
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png"); a.download = "library-book-finder-qr.png";
    document.body.appendChild(a); a.click(); a.remove();
    LBF.toast("QR code downloaded", "ok");
  }

  /* Print only the QR card (print CSS hides everything else). */
  function printQr() {
    if (!$("#qrBox canvas") && !makeQr()) return;
    document.body.classList.add("print-qr");
    const done = () => { document.body.classList.remove("print-qr"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  }

  /* ---------- import / export ---------- */

  function exportJson() {
    const blob = new Blob([JSON.stringify(LBF.books(), null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "books-export.json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    LBF.toast("Exported books-export.json", "ok");
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data) || !data.length || !data.every(x => Store.isValid(x))) throw new Error("bad");
        data.forEach(x => { x.popularity = Number(x.popularity) || 40; });
        LBF.replaceBooks(data); resetForm(); render(); LBF.toast(`Imported ${data.length} books`, "ok");
      } catch (e) { LBF.toast("That file is not a valid books JSON export", "error"); }
    };
    reader.onerror = () => LBF.toast("Could not read the file", "error");
    reader.readAsText(file);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupForm();
    render(); makeQrQuiet();
    $("#fSection").addEventListener("change", () => syncSection());
    $("#bookForm").addEventListener("submit", submitForm);
    $("#fCancel").addEventListener("click", resetForm);
    $("#adminSearch").addEventListener("input", e => { filter = e.target.value.trim(); render(); });
    $("#adminRows").addEventListener("click", e => {
      const btn = e.target.closest("[data-act]"); if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.act === "edit") startEdit(id);
      if (btn.dataset.act === "delete") remove(id);
      if (btn.dataset.act === "toggle") toggleStatus(id);
    });
    $("#qrMake").addEventListener("click", () => { if (makeQr()) LBF.toast("QR code generated", "ok"); });
    $("#qrDownload").addEventListener("click", downloadQr);
    $("#qrPrint").addEventListener("click", printQr);
    $("#exportBtn").addEventListener("click", exportJson);
    $("#importFile").addEventListener("change", e => { importJson(e.target.files[0]); e.target.value = ""; });
    $("#resetBtn").addEventListener("click", () => {
      if (!confirm("Reset all books to the sample data? Your changes will be lost.")) return;
      LBF.replaceBooks(Store.resetBooks()); resetForm(); render(); LBF.toast("Sample data restored", "ok");
    });
  });

  /* Called by app.js each time the Admin page opens. */
  return { render() { render(); if (!$("#qrBox canvas")) makeQrQuiet(); } };

  /* Generate the first QR silently (no toasts) so the card is never empty. */
  function makeQrQuiet() {
    if (typeof QRCode === "undefined") return;
    const text = qrText(); if (!text) return;
    const box = $("#qrBox"); box.innerHTML = "";
    new QRCode(box, { text, width: 512, height: 512, colorDark: "#0b1f3a", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
    $("#qrLink").textContent = text;
  }
})();

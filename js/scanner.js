/* ==========================================================================
   scanner.js — camera QR scanning (jsQR) with image-upload and manual fallbacks.
   ========================================================================== */
const Scanner = (function () {
  "use strict";
  const $ = s => document.querySelector(s);
  let stream = null, raf = 0, running = false;

  function setStatus(msg, isError) {
    const el = $("#scanStatus");
    el.textContent = msg;
    el.classList.toggle("error-text", !!isError);
  }

  function setOverlay(msg) {
    const el = $("#vfMsg");
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  /* Ask for the camera and start the scanning loop. */
  async function start() {
    if (running) return;
    if (typeof jsQR === "undefined") { setStatus("The QR library failed to load. Check your internet connection or use the manual search.", true); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("This browser cannot open the camera here. Camera access needs an https:// page. Use manual search or upload a QR image.", true);
      return;
    }
    try {
      setStatus("Waiting for camera permission…");
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      const video = $("#video");
      video.srcObject = stream;
      await video.play();
      running = true;
      $("#viewfinder").classList.add("live");
      setOverlay("");
      $("#startScan").hidden = true; $("#stopScan").hidden = false;
      setStatus("Point the camera at the QR code.");
      raf = requestAnimationFrame(tick);
    } catch (err) {
      stop();
      const name = err && err.name;
      if (name === "NotAllowedError" || name === "SecurityError") setStatus("Camera permission was denied. Allow camera access in your browser settings, then try again.", true);
      else if (name === "NotFoundError" || name === "OverconstrainedError") setStatus("No camera was found on this device. Use manual search or upload a QR image.", true);
      else if (name === "NotReadableError") setStatus("The camera is in use by another app. Close it and try again.", true);
      else setStatus("Could not start the camera. Use manual search instead.", true);
    }
  }

  /* Read one video frame per animation tick and look for a QR code. */
  function tick() {
    if (!running) return;
    const video = $("#video");
    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
      const canvas = $("#scanCanvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      if (code && code.data) { stop(); handleResult(code.data); return; }
    }
    raf = requestAnimationFrame(tick);
  }

  /* Release the camera. Safe to call at any time. */
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    const video = $("#video"); if (video) video.srcObject = null;
    $("#viewfinder").classList.remove("live");
    setOverlay("Camera is off");
    $("#startScan").hidden = false; $("#stopScan").hidden = true;
  }

  /* Decide what a scanned code means:
     - a link to this site with ?book=ID  -> open that book
     - a link to this site with ?q=text   -> search for it
     - any other link to this site        -> open the Find page
     - plain text (title, ISBN, book id)  -> search for it
     - a link to some other site          -> ask before leaving */
  function handleResult(text, manual) {
    text = String(text).trim();
    if (!manual) LBF.toast("QR code scanned", "ok");
    try {
      const url = new URL(text);
      if (url.origin === location.origin) {
        const id = url.searchParams.get("book"), q = url.searchParams.get("q");
        if (id) { LBF.openBook(id); return; }
        if (q) { LBF.goSearch(q); return; }
        LBF.navigate("find"); return;
      }
      if (confirm("This QR code links to another website:\n" + url.href + "\n\nOpen it?")) window.open(url.href, "_blank", "noopener");
      else setStatus("Scan cancelled. Scan another code or search manually.");
      return;
    } catch (e) { /* not a URL: treat as plain text */ }
    const direct = LBF.books().find(b => b.id.toLowerCase() === text.toLowerCase());
    if (direct) LBF.openBook(direct.id); else LBF.goSearch(text);
  }

  /* Read a QR code from an uploaded photo or screenshot. */
  function scanFile(file) {
    if (!file) return;
    if (typeof jsQR === "undefined") { LBF.toast("QR library not loaded", "error"); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"), max = 1000, s = Math.min(1, max / Math.max(img.width, img.height));
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const code = jsQR(d.data, d.width, d.height);
      if (code && code.data) handleResult(code.data);
      else { setStatus("No QR code found in that image. Try a clearer, closer photo.", true); LBF.toast("No QR code found", "error"); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); LBF.toast("That file is not a readable image", "error"); };
    img.src = url;
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#startScan").addEventListener("click", start);
    $("#stopScan").addEventListener("click", () => { stop(); setStatus("Camera stopped."); });
    $("#qrFile").addEventListener("change", e => { scanFile(e.target.files[0]); e.target.value = ""; });
    $("#manualForm").addEventListener("submit", e => {
      e.preventDefault();
      const v = $("#manualInput").value.trim();
      if (!v) { LBF.toast("Type a title, author or ISBN first", "error"); return; }
      handleResult(v, true);
    });
  });

  return { start, stop, handleResult };
})();

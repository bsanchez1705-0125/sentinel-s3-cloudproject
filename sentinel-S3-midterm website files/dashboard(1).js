// ============================================================
//  dashboard.js  —  Fetches honeypot events from Lambda
//  and renders them into the #dashboard article panel.
// ============================================================

const SentinelDashboard = (() => {

  let allEvents = [];
  let filteredEvents = [];
  let currentPage = 1;
  const PAGE_SIZE = 10;

  // ---- Fetch ALL events using pagination --------------------

  async function fetchEvents() {
    showLoadingState();

    try {
      let allItems = [];
      let lastKey = null;

      // Loop to fetch all pages from DynamoDB via Lambda
      do {
        const url = lastKey
          ? `${SENTINEL_CONFIG.apiEndpoint}?lastKey=${encodeURIComponent(JSON.stringify(lastKey))}`
          : SENTINEL_CONFIG.apiEndpoint;

        const resp = await fetch(url, {
          headers: { "Content-Type": "application/json" },
        });

        if (!resp.ok) throw new Error(`API error: ${resp.status}`);

        const data = await resp.json();
        allItems = allItems.concat(data.items || []);
        lastKey = data.lastKey || null;

      } while (lastKey);

      allEvents = allItems;
      filteredEvents = [...allEvents];
      currentPage = 1;

      renderStats();
      renderTable();

    } catch (err) {
      console.error("Failed to fetch events:", err);
      showErrorState(err.message);
    }
  }

  // ---- Stats cards -----------------------------------------

  function renderStats() {
    const total      = allEvents.length;
    // src_ip is the real IP field in cowrieEvents
    const uniqueIPs  = new Set(allEvents.map(e => e.src_ip).filter(Boolean)).size;
    const uniqueUsers = new Set(allEvents.map(e => e.username).filter(Boolean)).size;

    // Most recent event — use sk (sort key) which is the timestamp
    const sorted = [...allEvents].sort(
      (a, b) => new Date(b.timestamp || (b.sk ? b.sk.split('#')[0] : '')) - new Date(a.timestamp || (a.sk ? a.sk.split('#')[0] : ''))
    );
    const lastSeen = sorted.length > 0
      ? formatDate(sorted[0].timestamp || (sorted[0].sk ? sorted[0].sk.split('#')[0] : null))
      : "—";

    setEl("stat-total",  total);
    setEl("stat-ips",    uniqueIPs);
    setEl("stat-users",  uniqueUsers);
    setEl("stat-last",   lastSeen);
  }

  // ---- Table -----------------------------------------------

  function renderTable() {
    const tbody = document.getElementById("events-tbody");
    if (!tbody) return;

    const start = (currentPage - 1) * PAGE_SIZE;
    const page  = filteredEvents.slice(start, start + PAGE_SIZE);

    if (page.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; opacity:0.5; padding: 2em 0;">
            No events found.
          </td>
        </tr>`;
      updatePagination();
      return;
    }

    tbody.innerHTML = page.map(e => `
      <tr>
        <td>${formatDate(e.timestamp || (e.sk ? e.sk.split('#')[0] : null))}</td>
        <td><span class="sentinel-ip">${escHtml(e.src_ip || "—")}</span></td>
        <td>${escHtml(e.username || "—")}</td>
        <td>${escHtml(e.password || "—")}</td>
        <td class="sentinel-commands">${escHtml(e.input || e.commands || "—")}</td>
      </tr>
    `).join("");

    updatePagination();
  }

  function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
    setEl("page-info", `Page ${currentPage} of ${totalPages}`);

    const prevBtn = document.getElementById("page-prev");
    const nextBtn = document.getElementById("page-next");
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  }

  function prevPage() {
    if (currentPage > 1) { currentPage--; renderTable(); }
  }

  function nextPage() {
    const totalPages = Math.ceil(filteredEvents.length / PAGE_SIZE);
    if (currentPage < totalPages) { currentPage++; renderTable(); }
  }

  // ---- Search / filter -------------------------------------

  function applyFilter(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      filteredEvents = [...allEvents];
    } else {
      filteredEvents = allEvents.filter(e =>
        (e.src_ip    || "").toLowerCase().includes(q) ||
        (e.username  || "").toLowerCase().includes(q) ||
        (e.password  || "").toLowerCase().includes(q) ||
        (e.input     || "").toLowerCase().includes(q)
      );
    }
    currentPage = 1;
    renderTable();
  }

  // ---- Loading / error states ------------------------------

  function showLoadingState() {
    const tbody = document.getElementById("events-tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 2em 0;">
            <span class="sentinel-loading">Loading events...</span>
          </td>
        </tr>`;
    }
    setEl("stat-total",  "…");
    setEl("stat-ips",    "…");
    setEl("stat-users",  "…");
    setEl("stat-last",   "…");
  }

  function showErrorState(msg) {
    const tbody = document.getElementById("events-tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:#ff6b6b; padding: 2em 0;">
            ⚠ Failed to load events: ${escHtml(msg)}
          </td>
        </tr>`;
    }
  }

  // ---- Helpers ---------------------------------------------

  function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(ts) {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString("en-US", {
        month: "short", day: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      });
    } catch { return ts; }
  }

  return { fetchEvents, applyFilter, prevPage, nextPage };
})();

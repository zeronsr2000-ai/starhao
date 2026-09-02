const defaults = window.STARHORIZON_DEFAULTS;
const api = window.StarhorizonFirebase;
let state = {
  site: defaults.site,
  home: defaults.home,
  pages: defaults.pages,
  about: defaults.about,
  works: defaults.works,
  services: defaults.services,
  extendedServices: defaults.extendedServices,
  partners: defaults.partners,
  process: defaults.process,
  inquiryForm: defaults.inquiryForm,
  media: [],
  inquiries: [],
};
let eventsReady = false;

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function safe(value) {
  return String(value ?? "").replace(/[<>"']/g, "");
}

function setStatus(message) {
  qsa("[data-admin-status]").forEach((node) => {
    node.textContent = message;
    node.classList.toggle("hidden", !message);
  });
}

function errorMessage(error) {
  return error && error.message ? error.message : "操作失敗，請稍後再試";
}

function setFormBusy(form, isBusy) {
  qsa("button", form).forEach((button) => {
    button.disabled = isBusy;
  });
}

function formToObject(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  qsa('input[type="checkbox"]', form).forEach((input) => {
    data[input.name] = input.checked;
  });
  qsa('input[type="number"]', form).forEach((input) => {
    data[input.name] = Number(input.value || 0);
  });
  qsa('input[type="file"]', form).forEach((input) => delete data[input.name]);
  return data;
}

function fillForm(form, data) {
  if (!form) return;
  Object.entries(data || {}).forEach(([key, value]) => {
    const input = form.elements[key];
    if (!input) return;
    if (input.type === "checkbox") {
      input.checked = Boolean(value);
    } else if (Array.isArray(value) || typeof value === "object") {
      input.value = JSON.stringify(value, null, 2);
    } else {
      input.value = value ?? "";
    }
  });
  qsa('input[type="file"]', form).forEach((input) => {
    input.value = "";
  });
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function collectionDefaults(collection) {
  if (collection === "works") {
    return { id: "", title: "", category: "品牌形象", client: "", year: "2026", coverClass: "g1", coverUrl: "", videoUrl: "", summary: "", featured: false, sort: state.works.length + 1, status: "published" };
  }
  if (collection === "services") {
    return { id: "", title: "", summary: "", target: "", deliverables: "", sort: state.services.length + 1, status: "published" };
  }
  if (collection === "extendedServices") {
    return { id: "", title: "", summary: "", target: "", deliverables: "", sort: state.extendedServices.length + 1, status: "published" };
  }
  if (collection === "partners") {
    return { id: "", title: "", imageUrl: "", alt: "", sort: state.partners.length + 1, status: "published" };
  }
  if (collection === "process") {
    return { id: "", title: "", body: "", sort: state.process.length + 1 };
  }
  return { id: "", title: "", type: "image", url: "", alt: "" };
}

async function loadAll() {
  const [site, home, pages, about, inquiryForm, works, services, extendedServices, partners, process, media, inquiries] = await Promise.all([
    api.getDoc("siteContent", "site", defaults.site),
    api.getDoc("siteContent", "home", defaults.home),
    api.getDoc("siteContent", "pages", defaults.pages),
    api.getDoc("siteContent", "about", defaults.about),
    api.getDoc("siteContent", "inquiryForm", defaults.inquiryForm),
    api.getCollection("works", defaults.works),
    api.getCollection("services", defaults.services),
    api.getCollection("extendedServices", defaults.extendedServices),
    api.getCollection("partners", defaults.partners),
    api.getCollection("process", defaults.process),
    api.getCollection("media", []),
    api.getCollection("inquiries", []),
  ]);
  state.site = site;
  state.home = home;
  state.pages = pages;
  state.about = about;
  state.inquiryForm = inquiryForm;
  state.works = works;
  state.services = services;
  state.extendedServices = extendedServices;
  state.partners = partners;
  state.process = process;
  state.media = media;
  state.inquiries = inquiries;
  render();
}

function renderCounts() {
  qs("[data-count-works]").textContent = state.works.length;
  qs("[data-count-services]").textContent = state.services.length;
  qs("[data-count-inquiries]").textContent = state.inquiries.length;
}

function renderForms() {
  fillForm(qs('[data-form="site"]'), state.site);
  fillForm(qs('[data-form="home"]'), state.home);
  fillForm(qs('[data-form="pages"]'), state.pages);
  fillForm(qs('[data-form="home"]'), {
    ...state.home,
    showreelBottom: (state.home.showreelBottom || []).join("\n"),
    tickerItems: (state.home.tickerItems || []).join("\n"),
  });
  fillForm(qs('[data-form="inquiryForm"]'), {
    videoTypeOptions: (state.inquiryForm.videoTypeOptions || []).join("\n"),
    shootingOptions: (state.inquiryForm.shootingOptions || []).join("\n"),
    budgetOptions: (state.inquiryForm.budgetOptions || []).join("\n"),
  });
  fillForm(qs('[data-form="about"]'), {
    ...state.about,
    team: JSON.stringify(state.about.team || [], null, 2),
    clients: JSON.stringify(state.about.clients || [], null, 2),
  });
}

function rowActions(collection, id) {
  return `
    <div class="actions">
      <button class="btn ghost" type="button" data-edit="${collection}" data-id="${safe(id)}">編輯</button>
      <button class="btn danger" type="button" data-delete="${collection}" data-id="${safe(id)}">刪除</button>
    </div>
  `;
}

function rowPreview(collection, item) {
  if ((collection === "partners" || collection === "works") && (item.imageUrl || item.coverUrl)) {
    const url = item.imageUrl || item.coverUrl;
    const alt = item.alt || item.title || "圖片預覽";
    return `<img class="row-thumb" src="${safe(url)}" alt="${safe(alt)}" loading="lazy" />`;
  }
  return "";
}

function rowMeta(collection, item) {
  if (collection === "partners") {
    return item.imageUrl ? "Logo 已設定" : "尚未設定 Logo";
  }
  if (collection === "works") {
    const parts = [];
    if (item.featured) parts.push("首頁精選");
    if (item.coverUrl) parts.push("封面已設定");
    if (item.videoUrl) parts.push("作品連結已設定");
    return parts.join("｜") || item.status || "";
  }
  return item.summary || item.body || item.url || item.status || item.category || "";
}

function renderCollection(collection, rows) {
  const list = qs(`[data-list="${collection}"]`);
  if (!list) return;
  list.innerHTML = rows
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .map((item) => {
      const preview = rowPreview(collection, item);
      return `
        <article class="row-card ${preview ? "has-preview" : ""}">
          ${preview}
          <div>
            <h3>${safe(item.title || item.name || item.email || item.id)}</h3>
            <p>${safe(rowMeta(collection, item))}</p>
          </div>
          ${rowActions(collection, item.id)}
        </article>
      `;
    })
    .join("");
}

function renderInquiries() {
  const list = qs('[data-list="inquiries"]');
  list.innerHTML = state.inquiries
    .map(
      (item) => `
        <article class="row-card">
          <div>
            <h3>${safe(item.name)} / ${safe(item.company)}</h3>
            <p>${safe(item.videoType)}｜${safe(item.budget)}｜${safe(item.email)}｜${safe(item.phone)}</p>
            <p>${safe(item.message)}</p>
            <label>狀態
              <select data-inquiry-status="${safe(item.id)}">
                ${["未處理", "已聯絡", "已報價", "已成交", "未成交", "暫緩"].map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
              </select>
            </label>
            <label>內部備註<textarea data-inquiry-note="${safe(item.id)}">${safe(item.internalNote)}</textarea></label>
          </div>
          <div class="actions">
            <button class="btn primary" type="button" data-save-inquiry="${safe(item.id)}">更新</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function render() {
  renderCounts();
  renderForms();
  renderCollection("works", state.works);
  renderCollection("services", state.services);
  renderCollection("extendedServices", state.extendedServices);
  renderCollection("partners", state.partners);
  renderCollection("process", state.process);
  renderCollection("media", state.media);
  renderInquiries();
}

function switchTab(tabName) {
  qsa("[data-panel]").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.panel !== tabName));
  qsa("[data-tab]").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
}

function parseAboutPayload(data) {
  return {
    ...data,
    team: JSON.parse(data.team || "[]"),
    clients: JSON.parse(data.clients || "[]"),
  };
}

function parseOptionsPayload(data) {
  return {
    videoTypeOptions: splitLines(data.videoTypeOptions),
    shootingOptions: splitLines(data.shootingOptions),
    budgetOptions: splitLines(data.budgetOptions),
  };
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function saveSiteContent(id, data) {
  await api.setDoc("siteContent", id, data);
  api.clearCache?.();
  setStatus("已儲存，前台會自動同步。");
  await loadAll();
}

async function saveCollection(collection, data) {
  const id = data.id || makeId(collection);
  delete data.id;
  await api.setDoc(collection, id, data);
  api.clearCache?.();
  setStatus("已儲存，前台會自動同步。");
  await loadAll();
}

async function uploadFormFiles(form, data) {
  const inputs = qsa('input[type="file"][data-upload-field]', form);
  for (const input of inputs) {
    const file = input.files && input.files[0];
    if (!file) continue;
    setStatus(`正在處理 ${file.name}...`);
    data[input.dataset.uploadField] = await api.uploadFile(file, form.dataset.collectionForm || "media");
    const target = form.elements[input.dataset.uploadField];
    if (target) target.value = data[input.dataset.uploadField];
    setStatus("圖片已處理完成，正在儲存資料...");
  }
  return data;
}

function setupEvents() {
  if (eventsReady) return;
  eventsReady = true;
  qsa("[data-tab]").forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
  qs("[data-refresh]").addEventListener("click", loadAll);
  qs("[data-seed]").addEventListener("click", async () => {
    setStatus("正在初始化預設內容...");
    await api.seedDefaults();
    setStatus("預設內容已寫入 Firestore。");
    await loadAll();
  });
  qs("[data-export]").addEventListener("click", exportInquiries);

  qsa("[data-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setFormBusy(form, true);
      try {
        const id = form.dataset.form;
        const data = formToObject(form);
        const payload = id === "about" ? parseAboutPayload(data) : id === "inquiryForm" ? parseOptionsPayload(data) : id === "home" ? { ...data, showreelBottom: splitLines(data.showreelBottom), tickerItems: splitLines(data.tickerItems) } : data;
        await saveSiteContent(id, payload);
      } catch (error) {
        setStatus(`儲存失敗：${errorMessage(error)}`);
      } finally {
        setFormBusy(form, false);
      }
    });
  });

  qsa("[data-collection-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setFormBusy(form, true);
      try {
        const data = await uploadFormFiles(form, formToObject(form));
        await saveCollection(form.dataset.collectionForm, data);
        fillForm(form, collectionDefaults(form.dataset.collectionForm));
      } catch (error) {
        setStatus(`儲存失敗：${errorMessage(error)}`);
      } finally {
        setFormBusy(form, false);
      }
    });
  });

  qsa("[data-new]").forEach((button) => {
    button.addEventListener("click", () => fillForm(qs(`[data-collection-form="${button.dataset.new}"]`), collectionDefaults(button.dataset.new)));
  });

  document.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    const saveInquiry = event.target.closest("[data-save-inquiry]");
    try {
      if (edit) {
        const row = state[edit.dataset.edit].find((item) => item.id === edit.dataset.id);
        fillForm(qs(`[data-collection-form="${edit.dataset.edit}"]`), row);
        setStatus("已載入資料，可以編輯後儲存。");
      }
      if (remove) {
        if (!confirm("確定要刪除這筆資料？")) return;
        await api.deleteDoc(remove.dataset.delete, remove.dataset.id);
        setStatus("已刪除。");
        await loadAll();
      }
      if (saveInquiry) {
        const id = saveInquiry.dataset.saveInquiry;
        await api.setDoc("inquiries", id, {
          status: qs(`[data-inquiry-status="${id}"]`).value,
          internalNote: qs(`[data-inquiry-note="${id}"]`).value,
        });
        setStatus("詢價狀態已更新。");
        await loadAll();
      }
    } catch (error) {
      setStatus(`操作失敗：${errorMessage(error)}`);
    }
  });
}

function exportInquiries() {
  const headers = ["name", "company", "phone", "email", "lineId", "videoType", "videoCount", "shooting", "location", "deadline", "budget", "message", "status", "internalNote"];
  const rows = [headers.join(",")].concat(
    state.inquiries.map((item) => headers.map((key) => `"${String(item[key] || "").replaceAll('"', '""')}"`).join(",")),
  );
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "starhorizon-inquiries.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function setupAuth() {
  const loginPanel = qs("[data-login-panel]");
  const adminLayout = qs("[data-admin-layout]");
  const tabs = qs("[data-admin-tabs]");
  const logout = qs("[data-logout]");
  const loginForm = qs("[data-login-form]");
  const loginStatus = qs("[data-login-status]");

  if (!window.firebase || !window.firebase.auth) {
    loginStatus.textContent = "Firebase 尚未載入，請從 Firebase Hosting 網址開啟後台。";
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = formToObject(loginForm);
    loginStatus.textContent = "登入中...";
    try {
      await window.firebase.auth().signInWithEmailAndPassword(data.email, data.password);
    } catch (error) {
      loginStatus.textContent = `登入失敗：${error.message}`;
    }
  });

  logout.addEventListener("click", () => window.firebase.auth().signOut());

  window.firebase.auth().onAuthStateChanged(async (user) => {
    document.body.classList.toggle("is-authenticated", Boolean(user));
    adminLayout.classList.toggle("is-login", !user);
    loginPanel.classList.toggle("hidden", Boolean(user));
    tabs.classList.toggle("hidden", !user);
    logout.classList.toggle("hidden", !user);
    qsa("[data-panel]").forEach((panel) => panel.classList.toggle("hidden", !user || panel.dataset.panel !== "dashboard"));
    if (user) {
      setupEvents();
      await loadAll();
    }
  });
}

document.addEventListener("DOMContentLoaded", setupAuth);

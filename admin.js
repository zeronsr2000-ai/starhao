const defaults = window.STARHORIZON_DEFAULTS;
const api = window.StarhorizonFirebase;
let state = {
  site: defaults.site,
  home: defaults.home,
  pages: defaults.pages,
  about: defaults.about,
  articles: defaults.articles,
  works: defaults.works,
  workCategories: defaults.workCategories,
  workSettings: defaults.workSettings,
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
    return { id: "", title: "", categoryId: state.workCategories[0]?.id || "", category: state.workCategories[0]?.title || "", client: "", year: "2026", coverClass: "g1", coverUrl: "", videoUrl: "", orientation: "landscape", summary: "", featured: false, showcase: true, sort: state.works.length + 1, status: "published" };
  }
  if (collection === "workCategories") {
    return { id: "", title: "", description: "", coverMode: "random", coverWorkId: "", showOnHome: true, showOnWorks: true, sort: state.workCategories.length + 1, status: "published" };
  }
  if (collection === "articles") {
    return { id: "", slug: "", title: "", category: "最新消息", publishedAt: new Date().toISOString().slice(0, 10), coverUrl: "", coverAlt: "", excerpt: "", seoTitle: "", seoDescription: "", blocks: [{ type: "paragraph", text: "" }], sort: state.articles.length + 1, status: "published" };
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
  const [site, home, pages, about, inquiryForm, workSettings, workCategories, works, articles, services, extendedServices, partners, process, media, inquiries] = await Promise.all([
    api.getDoc("siteContent", "site", defaults.site),
    api.getDoc("siteContent", "home", defaults.home),
    api.getDoc("siteContent", "pages", defaults.pages),
    api.getDoc("siteContent", "about", defaults.about),
    api.getDoc("siteContent", "inquiryForm", defaults.inquiryForm),
    api.getDoc("siteContent", "workSettings", defaults.workSettings),
    api.getCollection("workCategories", defaults.workCategories),
    api.getCollection("works", defaults.works),
    api.getCollection("articles", defaults.articles),
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
  state.workSettings = normalizeWorkSettings(workSettings);
  state.workCategories = workCategories;
  state.works = works;
  state.articles = articles;
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
  const articleCount = qs("[data-count-articles]");
  if (articleCount) articleCount.textContent = state.articles.length;
  qs("[data-count-services]").textContent = state.services.length;
  qs("[data-count-inquiries]").textContent = state.inquiries.length;
}

function normalizeWorkSettings(settings = {}) {
  const showcaseWorkIds = settings.showcaseWorkIds || [settings.showcaseWorkId1, settings.showcaseWorkId2, settings.showcaseWorkId3, settings.showcaseWorkId4].filter(Boolean);
  return {
    ...defaults.workSettings,
    ...settings,
    showcaseWorkIds: showcaseWorkIds.slice(0, 6),
  };
}

function categoryTitle(id) {
  return state.workCategories.find((item) => item.id === id)?.title || "";
}

function renderWorkControls() {
  const categories = [...state.workCategories].sort((a, b) => (a.sort || 0) - (b.sort || 0));
  qsa("[data-category-select]").forEach((select) => {
    const current = select.value;
    select.innerHTML = categories.map((item) => `<option value="${safe(item.id)}">${safe(item.title)}</option>`).join("");
    if (current) select.value = current;
  });

  const works = state.works.filter((item) => item.status !== "hidden").sort((a, b) => (a.sort || 0) - (b.sort || 0));
  qsa("[data-work-select]").forEach((select) => {
    const first = select.querySelector("option")?.outerHTML || '<option value="">請選擇作品</option>';
    const current = select.value;
    select.innerHTML = first + works.map((item) => `<option value="${safe(item.id)}">${safe(item.title)}｜${safe(categoryTitle(item.categoryId) || item.category)}</option>`).join("");
    if (current) select.value = current;
  });

  const featured = qs("[data-featured-category-options]");
  if (featured) {
    const selected = new Set(state.workSettings.featuredCategoryIds || []);
    featured.innerHTML = categories
      .map((item) => `<label><input name="featuredCategoryIds" type="checkbox" value="${safe(item.id)}" ${selected.has(item.id) ? "checked" : ""} /> ${safe(item.title)}</label>`)
      .join("");
  }
  renderShowcaseEditor();
  syncCoverModeFields();
}

function renderShowcaseEditor() {
  const editor = qs("[data-showcase-editor]");
  if (!editor) return;
  const ids = (state.workSettings.showcaseWorkIds || []).slice(0, 6);
  const rows = ids.length ? ids : [""];
  editor.innerHTML = rows
    .map(
      (id, index) => `
        <div class="showcase-editor-row">
          <label>展示影片 ${index + 1}<select name="showcaseWorkIds" data-work-select>${workSelectOptions(id)}</select></label>
          <button class="btn danger" type="button" data-remove-showcase="${index}" ${rows.length <= 1 ? "disabled" : ""}>刪除</button>
        </div>
      `,
    )
    .join("");
}

function workSelectOptions(current = "") {
  const works = state.works.filter((item) => item.status !== "hidden").sort((a, b) => (a.sort || 0) - (b.sort || 0));
  return `<option value="">自動選擇</option>${works.map((item) => `<option value="${safe(item.id)}" ${item.id === current ? "selected" : ""}>${safe(item.title)}｜${safe(categoryTitle(item.categoryId) || item.category)}</option>`).join("")}`;
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
  renderWorkControls();
  fillForm(qs('[data-form="workSettings"]'), {
    showreelWorkId: state.workSettings.showreelWorkId || state.home.showreelWorkId || "",
  });
  renderArticleEditor(qs('[data-collection-form="articles"]'), parseArticleBlocks(collectionDefaults("articles").blocks));
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
  if ((collection === "partners" || collection === "works" || collection === "articles") && (item.imageUrl || item.coverUrl)) {
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
    parts.push(categoryTitle(item.categoryId) || item.category || "未分類");
    parts.push(item.orientation === "portrait" ? "直式" : "橫式");
    if (item.featured) parts.push("首頁精選");
    if (item.showcase) parts.push("可展示");
    if (item.videoUrl) parts.push("作品連結已設定");
    return parts.join("｜") || item.status || "";
  }
  if (collection === "articles") {
    return `${item.category || "最新消息"}｜${item.publishedAt || "未設定日期"}｜${item.status === "draft" ? "草稿" : "已發布"}`;
  }
  if (collection === "workCategories") {
    return `${item.showOnHome ? "首頁顯示" : "首頁隱藏"}｜${item.showOnWorks ? "作品頁顯示" : "作品頁隱藏"}｜${item.coverMode === "selected" ? "指定封面" : "隨機封面"}`;
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
  renderCollection("workCategories", state.workCategories);
  renderCollection("works", state.works);
  renderCollection("articles", state.articles);
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
  const activeTab = qs(`[data-tab="${tabName}"]`);
  const group = activeTab?.closest("[data-admin-group]");
  if (group) {
    group.classList.add("is-open");
    qs("[data-admin-group-toggle]", group)?.setAttribute("aria-expanded", "true");
  }
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

function parseHomePayload(data) {
  return {
    ...data,
    showreelBottom: splitLines(data.showreelBottom),
    tickerItems: splitLines(data.tickerItems),
    partnerMarqueeDuration: clampNumber(data.partnerMarqueeDuration, 34, 8, 180),
  };
}

function parseWorkSettingsPayload(form, data) {
  return {
    showreelWorkId: data.showreelWorkId || "",
    featuredCategoryIds: qsa('input[name="featuredCategoryIds"]:checked', form).map((input) => input.value),
    showcaseWorkIds: qsa('select[name="showcaseWorkIds"]', form).map((select) => select.value).filter(Boolean).slice(0, 6),
  };
}

function normalizeWorkPayload(data) {
  const category = state.workCategories.find((item) => item.id === data.categoryId);
  return {
    ...data,
    category: category?.title || data.category || "",
    orientation: data.orientation || "landscape",
  };
}

function normalizeCategoryPayload(data) {
  return {
    ...data,
    coverWorkId: data.coverMode === "random" ? "" : data.coverWorkId,
  };
}

function normalizeArticlePayload(data, form) {
  const slug = slugify(data.slug || data.title || data.id || makeId("article"));
  return {
    ...data,
    slug,
    publishedAt: data.publishedAt || new Date().toISOString().slice(0, 10),
    blocks: readArticleBlocks(form),
  };
}

function slugify(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `article-${Date.now().toString(36)}`;
}

function parseArticleBlocks(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function newArticleBlock(type) {
  if (type === "heading") return { type, text: "新的小標題" };
  if (type === "image") return { type, url: "", alt: "", caption: "" };
  if (type === "video") return { type, url: "", caption: "", orientation: "landscape" };
  if (type === "quote") return { type, text: "" };
  if (type === "list") return { type, text: "" };
  return { type: "paragraph", text: "" };
}

function renderArticleEditor(form, blocks = []) {
  if (!form) return;
  const editor = qs("[data-article-editor]", form);
  if (!editor) return;
  const rows = blocks.length ? blocks : [newArticleBlock("paragraph")];
  editor.innerHTML = rows
    .map((block, index) => articleBlockTemplate(block, index))
    .join("");
  syncArticleStore(form);
}

function articleBlockTemplate(block, index) {
  const type = block.type || "paragraph";
  const common = `
    <div class="article-block-head">
      <strong>${index + 1}. ${safe(articleBlockLabel(type))}</strong>
      <div class="actions">
        <button class="btn ghost" type="button" data-article-move="${index}" data-dir="-1">上移</button>
        <button class="btn ghost" type="button" data-article-move="${index}" data-dir="1">下移</button>
        <button class="btn danger" type="button" data-article-remove="${index}">刪除</button>
      </div>
    </div>`;
  if (type === "image") {
    return `<div class="article-block-editor" data-article-block="${index}" data-type="image">${common}<label>圖片網址<input data-block-field="url" value="${safe(block.url)}" /></label><label>或上傳圖片<input type="file" accept="image/*" data-article-image-upload data-target="${index}" /></label><div class="grid-2"><label>圖片 ALT<input data-block-field="alt" value="${safe(block.alt)}" /></label><label>圖片說明<input data-block-field="caption" value="${safe(block.caption)}" /></label></div></div>`;
  }
  if (type === "video") {
    return `<div class="article-block-editor" data-article-block="${index}" data-type="video">${common}<label>YouTube／IG／FB 連結<input data-block-field="url" value="${safe(block.url)}" /></label><div class="grid-2"><label>影片說明<input data-block-field="caption" value="${safe(block.caption)}" /></label><label>影片方向<select data-block-field="orientation"><option value="landscape" ${block.orientation !== "portrait" ? "selected" : ""}>橫式</option><option value="portrait" ${block.orientation === "portrait" ? "selected" : ""}>直式</option></select></label></div></div>`;
  }
  const multiline = type === "paragraph" || type === "quote" || type === "list";
  return `<div class="article-block-editor" data-article-block="${index}" data-type="${safe(type)}">${common}<label>${type === "list" ? "清單內容（每行一項）" : "內容"}${multiline ? `<textarea data-block-field="text">${safe(block.text)}</textarea>` : `<input data-block-field="text" value="${safe(block.text)}" />`}</label></div>`;
}

function articleBlockLabel(type) {
  return { paragraph: "段落", heading: "小標題", image: "圖片", video: "影片嵌入", quote: "引用", list: "清單" }[type] || "段落";
}

function readArticleBlocks(form) {
  return qsa("[data-article-block]", form)
    .map((row) => {
      const block = { type: row.dataset.type || "paragraph" };
      qsa("[data-block-field]", row).forEach((field) => {
        block[field.dataset.blockField] = field.value;
      });
      return block;
    })
    .filter((block) => block.type === "image" || block.type === "video" ? block.url : block.text || block.url);
}

function syncArticleStore(form) {
  if (!form) return;
  const store = qs('textarea[name="blocks"]', form);
  if (store) store.value = JSON.stringify(readArticleBlocks(form), null, 2);
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

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

async function saveCollection(collection, data, form) {
  const id = data.id || makeId(collection);
  delete data.id;
  if (collection === "works") data = normalizeWorkPayload(data);
  if (collection === "workCategories") data = normalizeCategoryPayload(data);
  if (collection === "articles") data = normalizeArticlePayload(data, form);
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

function syncCoverModeFields() {
  qsa("[data-cover-mode]").forEach((select) => {
    const form = select.closest("form");
    const coverSelect = form?.elements.coverWorkId;
    if (!coverSelect) return;
    const isRandom = select.value !== "selected";
    coverSelect.disabled = isRandom;
    if (isRandom) coverSelect.value = "";
  });
}

function setupEvents() {
  if (eventsReady) return;
  eventsReady = true;
  qsa("[data-admin-group-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.closest("[data-admin-group]");
      const isOpen = group.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });
  });
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
        const data = await uploadFormFiles(form, formToObject(form));
        const payload = id === "about" ? parseAboutPayload(data) : id === "inquiryForm" ? parseOptionsPayload(data) : id === "workSettings" ? parseWorkSettingsPayload(form, data) : id === "home" ? parseHomePayload(data) : data;
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
        await saveCollection(form.dataset.collectionForm, data, form);
        fillForm(form, collectionDefaults(form.dataset.collectionForm));
        if (form.dataset.collectionForm === "articles") renderArticleEditor(form, collectionDefaults("articles").blocks);
      } catch (error) {
        setStatus(`儲存失敗：${errorMessage(error)}`);
      } finally {
        setFormBusy(form, false);
      }
    });
  });

  qsa("[data-new]").forEach((button) => {
    button.addEventListener("click", () => {
      fillForm(qs(`[data-collection-form="${button.dataset.new}"]`), collectionDefaults(button.dataset.new));
      if (button.dataset.new === "articles") renderArticleEditor(qs('[data-collection-form="articles"]'), collectionDefaults("articles").blocks);
      syncCoverModeFields();
    });
  });

  qsa("[data-cover-mode]").forEach((select) => {
    select.addEventListener("change", syncCoverModeFields);
  });

  document.addEventListener("click", async (event) => {
    const addShowcase = event.target.closest("[data-add-showcase]");
    const removeShowcase = event.target.closest("[data-remove-showcase]");
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    const saveInquiry = event.target.closest("[data-save-inquiry]");
    const addArticleBlock = event.target.closest("[data-add-article-block]");
    const removeArticleBlock = event.target.closest("[data-article-remove]");
    const moveArticleBlock = event.target.closest("[data-article-move]");
    try {
      if (addArticleBlock) {
        const form = addArticleBlock.closest("form");
        const blocks = readArticleBlocks(form);
        blocks.push(newArticleBlock(addArticleBlock.dataset.addArticleBlock));
        renderArticleEditor(form, blocks);
        return;
      }
      if (removeArticleBlock) {
        const form = removeArticleBlock.closest("form");
        const index = Number(removeArticleBlock.dataset.articleRemove);
        const blocks = readArticleBlocks(form).filter((_, itemIndex) => itemIndex !== index);
        renderArticleEditor(form, blocks);
        return;
      }
      if (moveArticleBlock) {
        const form = moveArticleBlock.closest("form");
        const index = Number(moveArticleBlock.dataset.articleMove);
        const nextIndex = index + Number(moveArticleBlock.dataset.dir);
        const blocks = readArticleBlocks(form);
        if (nextIndex < 0 || nextIndex >= blocks.length) return;
        [blocks[index], blocks[nextIndex]] = [blocks[nextIndex], blocks[index]];
        renderArticleEditor(form, blocks);
        return;
      }
      if (addShowcase) {
        const values = qsa('select[name="showcaseWorkIds"]').map((select) => select.value);
        if (values.length >= 6) {
          setStatus("展示影片最多只能設定 6 支。");
          return;
        }
        state.workSettings.showcaseWorkIds = [...values, ""];
        renderShowcaseEditor();
        return;
      }
      if (removeShowcase) {
        const index = Number(removeShowcase.dataset.removeShowcase);
        state.workSettings.showcaseWorkIds = qsa('select[name="showcaseWorkIds"]').map((select) => select.value).filter((_, itemIndex) => itemIndex !== index);
        renderShowcaseEditor();
        return;
      }
      if (edit) {
        const row = state[edit.dataset.edit].find((item) => item.id === edit.dataset.id);
        const form = qs(`[data-collection-form="${edit.dataset.edit}"]`);
        fillForm(form, row);
        if (edit.dataset.edit === "articles") renderArticleEditor(form, parseArticleBlocks(row.blocks));
        syncCoverModeFields();
        setStatus("已載入資料，可以編輯後儲存。");
      }
      if (remove) {
        if (!confirm("確定要刪除這筆資料？")) return;
        const removingCategory = state.workCategories.find((item) => item.id === remove.dataset.id);
        if (remove.dataset.delete === "workCategories" && state.works.some((item) => item.categoryId === remove.dataset.id || item.category === removingCategory?.title)) {
          setStatus("這個分類底下還有作品，請先移動作品或隱藏分類。");
          return;
        }
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

  document.addEventListener("input", (event) => {
    const field = event.target.closest("[data-block-field]");
    if (field) syncArticleStore(field.closest("form"));
  });

  document.addEventListener("change", async (event) => {
    const upload = event.target.closest("[data-article-image-upload]");
    const field = event.target.closest("[data-block-field]");
    if (field) syncArticleStore(field.closest("form"));
    if (!upload || !upload.files || !upload.files[0]) return;
    const form = upload.closest("form");
    const row = upload.closest("[data-article-block]");
    try {
      setStatus(`正在處理 ${upload.files[0].name}...`);
      const url = await api.uploadFile(upload.files[0], "articles");
      const input = qs('[data-block-field="url"]', row);
      if (input) input.value = url;
      syncArticleStore(form);
      setStatus("文章圖片已處理完成，記得按儲存文章。");
    } catch (error) {
      setStatus(`上傳失敗：${errorMessage(error)}`);
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

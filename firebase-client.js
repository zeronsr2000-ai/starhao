(function () {
  const CACHE_PREFIX = "starhorizon-cache:";
  const STORAGE_TIMEOUT_MS = 6000;

  function hasFirebase() {
    return window.firebase && window.firebase.apps !== undefined;
  }

  function readCache(key, fallback) {
    try {
      const value = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeCache(key, value) {
    try {
      window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn("Unable to write local cache:", error);
    }
  }

  function clearCache() {
    try {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .forEach((key) => window.localStorage.removeItem(key));
    } catch (error) {
      console.warn("Unable to clear local cache:", error);
    }
  }

  function shouldUseStorageUploads() {
    const config = window.STARHORIZON_FIREBASE_CONFIG || {};
    return config.storageUploadsEnabled === true && Boolean(window.firebase && window.firebase.storage);
  }

  function withTimeout(promise, message) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error(message)), STORAGE_TIMEOUT_MS);
      }),
    ]);
  }

  function getCachedDoc(collection, id, fallback) {
    return readCache(`doc:${collection}:${id}`, fallback);
  }

  function getCachedCollection(collection, fallback) {
    const cached = readCache(`collection:${collection}`, null);
    return Array.isArray(cached) && cached.length ? cached : fallback;
  }

  function getDb() {
    if (!hasFirebase()) return null;
    try {
      return window.firebase.firestore();
    } catch (error) {
      console.warn("Firestore unavailable:", error);
      return null;
    }
  }

  async function getDoc(collection, id, fallback) {
    const db = getDb();
    const cached = getCachedDoc(collection, id, fallback);
    if (!db) return cached;
    try {
      const snap = await db.collection(collection).doc(id).get();
      if (!snap.exists) return cached;
      const row = { ...(fallback || {}), id: snap.id, ...snap.data() };
      writeCache(`doc:${collection}:${id}`, row);
      return row;
    } catch (error) {
      console.warn(`Unable to read ${collection}/${id}:`, error);
      return cached;
    }
  }

  async function getCollection(collection, fallback) {
    const db = getDb();
    const cached = getCachedCollection(collection, fallback);
    if (!db) return cached;
    try {
      const snap = await db.collection(collection).get();
      const rows = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.sort || 0) - (b.sort || 0));
      writeCache(`collection:${collection}`, rows);
      return rows.length ? rows : fallback;
    } catch (error) {
      console.warn(`Unable to read ${collection}:`, error);
      return cached;
    }
  }

  async function setDoc(collection, id, data) {
    const db = getDb();
    if (!db) throw new Error("Firestore 尚未可用");
    await db.collection(collection).doc(id).set(
      {
        ...data,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    clearCache();
  }

  async function addDoc(collection, data) {
    const db = getDb();
    if (!db) throw new Error("Firestore 尚未可用");
    const ref = await db.collection(collection).add({
      ...data,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });
    clearCache();
    return ref;
  }

  async function deleteDoc(collection, id) {
    const db = getDb();
    if (!db) throw new Error("Firestore 尚未可用");
    await db.collection(collection).doc(id).delete();
    clearCache();
  }

  async function seedDefaults() {
    const defaults = window.STARHORIZON_DEFAULTS;
    await setDoc("siteContent", "site", defaults.site);
    await setDoc("siteContent", "home", defaults.home);
    await setDoc("siteContent", "pages", defaults.pages);
    await setDoc("siteContent", "about", defaults.about);
    await setDoc("siteContent", "inquiryForm", defaults.inquiryForm);
    await setDoc("siteContent", "workSettings", defaults.workSettings);
    await Promise.all(defaults.articles.map((item) => setDoc("articles", item.id, item)));
    await Promise.all(defaults.workCategories.map((item) => setDoc("workCategories", item.id, item)));
    await Promise.all(defaults.works.map((item) => setDoc("works", item.id, item)));
    await Promise.all(defaults.services.map((item) => setDoc("services", item.id, item)));
    await Promise.all(defaults.extendedServices.map((item) => setDoc("extendedServices", item.id, item)));
    await Promise.all(defaults.process.map((item, index) => setDoc("process", `step-${index + 1}`, item)));
  }

  async function uploadFile(file, folder) {
    if (!file || !file.type || !file.type.startsWith("image/")) throw new Error("只能上傳圖片檔案");
    if (file.size > 10 * 1024 * 1024) throw new Error("圖片不能超過 10MB");
    if (!hasFirebase() || !window.firebase.auth || !window.firebase.auth().currentUser) throw new Error("請先登入後台再上傳圖片");
    if (!shouldUseStorageUploads()) return compressImageToDataUrl(file, folder);
    const cleanName = String(file.name || "image").replace(/[^a-zA-Z0-9._-]+/g, "-");
    const path = `uploads/${folder || "media"}/${Date.now()}-${cleanName}`;
    try {
      const snapshot = await withTimeout(
        window.firebase.storage().ref(path).put(file, {
          contentType: file.type,
          customMetadata: {
            uploadedBy: window.firebase.auth().currentUser.email || "admin",
          },
        }),
        "Storage 上傳逾時，改用內建圖片儲存",
      );
      return snapshot.ref.getDownloadURL();
    } catch (error) {
      console.warn("Storage upload failed, falling back to Firestore image data:", error);
      return compressImageToDataUrl(file, folder);
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(new Error("無法讀取圖片檔案")));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", () => reject(new Error("無法解析圖片，請改用 JPG、PNG 或 WebP")));
      image.src = src;
    });
  }

  async function compressImageToDataUrl(file, folder) {
    if (file.type === "image/svg+xml" && file.size < 700 * 1024) return readFileAsDataUrl(file);
    const source = await readFileAsDataUrl(file);
    const image = await loadImage(source);
    const maxSize = folder === "partners" ? 900 : 1600;
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/webp", folder === "partners" ? 0.82 : 0.78);
    if (dataUrl.length > 900000) throw new Error("圖片壓縮後仍太大，請改用較小的圖片或先裁切後再上傳");
    return dataUrl;
  }

  window.StarhorizonFirebase = {
    hasFirebase,
    getDb,
    getCachedDoc,
    getCachedCollection,
    getDoc,
    getCollection,
    setDoc,
    addDoc,
    deleteDoc,
    seedDefaults,
    uploadFile,
    clearCache,
  };
})();

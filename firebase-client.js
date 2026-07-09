(function () {
  function hasFirebase() {
    return window.firebase && window.firebase.apps !== undefined;
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
    if (!db) return fallback;
    try {
      const snap = await db.collection(collection).doc(id).get();
      return snap.exists ? { id: snap.id, ...snap.data() } : fallback;
    } catch (error) {
      console.warn(`Unable to read ${collection}/${id}:`, error);
      return fallback;
    }
  }

  async function getCollection(collection, fallback) {
    const db = getDb();
    if (!db) return fallback;
    try {
      const snap = await db.collection(collection).get();
      const rows = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.sort || 0) - (b.sort || 0));
      return rows.length ? rows : fallback;
    } catch (error) {
      console.warn(`Unable to read ${collection}:`, error);
      return fallback;
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
  }

  async function addDoc(collection, data) {
    const db = getDb();
    if (!db) throw new Error("Firestore 尚未可用");
    return db.collection(collection).add({
      ...data,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async function deleteDoc(collection, id) {
    const db = getDb();
    if (!db) throw new Error("Firestore 尚未可用");
    await db.collection(collection).doc(id).delete();
  }

  async function seedDefaults() {
    const defaults = window.STARHORIZON_DEFAULTS;
    await setDoc("siteContent", "site", defaults.site);
    await setDoc("siteContent", "home", defaults.home);
    await setDoc("siteContent", "about", defaults.about);
    await Promise.all(defaults.works.map((item) => setDoc("works", item.id, item)));
    await Promise.all(defaults.services.map((item) => setDoc("services", item.id, item)));
    await Promise.all(defaults.process.map((item, index) => setDoc("process", `step-${index + 1}`, item)));
  }

  window.StarhorizonFirebase = {
    hasFirebase,
    getDb,
    getDoc,
    getCollection,
    setDoc,
    addDoc,
    deleteDoc,
    seedDefaults,
  };
})();

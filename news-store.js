// Loaded only by the production editor inside the signed-in admin panel.
window.StarhaoNewsStore = (() => {
  function services() {
    if (window === parent || !parent.firebase?.auth().currentUser) {
      throw new Error('請從已登入的星澔後台開啟「最新消息 → 文章管理」。');
    }
    return parent.StarhorizonFirebase;
  }

  // The Firebase SDK runs in the admin window and validates plain object prototypes.
  const record = fields => parent.Object.assign(new parent.Object(), fields);

  function legacyContent(blocks) {
    if (typeof blocks === 'string') blocks = JSON.parse(blocks || '[]');
    const body = document.createElement('div');
    for (const block of blocks || []) {
      const tag = {heading:'h2', quote:'blockquote', list:'ul', image:'div', video:'div'}[block.type] || 'p';
      const node = document.createElement(tag);
      if (block.type === 'image') {
        const img = document.createElement('img');
        img.src = block.url || '';
        img.alt = block.alt || '';
        node.append(img);
      } else if (block.type === 'video') {
        node.textContent = '[iframe]' + (block.url || '') + '[/iframe]';
      } else if (block.type === 'list') {
        for (const line of String(block.text || '').split(/\r?\n/).filter(Boolean)) {
          const item = document.createElement('li');
          item.textContent = line;
          node.append(item);
        }
      } else {
        node.textContent = block.text || '';
      }
      body.append(node);
      if (block.caption) {
        const caption = document.createElement('p');
        caption.textContent = block.caption;
        body.append(caption);
      }
    }
    return body.innerHTML;
  }

  async function load() {
    const snap = await services().getDb().collection('articles').get({source:'server'});
    const docs = snap.docs.map(doc => ({...doc.data(), id:doc.id}));
    const rows = parent.starhorizonArticleRows(docs.length ? docs : parent.STARHORIZON_DEFAULTS.articles);
    return rows.filter(row => !row.articleDeleted).sort(parent.compareNewsOrder).map(row => ({
      id:row.id, revision:row.articleRevision || 0, title:row.title || '', date:row.publishedAt || '',
      category:row.category || '', summary:row.excerpt || '', cover:row.coverUrl || '',
      seo:row.seoTitle || '', description:row.seoDescription || '',
      status:({draft:'草稿',hidden:'已下架'})[row.status] || '已發布',
      html:row.articleHtml ?? legacyContent(row.blocks),
      slug:row.slug || row.id, coverAlt:row.coverAlt || ''
    }));
  }

  async function change(row, payload, isNew = false) {
    const api = services();
    const db = api.getDb();
    const ref = db.collection('articles').doc(row.id);
    const revision = (row.revision || 0) + 1;
    await db.runTransaction(async tx => {
      const doc = await tx.get(ref);
      const data = doc.data() || {};
      if ((isNew && doc.exists) || data.articleDeleted || (data.articleRevision || 0) !== (row.revision || 0)) {
        throw new Error('文章已由其他人更新。請保留編輯內容並重新載入文章。');
      }
      tx.set(ref, record({...payload, articleRevision:revision,
        updatedAt:parent.firebase.firestore.FieldValue.serverTimestamp()}), {merge:!payload.articleDeleted});
    });
    row.revision = revision;
    api.clearCache();
  }

  async function save(row, isNew) {
    const payload = {
      title:row.title, slug:row.slug || row.id, publishedAt:row.date, category:row.category,
      excerpt:row.summary, coverUrl:row.cover, coverAlt:row.coverAlt || '', seoTitle:row.seo,
      seoDescription:row.description, articleHtml:row.html, status:row.status==='已發布'?'published':row.status==='已下架'?'hidden':'draft'
    };
    if (isNew) payload.appendedAt = Date.now();
    await change(row,payload,isNew);
  }

  async function sort(rows) {
    const api = services();
    const db = api.getDb();
    const batch = db.batch();
    for (const [index,row] of rows.entries()) {
      batch.set(db.collection('articles').doc(row.id), record({newsOrder:index}), {merge:true});
    }
    await batch.commit();
    api.clearCache();
  }

  async function upload(file) {
    const reader=new FileReader();
    const data=await new Promise((resolve,reject)=>{
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(Error('圖片讀取失敗'));
      reader.readAsDataURL(file);
    });
    const img=document.createElement('img');
    img.src=data;
    await img.decode();
    const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
    const key=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
    // Keep each image document below the Firestore document size limit.
    const chunkSize=700000;
    const db=services().getDb();
    const batch=db.batch();
    const parts=Math.ceil(data.length/chunkSize);
    for(let i=0;i<parts;i++){
      const ref=db.collection('siteContent').doc('news-image-'+key+'-'+i);
      batch.set(ref,record({data:data.slice(i*chunkSize,(i+1)*chunkSize)}));
    }
    await batch.commit();
    img.dataset.newsImage=key;
    img.dataset.parts=parts;
    img.alt=file.name;
    return img;
  }

  return {load, save, sort, upload,
    loadImages:root=>window.StarhaoNewsContent.loadImages(root,services().getDb()),
    remove:row => change(row,{articleDeleted:true,status:'hidden'}),
    coverUpload:file => services().uploadFile(file,'articles'),
    count:n => {const counter=parent.document.querySelector('[data-count-articles]'); if(counter)counter.textContent=n;}
  };
})();

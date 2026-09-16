(function initializeCurriculumV3(global) {
  const DATABASE_NAME = 'gotit_curriculum_v3';
  const DATABASE_VERSION = 1;
  const STORE_NAME = 'documents';
  let activeCatalog = null;
  let diagnostics = [];
  let activeRuntimeSubjects = new Set();
  let activeRuntimeBanks = {};

  function cloneDocument(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function absoluteDocumentKey(url) {
    try { return new URL(url, location.href).href; } catch { return String(url); }
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in global)) return reject(new Error('INDEXED_DB_UNAVAILABLE'));
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('CURRICULUM_CACHE_FAILED'));
    });
  }

  async function readCachedDocument(key) {
    try {
      const database = await openDatabase();
      const value = await new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result?.value || null);
        request.onerror = () => reject(request.error);
      });
      database.close();
      return value;
    } catch { return null; }
  }

  async function writeCachedDocument(key, value, metadata = {}) {
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ key, value, metadata, cachedAt: new Date().toISOString() });
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });
      database.close();
    } catch {}
  }

  async function sha256(text) {
    if (!global.crypto?.subtle) return '';
    const digest = await global.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  function bundledDocument(url) {
    const bundle = global.__GOTIT_CURRICULUM_V3__;
    if (!bundle) return null;
    if (url === './data/curriculum/catalog.v3.json') return cloneDocument(bundle.catalog);
    return bundle.documents?.[url] ? cloneDocument(bundle.documents[url]) : null;
  }

  async function loadDocument(url, { checksum = '', validate = value => value, cacheKind = 'content' } = {}) {
    const bundled = bundledDocument(url);
    if (location.protocol === 'file:' && bundled) return validate(bundled);
    const key = absoluteDocumentKey(url);
    try {
      const response = await fetch(new URL(url, location.href), { cache: 'no-store' });
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      const raw = await response.text();
      if (checksum) {
        const actual = await sha256(raw);
        if (!actual || actual !== checksum) throw new Error(`${url}: integrity mismatch`);
      }
      const value = validate(JSON.parse(raw));
      await writeCachedDocument(key, value, { checksum, cacheKind });
      return value;
    } catch (networkError) {
      const cached = await readCachedDocument(key);
      if (cached) return validate(cached);
      if (bundled) return validate(bundled);
      throw networkError;
    }
  }

  const curriculumContract = global.CurriculumContractV3;
  if (!curriculumContract) throw new Error('CURRICULUM_CONTRACT_V3_UNAVAILABLE');
  const validateCatalog = curriculumContract.validateCatalog;
  const validatePackageManifest = curriculumContract.validatePackageManifest;
  const validateShard = curriculumContract.validateShard;
  const validatePackageDocuments = curriculumContract.validatePackageDocuments;

  function itemToRuntime(item, knowledgeNode, lesson, unit, manifest) {
    const runtimeType = item.type === 'multiple_choice' ? 'multi_select' : item.type === 'short_response' ? 'short_answer' : item.type;
    return {
      ...cloneDocument(item),
      type: runtimeType,
      knowledge: knowledgeNode.title,
      knowledgeId: knowledgeNode.id,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      unitId: unit.id,
      unitTitle: unit.title,
      curriculumStandardRefs: manifest.standardRefs,
      contentPackageId: manifest.id,
      contentVersion: manifest.release.version
    };
  }

  function packageToRuntimeBank(manifest, shards) {
    const lessons = [];
    for (const shard of shards) {
      const knowledge = new Map(shard.knowledge.map(node => [node.id, node]));
      for (const unit of shard.units.sort((a, b) => Number(a.order) - Number(b.order))) {
        for (const lesson of unit.lessons.sort((a, b) => Number(a.order) - Number(b.order))) {
          const primaryKnowledge = knowledge.get(lesson.knowledgeIds[0]);
          lessons.push({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            learningGoal: lesson.learningGoal,
            demo: lesson.demo,
            unitId: unit.id,
            unitTitle: unit.title,
            knowledgeIds: lesson.knowledgeIds,
            prerequisiteKnowledgeIds: lesson.prerequisiteKnowledgeIds,
            commonMistakes: lesson.commonMistakes,
            hints: lesson.hints,
            reviewPolicy: lesson.reviewPolicy,
            reviewStage: lesson.reviewStage,
            objectives: lesson.knowledgeIds.flatMap(id => knowledge.get(id)?.objectives || []),
            legacyAliases: Array.isArray(lesson.legacyAliases) ? lesson.legacyAliases : [],
            questions: lesson.items.map(item => itemToRuntime(item, knowledge.get(item.knowledgeId) || primaryKnowledge, lesson, unit, manifest))
          });
        }
      }
    }
    const term = manifest.term === 'first' ? '上册' : manifest.term === 'second' ? '下册' : '学年课程';
    return {
      schemaVersion: 3,
      subject: manifest.subjectId,
      mode: 'curriculum',
      provider: manifest.provider,
      contentPackage: manifest,
      levels: [{
        id: String(manifest.grade),
        name: { zh: `${manifest.grade}年级 · ${term}`, en: `Grade ${manifest.grade} · ${manifest.term}` },
        curriculum: { zh: '中国大陆国家课程标准', en: 'China National Curriculum' },
        lessons,
        questions: lessons.flatMap(lesson => lesson.questions)
      }]
    };
  }

  function mergeBank(base, overlay, fallbackPolicy = 'replace-level') {
    if (!base) return cloneDocument(overlay);
    const next = cloneDocument(base);
    for (const level of overlay.levels) {
      const index = next.levels.findIndex(item => String(item.id) === String(level.id));
      if (index < 0) next.levels.push(level);
      else if (fallbackPolicy === 'overlay') {
        const existing = next.levels[index];
        existing.lessons = [...(existing.lessons || []), ...(level.lessons || [])];
        existing.questions = [...(existing.questions || []), ...(level.questions || [])];
      } else next.levels[index] = level;
    }
    next.schemaVersion = 3;
    next.mode = 'curriculum';
    next.provider = overlay.provider;
    return next;
  }

  async function loadCatalog() {
    if (activeCatalog) return activeCatalog;
    const url = global.NAMELESS_CONTENT_CONFIG?.catalogUrl || './data/curriculum/catalog.v3.json';
    activeCatalog = await loadDocument(url, { validate: validateCatalog, cacheKind: 'catalog' });
    return activeCatalog;
  }

  async function loadEnabledPackages(baseBanks = {}) {
    const catalog = await loadCatalog();
    const output = { ...baseBanks };
    diagnostics = [];
    let loaded = 0;
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem('gotit_learner_profile_v1') || '{}') || {}; } catch {}
    const academicSystem = profile.academicSystem === '5-4' ? '5-4' : '6-3';
    const grade = Math.max(1, Math.min(12, Number(profile.grade) || 3));
    const selections = profile.textbookSelections && typeof profile.textbookSelections === 'object' ? profile.textbookSelections : {};
    const eligible = catalog.packages.filter(item => {
      if (!item.enabled) return false;
      if (item.preload) return true;
      if (item.grade && Number(item.grade) !== grade) return false;
      if (Array.isArray(item.academicSystems) && !item.academicSystems.includes('both') && !item.academicSystems.includes(academicSystem)) return false;
      if (item.textbookSeriesId && selections[item.subjectId] !== item.textbookSeriesId) return false;
      return true;
    });
    for (const packageRef of [...eligible].sort((a, b) => Number(b.priority) - Number(a.priority))) {
      try {
        const manifest = await loadDocument(packageRef.manifestUrl, { validate: value => validatePackageManifest(value, packageRef), cacheKind: 'manifest' });
        const shards = [];
        for (const shardRef of manifest.shards) {
          shards.push(await loadDocument(shardRef.url, { checksum: shardRef.sha256 || '', validate: value => validateShard(value, manifest, shardRef), cacheKind: 'shard' }));
        }
        validatePackageDocuments(manifest, shards);
        const overlay = packageToRuntimeBank(manifest, shards);
        output[manifest.subjectId] = mergeBank(output[manifest.subjectId], overlay, packageRef.fallbackPolicy);
        loaded += 1;
      } catch (error) {
        diagnostics.push({ packageId: packageRef.id, message: error.message, at: new Date().toISOString() });
      }
    }
    activeRuntimeBanks = output;
    activeRuntimeSubjects = new Set(Object.keys(output).filter(id => output[id]));
    return {
      banks: output,
      loaded,
      diagnostics: cloneDocument(diagnostics),
      provider: {
        id: 'cn-curriculum-v3-hybrid',
        name: loaded ? '国家课标 V3 · 正式教材待授权' : '迁移课程库',
        kind: loaded ? 'standard-aligned-pilot' : 'compatibility',
        notice: loaded
          ? `已启用 ${loaded} 个达到可发布阶段的课标对齐内容包；结构、答案和内部内容复核均已记录。未获出版社授权的教材正文和原题未被复制。其余课程继续使用迁移内容。`
          : '第三代目录已加载，但没有内容包通过校验。'
      }
    };
  }

  function subjectById(id) {
    return activeCatalog?.subjects?.find(subject => subject.id === id) || null;
  }

  function migrateUserState(user) {
    if (!user || typeof user !== 'object') return false;
    user.knowledgeMastery = user.knowledgeMastery && typeof user.knowledgeMastery === 'object' ? user.knowledgeMastery : {};
    user.reviewSchedule = user.reviewSchedule && typeof user.reviewSchedule === 'object' ? user.reviewSchedule : {};
    let changed = false;
    const aliasToStable = new Map();
    for (const bank of Object.values(activeRuntimeBanks)) {
      for (const level of bank?.levels || []) {
        for (const lesson of level.lessons || []) {
          for (const alias of lesson.legacyAliases || []) aliasToStable.set(alias, { id: lesson.id, title: lesson.title });
        }
      }
    }
    for (const [alias, target] of aliasToStable) {
      const oldMastery = user.knowledgeMastery[alias];
      const current = user.knowledgeMastery[target.id];
      if (oldMastery && (!current || Number(oldMastery.score) > Number(current.score))) {
        user.knowledgeMastery[target.id] = { ...oldMastery, title: target.title, migratedFrom: alias, migratedAt: new Date().toISOString() };
        changed = true;
      }
      const oldReview = user.reviewSchedule[alias];
      if (oldReview && !user.reviewSchedule[target.id]) {
        user.reviewSchedule[target.id] = { ...oldReview, lessonId: target.id, title: target.title, migratedFrom: alias };
        changed = true;
      }
    }
    if (user.lastCourse?.lessonId && aliasToStable.has(user.lastCourse.lessonId)) {
      user.lastCourse = { ...user.lastCourse, lessonId: aliasToStable.get(user.lastCourse.lessonId).id };
      changed = true;
    }
    if (Array.isArray(user.wrongBook)) {
      user.wrongBook = user.wrongBook.map(item => {
        const target = aliasToStable.get(item.lessonId);
        if (!target) return item;
        changed = true;
        return { ...item, lessonId: target.id, lessonTitle: target.title, migratedFromLesson: item.lessonId };
      });
    }
    return changed;
  }

  function renderCatalog() {
    const host = document.getElementById('subjectCatalogV3');
    if (!host || !activeCatalog) return;
    const available = activeRuntimeSubjects;
    host.innerHTML = activeCatalog.subjects.map(subject => {
      const active = available.has(subject.id) || ['math', 'english', 'science'].includes(subject.id);
      const grades = subject.typicalGrades || [];
      const gradeLabel = grades.length ? `${Math.min(...grades)}–${Math.max(...grades)} 年级` : '按地区课程实施';
      return `<button class="curriculum-subject-card-v3 ${active ? 'has-content' : ''}" type="button" onclick="openSubjectRoadmapV3('${subject.id}')"><span>${esc(subject.mark)}</span><div><strong>${esc(subject.title.zh)}</strong><small>${esc(gradeLabel)} · ${subject.availability === 'national' ? '国家课程' : subject.availability === 'foreign-language-alternative' ? '外语选项' : '地区选用'}</small></div><b>${active ? '已有内容' : '目录已登记'}</b></button>`;
    }).join('');
    const status = document.getElementById('curriculumSourceStatusV3');
    if (status) status.innerHTML = `<strong>${activeCatalog.subjects.length} 个国家课程入口已登记</strong><span>${activeCatalog.textbookSeries.length} 套教材版本元数据 · ${activeCatalog.packages.filter(item => item.enabled).length} 个内容包启用</span><div class="curriculum-source-actions-v4"><button type="button" onclick="openCurriculumSettingsV3()">教材设置</button><button id="curriculumCatalogToggleV4" type="button" aria-expanded="false" onclick="toggleCurriculumCatalogV4()">查看完整目录</button></div>`;
  }

  global.toggleCurriculumCatalogV4 = function toggleCurriculumCatalogV4() {
    const host = document.getElementById('subjectCatalogV3');
    const toggle = document.getElementById('curriculumCatalogToggleV4');
    const registry = host?.closest('.curriculum-registry-v3');
    if (!host || !toggle) return;
    const expanding = host.hidden;
    host.hidden = !expanding;
    registry?.classList.toggle('is-collapsed', !expanding);
    toggle.setAttribute('aria-expanded', String(expanding));
    toggle.textContent = expanding ? '收起完整目录' : '查看完整目录';
    if (expanding && matchMedia('(max-width: 780px)').matches) setTimeout(() => host.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  };

  global.openSubjectRoadmapV3 = function openSubjectRoadmapV3(subjectId) {
    const subject = subjectById(subjectId);
    if (!subject || typeof openSuiteModalV3 !== 'function') return;
    const standardIds = [subject.standardId, ...(subject.additionalStandardIds || [])];
    if (subject.stages.includes('upper-secondary') && !standardIds.includes('cn-upper-secondary-2017-2020')) standardIds.push('cn-upper-secondary-2017-2020');
    const standards = standardIds.map(id => activeCatalog.standards.find(item => item.id === id)).filter(Boolean);
    const series = activeCatalog.textbookSeries.filter(item => item.subjectIds.includes(subjectId));
    const hasRuntime = activeRuntimeSubjects.has(subjectId);
    openSuiteModalV3({
      icon: subject.mark,
      kicker: 'NATIONAL CURRICULUM · V3',
      title: subject.title.zh,
      copy: subject.description.zh,
      body: `<div class="curriculum-detail-v3"><section><small>执行标准</small><strong>${standards.map(standard => `${esc(standard.title.zh)}（${esc(standard.version)}）`).join('<br>') || '国家课程标准'}</strong><p>来源：中华人民共和国教育部。课程标准映射与教材内容授权分开管理。</p></section><section><small>常见实施年级</small><strong>${esc((subject.typicalGrades || []).join('、') || '由地区确定')}</strong><p>${subject.availability === 'national' ? '国家课程。具体教材版本由地区和学校依法选用。' : subject.availability === 'foreign-language-alternative' ? '外语课程选项，不代表每所学校同时开设。' : '具体开设方式和教材选用由地区课程方案确定。'}</p></section><section><small>教材版本登记</small><strong>${series.length ? `${series.length} 套元数据` : '等待导入教学用书目录'}</strong><p>${series.length ? series.map(item => `${esc(item.title)} · ${esc(item.publisher)}`).join('<br>') : '系统已支持多版本映射，不会把某一出版社版本冒充全国唯一教材。'}</p></section><section><small>内容状态</small><strong>${hasRuntime ? '已有可运行内容' : '课程目录已登记，正式内容待建设或授权'}</strong><p>未取得授权时，只允许使用课标对齐的原创题目，不复制教材正文、插图和原题。</p></section></div>${hasRuntime ? `<div class="suite-actions"><button class="primary-cta" type="button" onclick="closeSuiteModalV3();selectSubject('${subjectId}')">进入${esc(subject.title.zh)}课程</button></div>` : ''}`
    });
  };

  global.CurriculumV3 = {
    loadCatalog,
    loadEnabledPackages,
    renderCatalog,
    subjectById,
    migrateUserState,
    diagnostics: () => cloneDocument(diagnostics),
    catalog: () => activeCatalog ? cloneDocument(activeCatalog) : null,
    validateCatalog,
    validatePackageManifest,
    validateShard,
    validatePackageDocuments
  };
})(globalThis);

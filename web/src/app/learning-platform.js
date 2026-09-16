let activeLessonsV2 = [];
let selectedLessonIdV2 = '';
let loadedContentProviderV2 = null;
let lessonDemoReturnScrollV4 = 0;
const PRACTICE_DRAFT_KEY_V2 = 'nameless_practice_draft_v2';
const PRACTICE_DRAFT_MAX_AGE_V2 = 4 * 60 * 60 * 1000;

const SUBJECT_UI_V2 = {
  math: { zh: '数学', en: 'Mathematics', mark: 'Σ', kicker: 'MATHEMATICS PATH' },
  english: { zh: '英语', en: 'English', mark: 'Aa', kicker: 'LANGUAGE PATH' },
  science: { zh: '科学', en: 'Science', mark: '⌁', kicker: 'SCIENCE PATH' }
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function selectBalanced(pool, count, previous, options = {}) {
  if (typeof PracticeSelectorV3 !== 'undefined') {
    return PracticeSelectorV3.select(pool, count, { previousIds: previous, pinnedId: options.pinnedId });
  }
  const fresh = shuffle(pool.filter(question => !previous.has(question.id)));
  const seen = shuffle(pool.filter(question => previous.has(question.id)));
  const source = [...fresh, ...seen];
  const chosen = [];
  const ids = new Set();
  const topics = new Set();
  const types = new Set();
  for (const preference of ['type', 'knowledge', 'any']) {
    for (const question of source) {
      if (chosen.length >= count || ids.has(questionKey(question))) continue;
      const topic = stableTextV2(question.knowledge) || 'general';
      const type = question.type || 'single_choice';
      if (preference === 'type' && types.has(type)) continue;
      if (preference === 'knowledge' && topics.has(topic)) continue;
      chosen.push(question);
      ids.add(questionKey(question));
      topics.add(topic);
      types.add(type);
    }
  }
  return chosen;
}

function saveUser() {
  localStorage.setItem('gongxing_academy_data', JSON.stringify(user));
  const auth = typeof WumingRemote !== 'undefined' ? WumingRemote.loadAuth() : null;
  if (auth?.username) localStorage.setItem(`wuming_account_data_v1:${auth.username}`, JSON.stringify(user));
  if (typeof scheduleAccountSync === 'function') scheduleAccountSync();
}

let titleDetailIdV6 = '';
let titleDetailReturnFocusV6 = null;
let achievementRevealQueueV6 = [];

function achievementProgressV6(achievement) {
  const solved = Math.max(0, Number(user.totalSolved) || 0);
  const correct = Math.max(0, Number(user.totalCorrect) || 0);
  const accuracyValue = solved ? Math.round(correct / solved * 100) : 0;
  const subjectValue = id => Math.max(0, Number(user.mastery?.[id]) || 0);
  const simple = (current, target, unit = '') => ({ current, target, percent: Math.min(100, current / target * 100), text: `${Math.min(current, target)} / ${target}${unit}` });
  if (achievement.id === 'first_step') return simple(Number(user.quizCount) || 0, 1, ' 次测试');
  if (achievement.id === 'ten_solved') return simple(solved, 10, ' 题');
  if (achievement.id === 'fifty_solved') return simple(solved, 50, ' 题');
  if (achievement.id === 'hundred_solved') return simple(solved, 100, ' 题');
  if (achievement.id === 'three_hundred') return simple(solved, 300, ' 题');
  if (achievement.id === 'perfect_quiz') return simple(Number(user.perfectQuizzes) || 0, 1, ' 次满分');
  if (achievement.id === 'math_master') return simple(subjectValue('math'), 150, ' 题答对');
  if (achievement.id === 'english_master') return simple(subjectValue('english'), 150, ' 题答对');
  if (achievement.id === 'science_master') return simple(subjectValue('science'), 150, ' 题答对');
  if (achievement.id === 'all_rounder') {
    const values = ['math', 'english', 'science'].map(subjectValue);
    return { current: Math.min(...values), target: 20, percent: Math.min(100, Math.min(...values) / 20 * 100), text: `数学 ${values[0]} · 英语 ${values[1]} · 科学 ${values[2]}` };
  }
  if (achievement.id === 'accuracy_80' || achievement.id === 'accuracy_95') {
    const targetSolved = achievement.id === 'accuracy_80' ? 20 : 50;
    const targetAccuracy = achievement.id === 'accuracy_80' ? 80 : 95;
    return { current: accuracyValue, target: targetAccuracy, percent: Math.min(100, Math.min(solved / targetSolved, accuracyValue / targetAccuracy) * 100), text: `${Math.min(solved, targetSolved)} / ${targetSolved} 题 · 正确率 ${accuracyValue}% / ${targetAccuracy}%` };
  }
  const targetStreak = achievement.id === 'streak_30' ? 30 : achievement.id === 'streak_7' ? 7 : 3;
  return simple(Number(user.streak) || 0, targetStreak, ' 天');
}

function unlockAchievements() {
  const unlockedNow = [];
  user.achievementUnlockedAt = user.achievementUnlockedAt && typeof user.achievementUnlockedAt === 'object' ? user.achievementUnlockedAt : {};
  user.seenAchievementReveals = Array.isArray(user.seenAchievementReveals) ? user.seenAchievementReveals : [];
  for (const achievement of ACHIEVEMENTS) {
    if (achievement.test(user) && !user.unlockedAchievements.includes(achievement.id)) {
      user.unlockedAchievements.push(achievement.id);
      user.achievementUnlockedAt[achievement.id] = new Date().toISOString();
      unlockedNow.push(achievement.id);
    }
  }
  if (unlockedNow.length) {
    saveUser();
    achievementRevealQueueV6.push(...unlockedNow.filter(id => !user.seenAchievementReveals.includes(id)));
    setTimeout(showNextAchievementRevealV6, 180);
  }
}

function achievementArtUrlV7(path = '') {
  try { return path ? new URL(path, document.baseURI).href : ''; }
  catch { return path; }
}

function renderAchievements() {
  const unlocked = new Set(user.unlockedAchievements);
  const equipped = ACHIEVEMENTS.find(achievement => achievement.id === user.equippedTitle && unlocked.has(achievement.id));
  const equippedArtUrl = achievementArtUrlV7(equipped?.art);
  home.className = `home-v2${equipped ? ` has-equipped-title-v7 title-theme-${equipped.style}` : ''}`;
  home.style.setProperty('--home-title-art', equipped ? `url("${equippedArtUrl}")` : 'none');
  titleHomeIdentityV7.hidden = !equipped;
  titleHomeIdentityV7.className = `title-home-identity-v7${equipped ? ` title-theme-${equipped.style}` : ''}`;
  titleHomeIdentityV7.style.setProperty('--title-home-art', equipped ? `url("${equippedArtUrl}")` : 'none');
  titleHomeArtV7.src = equipped?.art || '';
  titleHomeTierV7.textContent = equipped ? (lang === 'zh' ? `已装备称号 · ${equipped.tierZh}` : `EQUIPPED TITLE · ${equipped.tierEn}`) : '';
  titleHomeNameV7.textContent = equipped ? (lang === 'zh' ? equipped.zh : equipped.en) : '';
  titleHomeEnglishV7.textContent = equipped?.en?.toUpperCase() || '';
  titleHomeDescriptionV7.textContent = equipped ? (lang === 'zh' ? `达成记录 · ${equipped.zhDesc}` : `UNLOCKED BY · ${equipped.enDesc}`) : '';
  titleHomeSealV7.textContent = equipped?.silhouette || '✦';
  titleHomeMarkStateV7.textContent = equipped ? (lang === 'zh' ? '正在展示' : 'ON DISPLAY') : '';
  titleHomeIdentityV7.dataset.artLabel = equipped ? (lang === 'zh' ? '完整称号画面' : 'FULL TITLE ART') : '';
  titleHomeIdentityV7.setAttribute('aria-label', equipped ? (lang === 'zh' ? `当前装备称号：${equipped.zh}。查看称号档案` : `Active title: ${equipped.en}. View title record`) : '');
  equippedTitleCardV6.hidden = !equipped;
  equippedTitleCardV6.className = `equipped-title-card-v6${equipped ? ` title-theme-${equipped.style}` : ''}`;
  equippedTitleCardV6.style.setProperty('--equipped-art', equipped ? `url("${equippedArtUrl}")` : 'none');
  equippedTitle.textContent = equipped ? (lang === 'zh' ? equipped.zh : equipped.en) : '';
  equippedTitleCardV6.querySelector('.equipped-title-seal-v6').textContent = equipped?.silhouette || '✦';
  achievementEntry.className = `achievement-entry title-entry-v5${equipped ? ` title-theme-${equipped.style}` : ''}`;
  achievementEntry.style.setProperty('--entry-art', equipped ? `url("${equippedArtUrl}")` : 'none');
  achievementEntry.dataset.silhouette = equipped?.silhouette || '✧';
  achievementEntryIcon.textContent = equipped?.silhouette || '✧';
  badges.innerHTML = `<span class="badge gold">${lang === 'zh' ? '里程碑' : 'Milestones'} ${unlocked.size}/${ACHIEVEMENTS.length}</span>`;
  achievementKicker.textContent = equipped ? (lang === 'zh' ? `当前装备 · ${equipped.tierZh}` : `EQUIPPED · ${equipped.tierEn}`) : (lang === 'zh' ? '成长档案' : 'GROWTH RECORD');
  achievementHeading.textContent = equipped ? (lang === 'zh' ? equipped.zh : equipped.en) : (lang === 'zh' ? '称号展柜' : 'Title Vault');
  achievementSummary.textContent = lang === 'zh' ? `完成真实学习目标，解锁成长称号（${unlocked.size}/${ACHIEVEMENTS.length}）` : `Complete meaningful learning goals to unlock titles (${unlocked.size}/${ACHIEVEMENTS.length})`;
  if (achievementPanel.hidden && achievementGrid.dataset.ready !== 'true') return;
  achievementGrid.dataset.ready = 'true';
  achievementGrid.innerHTML = ACHIEVEMENTS.map((achievement, index) => {
    const isUnlocked = unlocked.has(achievement.id);
    const isEquipped = user.equippedTitle === achievement.id;
    const name = lang === 'zh' ? achievement.zh : achievement.en;
    const description = lang === 'zh' ? achievement.zhDesc : achievement.enDesc;
    const tier = lang === 'zh' ? achievement.tierZh : achievement.tierEn;
    const state = isEquipped ? (lang === 'zh' ? '使用中' : 'ACTIVE') : isUnlocked ? (lang === 'zh' ? '查看与装备' : 'VIEW & EQUIP') : (lang === 'zh' ? '查看进度' : 'VIEW PROGRESS');
    const romanTier = achievement.tierZh.match(/[IVX]+$/)?.[0] || 'I';
    return `<button class="achievement-card title-card-v5 title-theme-${achievement.style} ${isUnlocked ? 'is-unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}" style="--title-art:url('${esc(achievementArtUrlV7(achievement.art))}')" data-title-id="${achievement.id}" data-rarity="${romanTier}" onclick="openAchievementDetailV6('${achievement.id}')" aria-label="${esc(`${name}，${description}，${state}`)}" aria-pressed="${isEquipped}"><img class="title-card-art-v6" src="${esc(achievement.art)}" loading="lazy" decoding="async" alt=""><span class="title-card-film-v6" aria-hidden="true"></span><span class="title-card-top-v5"><small>${esc(tier)}</small><b>NO. ${String(index + 1).padStart(2, '0')}</b></span><span class="title-card-seal-v6" aria-hidden="true">${esc(achievement.silhouette)}</span><span class="title-card-copy-v5"><strong>${esc(name)}</strong><em>${esc(achievement.en)}</em><small>${esc(description)}</small></span><span class="title-card-state-v5"><span>${isEquipped ? '●' : isUnlocked ? '◇' : '⌁'}</span>${esc(state)}</span></button>`;
  }).join('');
}

function equipAchievement(id) {
  if (!user.unlockedAchievements.includes(id)) return;
  user.equippedTitle = user.equippedTitle === id ? '' : id;
  saveUser();
  renderAchievements();
  if (user.equippedTitle) {
    titleHomeIdentityV7.classList.remove('is-activating');
    requestAnimationFrame(() => titleHomeIdentityV7.classList.add('is-activating'));
    setTimeout(() => titleHomeIdentityV7.classList.remove('is-activating'), 900);
  }
}

function openEquippedAchievementV6() {
  if (user.equippedTitle) openAchievementDetailV6(user.equippedTitle);
}

function achievementDateV6(id) {
  const raw = user.achievementUnlockedAt?.[id];
  if (!raw || !Number.isFinite(Date.parse(raw))) return lang === 'zh' ? '已解锁 · 历史记录已迁移' : 'Unlocked · migrated record';
  return new Date(raw).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function openAchievementDetailV6(id, options = {}) {
  const achievement = ACHIEVEMENTS.find(item => item.id === id);
  if (!achievement) return;
  const index = ACHIEVEMENTS.indexOf(achievement);
  const unlocked = user.unlockedAchievements.includes(id);
  const equipped = user.equippedTitle === id;
  const progress = achievementProgressV6(achievement);
  titleDetailIdV6 = id;
  titleDetailReturnFocusV6 = options.reveal ? null : document.activeElement;
  titleDetailStage.className = `title-detail-stage-v6 title-theme-${achievement.style}${options.reveal ? ' is-reveal' : ''}${unlocked ? ' is-unlocked' : ' is-locked'}`;
  titleDetailStage.style.setProperty('--detail-art', `url("${achievementArtUrlV7(achievement.art)}")`);
  titleDetailTier.textContent = lang === 'zh' ? achievement.tierZh : achievement.tierEn;
  titleDetailIndex.textContent = `NO. ${String(index + 1).padStart(2, '0')}`;
  titleDetailSeal.textContent = achievement.silhouette;
  titleDetailRevealLabel.hidden = !options.reveal;
  titleDetailName.textContent = lang === 'zh' ? achievement.zh : achievement.en;
  titleDetailEnglish.textContent = achievement.en.toUpperCase();
  titleDetailDescription.textContent = lang === 'zh' ? achievement.zhDesc : achievement.enDesc;
  titleDetailCondition.textContent = lang === 'zh' ? achievement.zhDesc : achievement.enDesc;
  titleDetailProgressText.textContent = unlocked ? (lang === 'zh' ? '目标已达成' : 'Goal complete') : progress.text;
  titleDetailProgressBar.style.width = `${unlocked ? 100 : progress.percent}%`;
  titleDetailDate.textContent = unlocked ? achievementDateV6(id) : (lang === 'zh' ? '尚未解锁' : 'Not unlocked');
  titleDetailState.textContent = equipped ? (lang === 'zh' ? '这个称号正在首页展示' : 'Shown on your home') : unlocked ? (lang === 'zh' ? '已收入成长档案' : 'Saved to your growth record') : (lang === 'zh' ? '继续真实学习即可推进进度' : 'Keep learning to move this forward');
  titleDetailEquip.disabled = !unlocked;
  titleDetailEquip.textContent = !unlocked ? (lang === 'zh' ? '尚未解锁' : 'Locked') : equipped ? (lang === 'zh' ? '取消展示' : 'Unequip') : (lang === 'zh' ? '设为当前称号' : 'Set as current title');
  titleDetailModal.hidden = false;
  document.body.style.overflow = 'hidden';
  if (options.reveal && !user.seenAchievementReveals.includes(id)) {
    user.seenAchievementReveals.push(id);
    saveUser();
  }
  setTimeout(() => (unlocked ? titleDetailEquip : titleDetailModal.querySelector('.title-detail-close-v6'))?.focus(), 0);
}

function equipAchievementFromDetailV6() {
  if (!titleDetailIdV6 || !user.unlockedAchievements.includes(titleDetailIdV6)) return;
  const returnFocus = titleDetailReturnFocusV6;
  equipAchievement(titleDetailIdV6);
  openAchievementDetailV6(titleDetailIdV6);
  titleDetailReturnFocusV6 = returnFocus;
}

function closeAchievementDetailV6() {
  titleDetailModal.hidden = true;
  document.body.style.overflow = '';
  const returnFocus = titleDetailReturnFocusV6;
  titleDetailIdV6 = '';
  titleDetailReturnFocusV6 = null;
  if (achievementRevealQueueV6.length) setTimeout(showNextAchievementRevealV6, 120);
  else if (returnFocus?.isConnected) returnFocus.focus();
}

function showNextAchievementRevealV6() {
  if (!titleDetailModal.hidden) return;
  const nextId = achievementRevealQueueV6.shift();
  if (nextId) openAchievementDetailV6(nextId, { reveal: true });
}

function toggleAchievements() {
  achievementPanel.hidden = !achievementPanel.hidden;
  achievementChevron.textContent = achievementPanel.hidden ? '▾' : '▴';
  if (!achievementPanel.hidden) renderAchievements();
}

function localDateKeyV2(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readPracticeDraftV2(lessonId = '') {
  try {
    const draft = JSON.parse(sessionStorage.getItem(PRACTICE_DRAFT_KEY_V2) || 'null');
    const valid = draft?.version === 2 && Array.isArray(draft.questions) && draft.questions.length > 0 && Array.isArray(draft.answers)
      && draft.answers.length === draft.questions.length && Number.isInteger(draft.current) && draft.current >= 0 && draft.current < draft.questions.length
      && Date.now() - Number(draft.savedAt) < PRACTICE_DRAFT_MAX_AGE_V2 && (!lessonId || draft.lessonId === lessonId);
    if (!valid) {
      if (!lessonId || draft?.lessonId === lessonId) sessionStorage.removeItem(PRACTICE_DRAFT_KEY_V2);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function savePracticeDraftV2() {
  if (graded || !questions.length || !questions[0]?.lessonId) return;
  try {
    sessionStorage.setItem(PRACTICE_DRAFT_KEY_V2, JSON.stringify({
      version: 2,
      subject,
      levelId: String(questions[0].levelId),
      lessonId: questions[0].lessonId,
      questions,
      answers,
      current,
      savedAt: Date.now()
    }));
  } catch {}
}

function clearPracticeDraftV2() {
  try { sessionStorage.removeItem(PRACTICE_DRAFT_KEY_V2); } catch {}
}

function stableTextV2(value) {
  if (value && typeof value === 'object') return String(value.en || value.zh || Object.values(value)[0] || '');
  return String(value ?? '');
}

function lessonIdV2(subjectId, levelId, knowledge) {
  const normalized = stableTextV2(knowledge).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'general';
  return `${subjectId}:${levelId}:${normalized}`;
}

function contentSourcesV2() {
  const config = window.NAMELESS_CONTENT_CONFIG || {};
  return Array.isArray(config.sources) ? config.sources : [];
}

function validateContentBankV2(bank, source) {
  if (!bank || !Array.isArray(bank.levels) || !bank.levels.length || bank.subject !== source.subject) {
    throw new Error(`${source.url}: invalid course package`);
  }
  const ids = new Set();
  for (const level of bank.levels) {
    if (typeof level?.id !== 'string' || !Array.isArray(level.questions) || !level.questions.length) {
      throw new Error(`${source.url}: invalid course stage`);
    }
    for (const question of level.questions) {
      if (!question?.id || ids.has(question.id) || !question.question) throw new Error(`${source.url}: invalid item id`);
      ids.add(question.id);
      const type = question.type || 'single_choice';
      if (['mc', 'meaning', 'synonym', 'grammar', 'reading', 'single_choice'].includes(type)) {
        if (!Array.isArray(question.options) || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length) {
          throw new Error(`${source.url}: invalid choice item ${question.id}`);
        }
      }
      if (type === 'multi_select' && (!Array.isArray(question.options) || !Array.isArray(question.answer))) {
        throw new Error(`${source.url}: invalid multi-select item ${question.id}`);
      }
    }
  }
  return bank;
}

async function configuredContentSourcesV2() {
  const config = window.NAMELESS_CONTENT_CONFIG || {};
  if (!config.manifestUrl) return { provider: config.provider, sources: contentSourcesV2() };
  if (location.protocol === 'file:') throw new Error('远程课程清单需要通过 HTTP 或 HTTPS 打开应用。');
  const response = await fetch(config.manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`课程清单加载失败：${response.status}`);
  const manifest = await response.json();
  if (!manifest?.provider?.name || !Array.isArray(manifest.sources)) throw new Error('课程清单格式无效。');
  return manifest;
}

async function loadContentSourceV2(source) {
  if (location.protocol === 'file:') {
    const bank = globalThis.__NAMELESS_QUESTION_BANKS__?.[`${source.subject}:normal`];
    if (!bank) throw new Error(`离线课程包缺少 ${source.subject}`);
    return [source, validateContentBankV2(bank, source)];
  }
  const response = await fetch(source.url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${source.url}: ${response.status}`);
  return [source, validateContentBankV2(await response.json(), source)];
}

async function refreshQuestionBanks() {
  const manifest = await configuredContentSourcesV2();
  const sources = manifest.sources.filter(source => ['math', 'english', 'science'].includes(source.subject));
  if (sources.length !== 3 || new Set(sources.map(source => source.subject)).size !== 3) throw new Error('课程清单必须包含数学、英语和科学三个内容源。');
  const loaded = await Promise.all(sources.map(loadContentSourceV2));
  loaded.forEach(([source, bank]) => { banks[source.subject] = bank; });
  loadedContentProviderV2 = manifest.provider || window.NAMELESS_CONTENT_CONFIG?.provider || null;
  let curriculumPackagesLoadedV3 = 0;
  if (typeof CurriculumV3 !== 'undefined') {
    const curriculum = await CurriculumV3.loadEnabledPackages({ math: banks.math, english: banks.english, science: banks.science });
    Object.entries(curriculum.banks).forEach(([subjectId, bank]) => { banks[subjectId] = bank; });
    curriculumPackagesLoadedV3 = curriculum.loaded;
    loadedContentProviderV2 = curriculum.provider;
  }
  if (typeof loadInstalledCoursePackagesV3 === 'function') {
    const installed = await loadInstalledCoursePackagesV3();
    installed.forEach(coursePackage => { if (!validateProductionPackageV3(coursePackage).length) banks[coursePackage.subject] = coursePackage; });
    if (installed.length) loadedContentProviderV2 = { id: 'local-installed-packages', name: installed.map(item => item.provider?.name).filter(Boolean).join(' / ') || '本机课程包', kind: 'local-declared', notice: '本机导入课程包已通过结构校验；许可证声明仍需人工和法律核验。' };
  }
  const badge = document.getElementById('contentSourceBadge');
  if (badge) {
    const compatibility = loadedContentProviderV2?.kind === 'compatibility';
    const localDeclared = loadedContentProviderV2?.kind === 'local-declared';
    const standardPilot = loadedContentProviderV2?.kind === 'standard-aligned-pilot';
    badge.textContent = compatibility ? '迁移内容 · 待正式授权源' : localDeclared ? `${loadedContentProviderV2.name} · 声明待核验` : standardPilot ? '国家课标 V3 · 教材待授权' : `${loadedContentProviderV2?.name || '课程内容'} · 已验证`;
    badge.classList.toggle('is-warning', compatibility || localDeclared || standardPilot);
    badge.title = loadedContentProviderV2?.notice || '';
  }
  document.getElementById('start').disabled = true;
  if (typeof renderAdminLevels === 'function' && typeof adminActive !== 'undefined' && adminActive) renderAdminLevels();
  if (typeof CurriculumV3 !== 'undefined') CurriculumV3.renderCatalog();
  return loaded.length + curriculumPackagesLoadedV3;
}

function ensureLearningProfileV2() {
  user.knowledgeMastery = user.knowledgeMastery && typeof user.knowledgeMastery === 'object' ? user.knowledgeMastery : {};
  user.reviewSchedule = user.reviewSchedule && typeof user.reviewSchedule === 'object' ? user.reviewSchedule : {};
  user.lessonRewards = user.lessonRewards && typeof user.lessonRewards === 'object' ? user.lessonRewards : {};
  user.dailyLessons = user.dailyLessons && typeof user.dailyLessons === 'object' ? user.dailyLessons : {};
  user.lastCourse = user.lastCourse && typeof user.lastCourse === 'object' ? user.lastCourse : null;
  user.wrongBook = Array.isArray(user.wrongBook) ? user.wrongBook.map(item => ({ ...item, resolved: item.resolved === true })) : [];
}

function loadUser() {
  try {
    const raw = localStorage.getItem('gongxing_academy_data');
    if (raw) {
      const saved = JSON.parse(raw);
      user = {
        ...user,
        ...saved,
        mastery: { ...user.mastery, ...(saved.mastery || {}) },
        wrongBook: saved.wrongBook || [],
        unlockedAchievements: saved.unlockedAchievements || [],
        achievementUnlockedAt: saved.achievementUnlockedAt && typeof saved.achievementUnlockedAt === 'object' ? saved.achievementUnlockedAt : {},
        seenAchievementReveals: Array.isArray(saved.seenAchievementReveals) ? saved.seenAchievementReveals : (saved.unlockedAchievements || []),
        pointHistory: Array.isArray(saved.pointHistory) ? saved.pointHistory : []
      };
      user.points = Number.isFinite(Number(saved.points)) ? Math.min(adminSettings.pointCap, Math.max(0, Math.floor(Number(saved.points)))) : 0;
      user.lifetimePointsEarned = Math.max(0, Math.floor(Number(saved.lifetimePointsEarned) || 0));
    }
  } catch {}
  user.unlockedAchievements = Array.isArray(user.unlockedAchievements) ? user.unlockedAchievements : [];
  user.achievementUnlockedAt = user.achievementUnlockedAt && typeof user.achievementUnlockedAt === 'object' ? user.achievementUnlockedAt : {};
  user.seenAchievementReveals = Array.isArray(user.seenAchievementReveals) ? user.seenAchievementReveals : [...user.unlockedAchievements];
  ensureLearningProfileV2();
  const curriculumMigratedV3 = typeof CurriculumV3 !== 'undefined' && CurriculumV3.migrateUserState(user);
  const todayDate = new Date().toLocaleDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (user.lastDate !== todayDate) {
    if (user.lastDate && user.lastDate !== yesterday.toLocaleDateString()) user.streak = 0;
    user.todaySolved = 0;
  }
  if (curriculumMigratedV3) saveUser();
  updateDash();
}

function masteryRecordsV2(subjectId = '') {
  ensureLearningProfileV2();
  return Object.entries(user.knowledgeMastery)
    .filter(([key]) => !subjectId || key.startsWith(`${subjectId}:`))
    .map(([, record]) => record);
}

function averageMasteryV2(subjectId = '') {
  const records = masteryRecordsV2(subjectId);
  return records.length ? Math.round(records.reduce((sum, record) => sum + (Number(record.score) || 0), 0) / records.length) : 0;
}

function updateDash() {
  ensureLearningProfileV2();
  today.textContent = user.todaySolved;
  accuracy.textContent = `${user.totalSolved ? Math.round(user.totalCorrect / user.totalSolved * 100) : 0}%`;
  streak.textContent = user.streak;
  pointsStat.textContent = user.points;
  gamePointBalance.textContent = user.points;
  const overall = averageMasteryV2();
  masteryAverage.textContent = `${overall}%`;
  document.querySelector('.focus-orbit')?.style.setProperty('--mastery', `${overall}%`);
  const todayKey = localDateKeyV2();
  const completedToday = Number(user.dailyLessons[todayKey]) || 0;
  const unresolved = user.wrongBook.filter(item => !item.resolved).length;
  const lessonGoal = Math.max(1, Number(adminSettings.dailyLessonGoal) || DEFAULT_DAILY_LESSON_GOAL);
  todayPlanStatus.textContent = `${Math.min(lessonGoal, completedToday)} / ${lessonGoal} 节`;
  wrongCountLabel.textContent = unresolved ? `${unresolved} 道待订正` : '暂无待订正';
  const completedLessons = masteryRecordsV2().filter(record => record.completed).length;
  const ranks = lang === 'zh'
    ? [[50, '自驱学习者'], [25, '知识航海家'], [10, '知识构筑者'], [3, '寻路者'], [0, '初见者']]
    : [[50, 'Self-directed Learner'], [25, 'Knowledge Navigator'], [10, 'Knowledge Builder'], [3, 'Pathfinder'], [0, 'New Explorer']];
  const rank = ranks.find(([threshold]) => completedLessons >= threshold)?.[1];
  growthRank.textContent = `${lang === 'zh' ? '成长阶段' : 'Growth stage'} · ${rank}`;
  const draft = readPracticeDraftV2();
  continueLabel.textContent = draft ? (lang === 'zh' ? '继续未完成练习' : 'Resume practice') : (lang === 'zh' ? '继续今日学习' : 'Continue learning');
  continueHint.textContent = draft ? `${Number(draft.current) + 1} / ${draft.questions.length}` : (lang === 'zh' ? '约 6 分钟' : 'About 6 min');
  for (const subjectId of ['math', 'english', 'science']) {
    const progress = document.getElementById(`${subjectId}Progress`);
    if (progress) progress.textContent = `${averageMasteryV2(subjectId)}%`;
    const meta = document.getElementById(`${subjectId}Meta`);
    if (meta && banks[subjectId]) meta.textContent = lang === 'zh' ? `${banks[subjectId].levels.length} 个课程阶段` : `${banks[subjectId].levels.length} course stages`;
  }
  unlockAchievements();
  renderAchievements();
  if (typeof renderSmartPlanV3 === 'function') renderSmartPlanV3();
}

function setLang(nextLanguage) {
  lang = nextLanguage === 'en' ? 'en' : 'zh';
  localStorage.setItem('gongxing_lang', lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = lang === 'zh' ? '学会啦 - 学习工作台' : 'Got It Learning - Learning Studio';
  brandName.textContent = lang === 'zh' ? '学会啦' : 'Got It Learning';
  en.textContent = 'EN';
  zh.textContent = '中';
  en.className = lang === 'en' ? 'active' : '';
  zh.className = lang === 'zh' ? 'active' : '';
  const copy = lang === 'zh' ? {
    kicker: '你的个性化学习路线', title: '把知识真正学会', emphasis: '不只是把题做完',
    body: '按课程推进，在练习、订正与复习中建立长期掌握。每次只专注一个小目标。',
    home: '课程', sub: '按年级、课次与知识点继续学习。',
    math: '数学', english: '英语', science: '科学',
    mathDesc: '从数感到推理，把每一步都说清楚', englishDesc: '词汇、语法与阅读，在语境中理解', scienceDesc: '从观察证据到建立科学解释',
    today: '今日完成题目', accuracy: '整体正确率', streak: '连续学习天数', points: '专注积分',
    game: '受控休息区', gameSub: '完成学习后，用专注积分安排一段有上限的休息时间', usage: '学习回顾', usageSub: '查看专注时间、课程记录与掌握变化', guardian: '家长安心报告', guardianSub: '目标、时间、掌握依据与内容来源一页看清'
  } : {
    kicker: 'YOUR PERSONAL LEARNING PATH', title: 'Build real understanding', emphasis: 'not just completed questions',
    body: 'Move through focused lessons, corrections, and review. One meaningful objective at a time.',
    home: 'Courses', sub: 'Continue by grade, lesson, and concept.',
    math: 'Mathematics', english: 'English', science: 'Science',
    mathDesc: 'From number sense to reasoning, make every step clear', englishDesc: 'Vocabulary, grammar, and reading in context', scienceDesc: 'From observed evidence to scientific explanations',
    today: 'Questions today', accuracy: 'Overall accuracy', streak: 'Learning streak', points: 'Focus points',
    game: 'Controlled break', gameSub: 'After learning, exchange focus points for a time-limited break', usage: 'Learning review', usageSub: 'Review focus time, lessons, and mastery changes', guardian: 'Guardian overview', guardianSub: 'Goals, time, evidence, and content source at a glance'
  };
  const legacyHeroCopy = { heroKicker: copy.kicker, heroTitle: copy.title, heroEm: copy.emphasis, heroCopy: copy.body };
  for (const [id, value] of Object.entries(legacyHeroCopy)) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }
  homeTitle.textContent = copy.home;
  homeSubtitle.textContent = copy.sub;
  mathTitle.textContent = copy.math;
  englishTitle.textContent = copy.english;
  scienceTitle.textContent = copy.science;
  mathDesc.textContent = copy.mathDesc;
  englishDesc.textContent = copy.englishDesc;
  scienceDesc.textContent = copy.scienceDesc;
  todayLabel.textContent = copy.today;
  accuracyLabel.textContent = copy.accuracy;
  streakLabel.textContent = copy.streak;
  pointsLabel.textContent = copy.points;
  gameEntryTitle.textContent = copy.game;
  gameEntrySub.textContent = copy.gameSub;
  gamePointUnit.textContent = lang === 'zh' ? '积分' : 'points';
  usageEntryTitle.textContent = copy.usage;
  usageEntrySub.textContent = copy.usageSub;
  guardianEntryTitle.textContent = copy.guardian;
  guardianEntrySub.textContent = copy.guardianSub;
  if (typeof translateAdmin === 'function') translateAdmin();
  if (!exchangeModal.hidden) renderExchange();
  if (!usageModal.hidden) renderUsage();
  if (subject !== 'none') {
    const ui = SUBJECT_UI_V2[subject];
    crumb.textContent = `› ${ui[lang]}`;
    populate();
  }
  if (questions.length) render();
  updateDash();
}

function goHome() {
  home.hidden = false;
  setup.hidden = true;
  lessonDemoView.hidden = true;
  quizView.hidden = true;
  subject = 'none';
  questions = [];
  answers = [];
  current = 0;
  graded = false;
  quizStartedAt = 0;
  crumb.textContent = '';
  langToggle.hidden = false;
  applyAdminMode();
  updateDash();
}

function continueLearning() {
  ensureLearningProfileV2();
  const draft = readPracticeDraftV2();
  const target = draft && banks[draft.subject] ? { subject: draft.subject, levelId: draft.levelId, lessonId: draft.lessonId } : user.lastCourse && banks[user.lastCourse.subject] ? user.lastCourse : { subject: 'math' };
  selectSubject(target.subject, target.levelId, target.lessonId);
}

function startCorrectionsV2() {
  ensureLearningProfileV2();
  const item = user.wrongBook.find(entry => !entry.resolved && banks[entry.subject]);
  if (!item) return continueLearning();
  if (typeof practiceIntentV3 !== 'undefined') practiceIntentV3 = { type: 'correction', lessonId: item.lessonId, questionId: item.questionId };
  selectSubject(item.subject, item.level, item.lessonId);
}

function selectSubject(subjectId, preferredLevelId = '', preferredLessonId = '') {
  if (!banks[subjectId]) return error(lang === 'zh' ? '课程内容尚未加载完成。' : 'Course content is still loading.');
  subject = subjectId;
  home.hidden = true;
  setup.hidden = false;
  lessonDemoView.hidden = true;
  quizView.hidden = true;
  langToggle.hidden = false;
  const ui = SUBJECT_UI_V2[subjectId];
  crumb.textContent = `› ${ui[lang]}`;
  courseSubjectMark.textContent = ui.mark;
  courseKicker.textContent = ui.kicker;
  courseTitle.textContent = lang === 'zh' ? `${ui.zh}课程` : `${ui.en} Path`;
  populate(preferredLevelId, preferredLessonId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function populate(preferredLevelId = '', preferredLessonId = '') {
  const allowed = allowedLevelIds(subject);
  const available = banks[subject].levels.filter(level => !allowed || allowed.has(String(level.id)));
  levels.replaceChildren(...available.map(level => {
    const option = document.createElement('option');
    option.value = level.id;
    option.textContent = tx(level.name);
    return option;
  }));
  if (preferredLevelId && available.some(level => String(level.id) === String(preferredLevelId))) levels.value = String(preferredLevelId);
  setupNote.textContent = lang === 'zh' ? `共 ${available.length} 个课程阶段。选择阶段后，从一个知识点开始。` : `${available.length} course stages. Choose one concept to begin.`;
  selectedLessonIdV2 = preferredLessonId || '';
  populateLessons();
}

function lessonsForLevelV2(level) {
  if (Array.isArray(level?.lessons) && level.lessons.length) return level.lessons.map(lesson => ({ ...lesson, questions: lesson.questions || [] }));
  const grouped = new Map();
  for (const question of level?.questions || []) {
    const knowledge = stableTextV2(question.knowledge) || (lang === 'zh' ? '综合练习' : 'Integrated practice');
    const id = lessonIdV2(subject, level.id, question.knowledge || knowledge);
    if (!grouped.has(id)) grouped.set(id, { id, title: question.knowledge || { zh: knowledge, en: knowledge }, questions: [] });
    grouped.get(id).questions.push(question);
  }
  return [...grouped.values()];
}

function populateLessons() {
  const level = banks[subject]?.levels.find(item => String(item.id) === String(levels.value));
  activeLessonsV2 = lessonsForLevelV2(level);
  const levelRecords = activeLessonsV2.map(lesson => user.knowledgeMastery?.[lesson.id]).filter(Boolean);
  const levelScore = levelRecords.length ? Math.round(levelRecords.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / levelRecords.length) : 0;
  levelMastery.textContent = `${levelScore}%`;
  levelMasteryBar.style.width = `${levelScore}%`;
  lessonCount.textContent = lang === 'zh' ? `${activeLessonsV2.length} 节` : `${activeLessonsV2.length} lessons`;
  lessonGrid.innerHTML = activeLessonsV2.map((lesson, index) => {
    const record = user.knowledgeMastery?.[lesson.id];
    const scoreValue = Math.round(Number(record?.score) || 0);
    const previous = index ? user.knowledgeMastery?.[activeLessonsV2[index - 1].id] : null;
    const needsFoundation = index > 0 && previous && !previous.completed && !record?.completed;
    const review = typeof reviewLabelV3 === 'function' ? reviewLabelV3(lesson.id) : '';
    return `<button class="lesson-card ${record?.completed ? 'is-complete' : ''} ${needsFoundation ? 'needs-foundation' : ''}" type="button" data-lesson-id="${esc(lesson.id)}" onclick="selectLessonV2(${index},true)"><i>${record?.completed ? '✓' : String(index + 1).padStart(2, '0')}</i><span><strong>${esc(tx(lesson.title))}</strong><small>${review ? esc(review) : needsFoundation ? (lang === 'zh' ? '建议先巩固上一课' : 'Review the previous lesson first') : `${lesson.questions.length} ${lang === 'zh' ? '道可用题目' : 'available items'}`}</small></span><b>${scoreValue}%</b></button>`;
  }).join('');
  let targetIndex = activeLessonsV2.findIndex(lesson => lesson.id === selectedLessonIdV2);
  if (targetIndex < 0) targetIndex = activeLessonsV2.findIndex(lesson => !user.knowledgeMastery?.[lesson.id]?.completed);
  selectLessonV2(targetIndex < 0 ? 0 : targetIndex);
}

function selectLessonV2(index, revealPreview = false) {
  const lesson = activeLessonsV2[index];
  if (!lesson) {
    selectedLessonIdV2 = '';
    start.disabled = true;
    return;
  }
  selectedLessonIdV2 = lesson.id;
  lessonGrid.querySelectorAll('.lesson-card').forEach((button, buttonIndex) => button.classList.toggle('is-selected', buttonIndex === index));
  const record = user.knowledgeMastery?.[lesson.id];
  lessonNumber.textContent = lang === 'zh' ? `第 ${index + 1} 课` : `LESSON ${index + 1}`;
  lessonTitle.textContent = tx(lesson.title);
  lessonDescription.textContent = lang === 'zh'
    ? `聚焦“${tx(lesson.title)}”。完成后会更新掌握度，答错的内容将进入订正队列。`
    : `Focus on “${tx(lesson.title)}”. Completion updates mastery and routes mistakes into review.`;
  lessonQuestionCount.textContent = Math.min(TOTAL, lesson.questions.length);
  lessonMastery.textContent = `${Math.round(Number(record?.score) || 0)}%`;
  start.disabled = !lesson.questions.length;
  const draft = readPracticeDraftV2(lesson.id);
  start.classList.toggle('has-draft', !!draft);
  const intent = typeof practiceIntentV3 !== 'undefined' && practiceIntentV3?.lessonId === lesson.id ? practiceIntentV3.type : '';
  start.innerHTML = `${draft ? (lang === 'zh' ? `继续练习 · 第 ${draft.current + 1} 题` : `Resume · Question ${draft.current + 1}`) : intent === 'correction' ? (lang === 'zh' ? '先复习方法，再订正' : 'Review the method, then correct') : intent === 'review' ? (lang === 'zh' ? '先回顾，再复习' : 'Recap, then review') : record?.completed ? (lang === 'zh' ? '回顾方法并复习' : 'Recap and review') : (lang === 'zh' ? '先学方法' : 'Learn the method first')} <span>→</span>`;
  if (revealPreview && matchMedia('(max-width: 780px)').matches) setTimeout(() => lessonPreview.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
}

function selectedLessonV2() {
  return activeLessonsV2.find(lesson => lesson.id === selectedLessonIdV2) || null;
}

function beginLessonFlowV3() {
  const lesson = selectedLessonV2();
  if (!lesson?.questions?.length) return error(lang === 'zh' ? '请先选择一节课。' : 'Choose a lesson first.');
  const draft = readPracticeDraftV2(lesson.id);
  if (draft && draft.subject === subject && String(draft.levelId) === String(levels.value)) return startQuiz();
  openLessonDemoV3(lesson);
}

function openLessonDemoV3(lesson = selectedLessonV2()) {
  if (!lesson || typeof LessonDemoV3 === 'undefined') return startQuiz();
  const demo = LessonDemoV3.build(lesson, lang, subject);
  if (!demo) return startQuiz();
  lessonDemoLabel.textContent = lang === 'zh' ? '知识点微课 · 先学后练' : 'CONCEPT LESSON · LEARN THEN PRACTISE';
  lessonDemoTitle.textContent = demo.title;
  lessonDemoGoal.textContent = demo.goal;
  lessonDemoDuration.textContent = lang === 'zh' ? `约 ${demo.durationMinutes} 分钟` : `About ${demo.durationMinutes} min`;
  lessonDemoDefinition.textContent = demo.definition;
  lessonDemoCore.textContent = demo.core;
  lessonDemoWhen.textContent = demo.when;
  lessonDemoVisual.innerHTML = typeof KnowledgeVisualsV1 !== 'undefined' ? KnowledgeVisualsV1.render(demo.visual, demo.title, demo.core) : '';
  lessonDemoSteps.innerHTML = demo.steps.map((step, index) => `<article><i>${index + 1}</i><p>${esc(step)}</p></article>`).join('');
  lessonDemoExamplePrompt.textContent = demo.examplePrompt;
  lessonDemoExampleSteps.innerHTML = demo.exampleSteps.map((step, index) => `<p><i>${index + 1}</i><span>${esc(step)}</span></p>`).join('');
  lessonDemoExampleAnswer.textContent = `${lang === 'zh' ? '答案：' : 'Answer: '}${demo.exampleAnswer}`;
  lessonDemoTakeaway.textContent = demo.takeaway;
  lessonDemoMistake.textContent = demo.commonMistake;
  lessonDemoStart.innerHTML = `${lang === 'zh' ? '我懂了，开始练习' : 'I understand, start practice'} <span>→</span>`;
  lessonDemoReturnScrollV4 = window.scrollY;
  setup.hidden = true;
  quizView.hidden = true;
  lessonDemoView.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => demoBack.focus(), 0);
}

function closeLessonDemoV3() {
  lessonDemoView.hidden = true;
  setup.hidden = false;
  window.scrollTo({ top: lessonDemoReturnScrollV4, behavior: 'smooth' });
  setTimeout(() => start.focus(), 0);
}

function questionKey(q) {
  return q.id || JSON.stringify([q.type, q.question, q.passage, q.options]);
}

function startQuiz() {
  const level = banks[subject]?.levels.find(item => String(item.id) === String(levels.value));
  const lesson = selectedLessonV2();
  if (!level || !lesson?.questions.length) return error(lang === 'zh' ? '请先选择一节课。' : 'Choose a lesson first.');
  const draft = readPracticeDraftV2(lesson.id);
  if (draft && draft.subject === subject && String(draft.levelId) === String(level.id)) {
    questions = clone(draft.questions);
    answers = clone(draft.answers);
    current = draft.current;
  } else {
    const previousKey = `nameless-last-lesson:${lesson.id}`;
    const previous = new Set(JSON.parse(sessionStorage.getItem(previousKey) || '[]'));
    const pool = [...new Map(lesson.questions.map(question => [questionKey(question), question])).values()];
    const targetedId = typeof practiceIntentV3 !== 'undefined' && practiceIntentV3?.lessonId === lesson.id ? practiceIntentV3.questionId : '';
    const selected = selectBalanced(pool, Math.min(TOTAL, pool.length), previous, { pinnedId: targetedId });
    questions = selected.map(source => prepareQuestionV2(source, level, lesson));
    sessionStorage.setItem(previousKey, JSON.stringify(questions.map(question => question.id)));
    answers = Array(questions.length).fill(null);
    current = 0;
  }
  graded = false;
  quizStartedAt = Date.now();
  user.lastCourse = { subject, levelId: String(level.id), lessonId: lesson.id };
  saveUser();
  setup.hidden = true;
  lessonDemoView.hidden = true;
  quizView.hidden = false;
  score.style.display = 'none';
  score.className = 'score';
  practiceLessonTitle.textContent = tx(lesson.title);
  dots.innerHTML = questions.map((_, index) => `<i class="dot" onclick="jump(${index})"></i>`).join('');
  savePracticeDraftV2();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prepareQuestionV2(source, level, lesson) {
  const question = clone(source);
  question.levelId = level.id;
  question.levelName = level.name;
  question.lessonId = lesson.id;
  question.lessonTitle = lesson.title;
  const type = question.type || 'single_choice';
  if (['mc', 'meaning', 'synonym', 'grammar', 'reading', 'single_choice'].includes(type)) {
    const shuffled = shuffle(question.options.map((option, index) => ({ option, correct: index === question.answer })));
    question.options = shuffled.map(item => item.option);
    question.answer = shuffled.findIndex(item => item.correct);
  } else if (type === 'multi_select') {
    const answersSet = new Set(question.answer.map(Number));
    const shuffled = shuffle(question.options.map((option, index) => ({ option, correct: answersSet.has(index) })));
    question.options = shuffled.map(item => item.option);
    question.answer = shuffled.map((item, index) => item.correct ? index : -1).filter(index => index >= 0);
  }
  return question;
}

function questionTypeLabelV2(question) {
  const type = question.type || 'single_choice';
  const labels = lang === 'zh' ? {
    number: '数值填空', text: '文本填空', fill_blank: '填空题', short_answer: '简答题', boolean: '判断题',
    multi_select: '多选题', ordering: '排序题', matching: '配对题', reading: '阅读理解', single_choice: '单选题', mc: '单选题', meaning: '词义理解', synonym: '近义辨析', grammar: '语法应用'
  } : {
    number: 'NUMERIC RESPONSE', text: 'TEXT RESPONSE', fill_blank: 'FILL IN THE BLANK', short_answer: 'SHORT RESPONSE', boolean: 'TRUE OR FALSE',
    multi_select: 'MULTIPLE SELECT', ordering: 'ORDERING', matching: 'MATCHING', reading: 'READING', single_choice: 'SINGLE CHOICE', mc: 'SINGLE CHOICE', meaning: 'MEANING', synonym: 'SYNONYM', grammar: 'GRAMMAR'
  };
  return labels[type] || labels.single_choice;
}

function choiceQuestionV2(question) {
  return ['mc', 'meaning', 'synonym', 'grammar', 'reading', 'single_choice'].includes(question.type || 'single_choice');
}

function render() {
  const question = questions[current];
  if (!question) return;
  practiceProgressText.textContent = `${current + 1} / ${questions.length}`;
  document.querySelectorAll('.dot').forEach((dot, index) => {
    dot.className = `dot ${index === current ? 'active' : ''} ${!graded && answers[index] !== null ? 'answered' : ''} ${graded ? (correct(index) ? 'correct' : 'wrong') : ''}`;
  });
  prev.disabled = current === 0;
  next.style.display = current === questions.length - 1 ? 'none' : '';
  submit.style.display = !graded && current === questions.length - 1 ? '' : 'none';
  if (graded && current === questions.length - 1) next.style.display = 'none';
  let html = `<p class="qsub">${esc(questionTypeLabelV2(question))} · ${esc(tx(question.lessonTitle || question.knowledge))}</p>`;
  if (question.passage) html += `<div class="passage">${esc(tx(question.passage))}</div>`;
  html += `<div class="question">${esc(tx(question.question))}</div>`;
  html += renderAnswerControlV2(question);
  if (!graded && typeof renderTutorToolsV3 === 'function') html += renderTutorToolsV3(question);
  if (graded) {
    const isCorrect = correct(current);
    const empty = answers[current] === null;
    html += `<div class="feedback ${isCorrect ? 'good' : 'bad'}"><strong>${empty ? (lang === 'zh' ? '尚未作答' : 'Not answered') : isCorrect ? (lang === 'zh' ? '回答正确' : 'Correct') : (lang === 'zh' ? '这一步还需要订正' : 'This needs correction')}</strong><span class="explanation">${esc(feedbackExplanationV2(question, isCorrect))}</span><button class="report-question" type="button" onclick="reportQuestionV3(${current})">${lang === 'zh' ? '这道题有问题？' : 'Report an issue'}</button></div>`;
    quiz.className = `quiz quiz-v2 ${isCorrect ? 'correct' : 'wrong'}`;
  } else {
    quiz.className = 'quiz quiz-v2';
  }
  content.innerHTML = html;
}

function renderAnswerControlV2(question) {
  const disabled = graded ? 'disabled' : '';
  const type = question.type || 'single_choice';
  if (type === 'number') {
    return `<input class="answer" type="number" step="any" inputmode="decimal" placeholder="${lang === 'zh' ? '输入数值答案' : 'Enter a numeric answer'}" value="${answers[current] ?? ''}" oninput="save(this.value)" ${disabled}>`;
  }
  if (['text', 'fill_blank', 'short_answer'].includes(type)) {
    return `<input class="text-answer" type="text" autocomplete="off" placeholder="${lang === 'zh' ? '在这里输入答案' : 'Type your answer'}" value="${esc(answers[current] ?? '')}" oninput="save(this.value)" ${disabled}>`;
  }
  if (type === 'boolean') {
    const options = lang === 'zh' ? ['正确', '错误'] : ['True', 'False'];
    return `<div class="choices">${options.map((option, index) => `<button class="choice ${answers[current] === (index === 0) ? 'selected' : ''}" data-key="${index === 0 ? 'T' : 'F'}" onclick="save(${index === 0})" ${disabled}>${option}</button>`).join('')}</div>`;
  }
  if (type === 'multi_select') {
    const selected = new Set(Array.isArray(answers[current]) ? answers[current] : []);
    return `<div class="choices">${question.options.map((option, index) => `<button class="choice multi-choice ${selected.has(index) ? 'selected' : ''}" data-key="${String.fromCharCode(65 + index)}" onclick="toggleMultiV2(${index})" ${disabled}>${esc(tx(option))}</button>`).join('')}</div>`;
  }
  if (type === 'ordering') {
    const values = Array.isArray(answers[current]) ? answers[current] : Array(question.items?.length || 0).fill('');
    return `<div class="order-list">${values.map((value, index) => `<label class="order-row"><span>${index + 1}</span><select onchange="saveOrderV2(${index},this.value)" ${disabled}><option value="">${lang === 'zh' ? '选择这一位置' : 'Choose item'}</option>${(question.items || []).map((item, itemIndex) => `<option value="${itemIndex}" ${String(value) === String(itemIndex) ? 'selected' : ''}>${esc(tx(item))}</option>`).join('')}</select></label>`).join('')}</div>`;
  }
  if (type === 'matching') {
    const values = answers[current] && typeof answers[current] === 'object' ? answers[current] : {};
    return `<div class="matching-list">${(question.pairs || []).map((pair, index) => `<label class="matching-row"><span>${esc(tx(pair.left))}</span><b>→</b><select onchange="saveMatchV2(${index},this.value)" ${disabled}><option value="">${lang === 'zh' ? '选择配对项' : 'Choose match'}</option>${shuffle(question.pairs.map((item, pairIndex) => ({ item, pairIndex }))).map(({ item, pairIndex }) => `<option value="${pairIndex}" ${String(values[index]) === String(pairIndex) ? 'selected' : ''}>${esc(tx(item.right))}</option>`).join('')}</select></label>`).join('')}</div>`;
  }
  return `<div class="choices">${question.options.map((option, index) => `<button class="choice ${answers[current] === index ? 'selected' : ''} ${graded ? (index === question.answer && answers[current] === index ? 'good' : answers[current] === index ? 'bad' : index === question.answer ? 'missed' : '') : ''}" data-key="${String.fromCharCode(65 + index)}" onclick="save(${index})" ${disabled}>${esc(tx(option))}</button>`).join('')}</div>`;
}

function save(value) {
  if (graded) return;
  const type = questions[current].type || 'single_choice';
  if (type === 'number') answers[current] = value === '' ? null : Number(value);
  else if (['text', 'fill_blank', 'short_answer'].includes(type)) answers[current] = value === '' ? null : value;
  else answers[current] = value;
  savePracticeDraftV2();
  if (!['number', 'text', 'fill_blank', 'short_answer'].includes(type)) render();
}

function toggleMultiV2(index) {
  if (graded) return;
  const selected = new Set(Array.isArray(answers[current]) ? answers[current] : []);
  selected.has(index) ? selected.delete(index) : selected.add(index);
  answers[current] = [...selected].sort((a, b) => a - b);
  savePracticeDraftV2();
  render();
}

function saveOrderV2(position, value) {
  if (graded) return;
  const answer = Array.isArray(answers[current]) ? [...answers[current]] : Array(questions[current].items?.length || 0).fill('');
  answer[position] = value;
  answers[current] = answer;
  savePracticeDraftV2();
}

function saveMatchV2(position, value) {
  if (graded) return;
  answers[current] = { ...(answers[current] || {}), [position]: value };
  savePracticeDraftV2();
}

function normalizedAnswerV2(value, question) {
  let output = String(value ?? '');
  if (question.trimAnswer !== false) output = output.trim();
  if (!question.caseSensitive) output = output.toLocaleLowerCase();
  if (question.ignoreWhitespace) output = output.replace(/\s+/g, '');
  return output;
}

function correct(index) {
  const question = questions[index];
  const answer = answers[index];
  if (answer === null || answer === undefined || answer === '') return false;
  const type = question.type || 'single_choice';
  if (type === 'number') {
    const tolerance = Number.isFinite(Number(question.tolerance)) ? Number(question.tolerance) : EPS;
    const accepted = Array.isArray(question.answers) ? question.answers : [question.answer];
    return accepted.some(value => Math.abs(Number(answer) - Number(value)) <= tolerance);
  }
  if (['text', 'fill_blank', 'short_answer'].includes(type)) {
    const accepted = Array.isArray(question.answers) ? question.answers : [question.answer];
    return accepted.some(value => normalizedAnswerV2(value, question) === normalizedAnswerV2(answer, question));
  }
  if (type === 'boolean') return Boolean(answer) === Boolean(question.answer);
  if (type === 'multi_select') return JSON.stringify([...answer].map(Number).sort((a, b) => a - b)) === JSON.stringify([...question.answer].map(Number).sort((a, b) => a - b));
  if (type === 'ordering') {
    const expected = Array.isArray(question.answer) ? question.answer.map(String) : (question.items || []).map((_, itemIndex) => String(itemIndex));
    return Array.isArray(answer) && answer.length === expected.length && answer.every((value, position) => String(value) === expected[position]);
  }
  if (type === 'matching') return (question.pairs || []).every((_, pairIndex) => String(answer[pairIndex]) === String(pairIndex));
  return Number(answer) === Number(question.answer);
}

function answerTextV2(question) {
  const type = question.type || 'single_choice';
  if (type === 'number') return String(question.answer);
  if (['text', 'fill_blank', 'short_answer'].includes(type)) return String((question.answers || [question.answer]).join(' / '));
  if (type === 'boolean') return question.answer ? (lang === 'zh' ? '正确' : 'True') : (lang === 'zh' ? '错误' : 'False');
  if (type === 'multi_select') return question.answer.map(index => tx(question.options[index])).join('、');
  if (type === 'ordering') return (question.answer || question.items.map((_, index) => index)).map(index => tx(question.items[index])).join(' → ');
  if (type === 'matching') return question.pairs.map(pair => `${tx(pair.left)} → ${tx(pair.right)}`).join('；');
  return tx(question.options[question.answer]);
}

function feedbackExplanationV2(question, isCorrect) {
  const explanation = tx(question.explanation || question.rationale);
  if (explanation) return explanation;
  if (isCorrect) return lang === 'zh' ? `你已经抓住“${tx(question.knowledge)}”的关键。` : `You identified the key idea in “${tx(question.knowledge)}”.`;
  return lang === 'zh' ? `正确答案：${answerTextV2(question)}。这道题已加入订正队列，稍后再用自己的方法做一次。` : `Answer: ${answerTextV2(question)}. This item is now in your correction queue.`;
}

function nav(direction) {
  current = Math.max(0, Math.min(questions.length - 1, current + direction));
  savePracticeDraftV2();
  render();
}

function jump(index) {
  current = Math.max(0, Math.min(questions.length - 1, index));
  savePracticeDraftV2();
  render();
}

function celebrateMasteryV2(title) {
  if (document.getElementById('masteryCelebration')) return;
  const celebration = document.createElement('div');
  celebration.id = 'masteryCelebration';
  celebration.className = 'mastery-celebration';
  celebration.setAttribute('role', 'status');
  celebration.innerHTML = `<div><span>✦</span><small>${lang === 'zh' ? '新知识已掌握' : 'NEW MASTERY'}</small><strong>${esc(tx(title))}</strong><i>${lang === 'zh' ? '不是做完，而是真的向前了一步' : 'Not just finished—you moved forward'}</i></div>`;
  document.body.appendChild(celebration);
  setTimeout(() => celebration.classList.add('is-visible'), 20);
  setTimeout(() => { celebration.classList.remove('is-visible'); setTimeout(() => celebration.remove(), 280); }, 2200);
}

function handlePracticeShortcutV2(event) {
  if (quizView.hidden || graded || event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return false;
  const type = questions[current]?.type || 'single_choice';
  const key = event.key.toLowerCase();
  const choiceIndex = /^[a-d]$/.test(key) ? key.charCodeAt(0) - 97 : /^[1-4]$/.test(key) ? Number(key) - 1 : -1;
  if (choiceIndex >= 0 && questions[current]?.options?.[choiceIndex] !== undefined) {
    type === 'multi_select' ? toggleMultiV2(choiceIndex) : save(choiceIndex);
  } else if (event.key === 'ArrowLeft') nav(-1);
  else if (event.key === 'ArrowRight' && current < questions.length - 1) nav(1);
  else if (event.key === 'Enter' && current < questions.length - 1) nav(1);
  else if (event.key === 'Enter' && current === questions.length - 1) submitQuiz();
  else return false;
  event.preventDefault();
  return true;
}

function rewardLessonV2(lessonId, ratio, previousScore, previousAttempts = 0) {
  const day = localDateKeyV2();
  const completionKey = `${day}:${lessonId}:completion`;
  const masteryKey = `${lessonId}:mastery`;
  const improvementKey = `${day}:${lessonId}:improvement`;
  const perfectKey = `${day}:${lessonId}:perfect`;
  let earned = 0;
  const reasons = [];
  if (!user.lessonRewards[completionKey]) {
    earned += 2;
    reasons.push(lang === 'zh' ? '完成微课 +2' : 'Lesson completion +2');
    user.lessonRewards[completionKey] = { earned: 2, at: new Date().toISOString() };
  }
  if (ratio >= .8 && previousScore < 80 && !user.lessonRewards[masteryKey]) {
    earned += 4;
    reasons.push(lang === 'zh' ? '首次掌握 +4' : 'First mastery +4');
    user.lessonRewards[masteryKey] = { earned: 4, at: new Date().toISOString() };
  } else if (previousAttempts > 0 && ratio * 100 - previousScore >= 15 && !user.lessonRewards[improvementKey]) {
    earned += 2;
    reasons.push(lang === 'zh' ? '明显进步 +2' : 'Meaningful improvement +2');
    user.lessonRewards[improvementKey] = { earned: 2, at: new Date().toISOString() };
  }
  if (ratio === 1 && !user.lessonRewards[perfectKey]) {
    earned += 1;
    reasons.push(lang === 'zh' ? '全程准确 +1' : 'Perfect focus +1');
    user.lessonRewards[perfectKey] = { earned: 1, at: new Date().toISOString() };
  }
  return { earned, reasons };
}

function submitQuiz() {
  if (graded || !questions.length) return;
  graded = true;
  ensureLearningProfileV2();
  const total = questions.length;
  const correctCount = questions.filter((_, index) => correct(index)).length;
  const ratio = correctCount / total;
  const hintCount = typeof hintUsageForQuizV3 === 'function' ? hintUsageForQuizV3() : 0;
  const lessonId = questions[0].lessonId;
  const previous = user.knowledgeMastery[lessonId] || { attempts: 0, correct: 0, total: 0, score: 0, completed: false };
  const previousScore = Number(previous.score) || 0;
  const sessionScore = Math.round(ratio * 100);
  const nextScore = previous.attempts ? Math.round(previousScore * .58 + sessionScore * .42) : sessionScore;
  user.knowledgeMastery[lessonId] = {
    attempts: Number(previous.attempts || 0) + 1,
    correct: Number(previous.correct || 0) + correctCount,
    total: Number(previous.total || 0) + total,
    score: nextScore,
    completed: previous.completed || ratio >= .8,
    lastAt: new Date().toISOString(),
    title: questions[0].lessonTitle,
    lastHints: hintCount
  };
  const review = typeof updateReviewScheduleV3 === 'function' ? updateReviewScheduleV3(questions[0], ratio, hintCount) : null;
  const reward = rewardLessonV2(lessonId, ratio, previousScore, Number(previous.attempts) || 0);
  const beforePoints = Math.max(0, Math.floor(Number(user.points) || 0));
  user.points = Math.min(adminSettings.pointCap, beforePoints + reward.earned);
  const credited = user.points - beforePoints;
  if (credited > 0) {
    user.lifetimePointsEarned = (Number(user.lifetimePointsEarned) || 0) + credited;
    user.pointHistory.push({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, amount: credited, at: new Date().toISOString(), reason: 'lesson', lessonId });
    user.pointHistory = user.pointHistory.slice(-3000);
  }
  const todayDate = new Date().toLocaleDateString();
  if (user.lastDate !== todayDate) { user.streak++; user.lastDate = todayDate; }
  user.todaySolved += total;
  user.totalSolved += total;
  user.totalCorrect += correctCount;
  user.mastery[subject] += correctCount;
  user.quizCount += 1;
  if (correctCount === total) user.perfectQuizzes += 1;
  const dayKey = localDateKeyV2();
  user.dailyLessons[dayKey] = Number(user.dailyLessons[dayKey] || 0) + 1;
  questions.forEach((question, index) => {
    const existing = user.wrongBook.filter(item => item.questionId === question.id && !item.resolved);
    if (correct(index)) existing.forEach(item => { item.resolved = true; item.resolvedAt = new Date().toISOString(); });
    else if (!existing.length) user.wrongBook.push({ questionId: question.id, subject, level: question.levelId, lessonId, date: new Date().toISOString(), resolved: false });
  });
  user.wrongBook = user.wrongBook.slice(-2000);
  recordQuizUsage({ id: questions[0].levelId, name: questions[0].levelName }, total, correctCount);
  quizStartedAt = 0;
  clearPracticeDraftV2();
  saveUser();
  updateDash();
  const resultTitle = ratio >= .8 ? (lang === 'zh' ? '这节课已经掌握' : 'Lesson mastered') : (lang === 'zh' ? '已完成，接下来安排订正' : 'Completed — correction comes next');
  const rewardText = credited ? reward.reasons.join(' · ') : (lang === 'zh' ? '本课今日奖励已领取，复习仍会提升掌握度' : 'Today’s reward is already claimed; review still improves mastery');
  score.style.display = 'block';
  score.className = 'score lesson-result';
  const reviewText = review ? (lang === 'zh' ? `${review.intervalDays} 天后再次确认` : `Check again in ${review.intervalDays} day(s)`) : '';
  score.innerHTML = `<strong>${esc(resultTitle)} · ${correctCount}/${total}</strong><small>掌握度 ${Math.round(previousScore)}% → ${nextScore}% · ${esc(rewardText)}${reviewText ? ` · ${esc(reviewText)}` : ''} · ${lang === 'zh' ? '积分余额' : 'Balance'} ${user.points}</small>`;
  current = 0;
  render();
  if (!previous.completed && user.knowledgeMastery[lessonId].completed) celebrateMasteryV2(questions[0].lessonTitle);
  if (typeof practiceIntentV3 !== 'undefined') practiceIntentV3 = null;
}

function returnToSetup() {
  questions = [];
  answers = [];
  current = 0;
  graded = false;
  quizStartedAt = 0;
  quizView.hidden = true;
  setup.hidden = false;
  score.style.display = 'none';
  dots.innerHTML = '';
  content.innerHTML = '';
  populateLessons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

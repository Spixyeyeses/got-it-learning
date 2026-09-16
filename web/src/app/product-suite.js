const LEARNER_PROFILE_KEY_V3 = 'gotit_learner_profile_v1';
const CONTENT_REPORTS_KEY_V3 = 'gotit_content_reports_v1';
const DIAGNOSTICS_KEY_V3 = 'gotit_local_diagnostics_v1';
const CONTENT_DB_V3 = 'gotit_course_packages_v1';
let practiceIntentV3 = null;
let learnerProfileV3 = readLearnerProfileV3();

function readJsonLocalV3(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

function writeJsonLocalV3(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readLearnerProfileV3() {
  const saved = readJsonLocalV3(LEARNER_PROFILE_KEY_V3, {});
  return {
    version: 1,
    onboarded: saved.onboarded === true,
    displayName: String(saved.displayName || '').slice(0, 20),
    grade: Math.max(1, Math.min(12, Number(saved.grade) || 3)),
    curriculum: String(saved.curriculum || '通用课程（待正式教材）').slice(0, 60),
    academicSystem: saved.academicSystem === '5-4' ? '5-4' : '6-3',
    textbookSelections: saved.textbookSelections && typeof saved.textbookSelections === 'object' ? saved.textbookSelections : {},
    under14: saved.under14 === true,
    guardianConfirmed: saved.guardianConfirmed === true,
    diagnosticsEnabled: saved.diagnosticsEnabled === true,
    createdAt: saved.createdAt || new Date().toISOString(),
    updatedAt: saved.updatedAt || new Date().toISOString()
  };
}

function saveLearnerProfileV3() {
  learnerProfileV3.updatedAt = new Date().toISOString();
  writeJsonLocalV3(LEARNER_PROFILE_KEY_V3, learnerProfileV3);
}

function openSuiteModalV3({ icon = '◎', kicker = 'LEARNING SYSTEM', title = '', copy = '', body = '' } = {}) {
  suiteIcon.textContent = icon;
  suiteKicker.textContent = kicker;
  suiteTitle.textContent = title;
  suiteCopy.textContent = copy;
  suiteBody.innerHTML = body;
  suiteStatus.textContent = '';
  suiteStatus.className = 'suite-status';
  suiteModal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => suiteModal.querySelector('input,select,button:not(.exchange-close)')?.focus(), 0);
}

function closeSuiteModalV3() {
  suiteModal.hidden = true;
  document.body.style.overflow = '';
  suiteBody.innerHTML = '';
  suiteStatus.textContent = '';
}

function suiteMessageV3(message, ok = false) {
  suiteStatus.textContent = message;
  suiteStatus.className = `suite-status${ok ? ' is-ok' : ''}`;
}

function allLessonsV3(subjectFilter = '') {
  const output = [];
  for (const subjectId of ['math', 'english', 'science']) {
    if (subjectFilter && subjectId !== subjectFilter) continue;
    for (const level of banks[subjectId]?.levels || []) {
      if (Array.isArray(level.lessons) && level.lessons.length) {
        output.push(...level.lessons.map(lesson => ({ ...lesson, subject: subjectId, levelId: String(level.id), levelName: level.name, questions: lesson.questions || [] })));
        continue;
      }
      const grouped = new Map();
      for (const question of level.questions || []) {
        const knowledge = stableTextV2(question.knowledge) || '综合练习';
        const lessonId = lessonIdV2(subjectId, level.id, question.knowledge || knowledge);
        if (!grouped.has(lessonId)) grouped.set(lessonId, { id: lessonId, subject: subjectId, levelId: String(level.id), levelName: level.name, title: question.knowledge || knowledge, questions: [] });
        grouped.get(lessonId).questions.push(question);
      }
      output.push(...grouped.values());
    }
  }
  return output;
}

function openContentDatabaseV3() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('INDEXED_DB_UNAVAILABLE'));
    const request = indexedDB.open(CONTENT_DB_V3, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('packages')) request.result.createObjectStore('packages', { keyPath: 'subject' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('CONTENT_DB_FAILED'));
  });
}

async function loadInstalledCoursePackagesV3() {
  try {
    const database = await openContentDatabaseV3();
    const packages = await new Promise((resolve, reject) => {
      const request = database.transaction('packages', 'readonly').objectStore('packages').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return packages.map(entry => entry.package).filter(Boolean);
  } catch { return []; }
}

function validateProductionPackageV3(coursePackage) {
  const errors = [];
  if (coursePackage?.schemaVersion !== 2) errors.push('schemaVersion 必须为 2');
  if (!['math', 'english', 'science'].includes(coursePackage?.subject)) errors.push('subject 必须为 math、english 或 science');
  if (!coursePackage?.provider?.id || !coursePackage?.provider?.name || !coursePackage?.provider?.license) errors.push('必须填写 provider.id、provider.name 和 provider.license');
  if (!Array.isArray(coursePackage?.levels) || !coursePackage.levels.length) errors.push('levels 不能为空');
  const ids = new Set();
  for (const level of coursePackage?.levels || []) {
    if (!level?.id || !level?.name || !Array.isArray(level.questions) || !level.questions.length) errors.push(`课程阶段 ${level?.id || '?'} 结构不完整`);
    for (const question of level?.questions || []) {
      if (!question?.id || ids.has(question.id)) errors.push(`题目编号缺失或重复：${question?.id || '?'}`);
      ids.add(question?.id);
      if (!question?.knowledge) errors.push(`题目 ${question?.id || '?'} 缺少知识点`);
      if (!question?.explanation) errors.push(`题目 ${question?.id || '?'} 缺少解析`);
      if (!question?.source?.providerItemId) errors.push(`题目 ${question?.id || '?'} 缺少来源编号`);
      if (!Number.isInteger(question?.difficulty) || question.difficulty < 1 || question.difficulty > 5) errors.push(`题目 ${question?.id || '?'} 难度必须为 1–5`);
    }
  }
  try { if (!errors.length) validateContentBankV2(coursePackage, { subject: coursePackage.subject, url: 'local-course-package' }); } catch (error) { errors.push(error.message); }
  return [...new Set(errors)].slice(0, 80);
}

async function installCoursePackageV3(fileInput) {
  const file = fileInput?.files?.[0];
  if (!file) return suiteMessageV3('请选择一个 JSON 课程包。');
  if (file.size > 25 * 1024 * 1024) return suiteMessageV3('单个课程包不能超过 25MB。');
  let coursePackage;
  try { coursePackage = JSON.parse(await file.text()); } catch { return suiteMessageV3('文件不是有效的 JSON。'); }
  const errors = validateProductionPackageV3(coursePackage);
  if (errors.length) {
    suiteStatus.innerHTML = `<strong>导入被阻止，共发现 ${errors.length} 类问题：</strong><br>${errors.slice(0, 8).map(esc).join('<br>')}`;
    return;
  }
  try {
    const database = await openContentDatabaseV3();
    await new Promise((resolve, reject) => {
      const request = database.transaction('packages', 'readwrite').objectStore('packages').put({ subject: coursePackage.subject, installedAt: new Date().toISOString(), package: coursePackage });
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
    database.close();
    suiteMessageV3(`${coursePackage.provider.name} · ${coursePackage.subject} 已安装。授权声明仍需人工和法律核验。`, true);
    setTimeout(() => location.reload(), 900);
  } catch (error) { suiteMessageV3(`无法保存课程包：${error.message}`); }
}

async function clearInstalledCoursePackagesV3() {
  try {
    const database = await openContentDatabaseV3();
    await new Promise((resolve, reject) => { const request = database.transaction('packages', 'readwrite').objectStore('packages').clear(); request.onsuccess = resolve; request.onerror = () => reject(request.error); });
    database.close();
    location.reload();
  } catch (error) { suiteMessageV3(`无法恢复迁移课程库：${error.message}`); }
}

function findLessonV3(lessonId) {
  return allLessonsV3().find(lesson => lesson.id === lessonId) || null;
}

function dueReviewsV3(now = new Date()) {
  ensureLearningProfileV2();
  const time = now.getTime();
  return Object.values(user.reviewSchedule || {})
    .filter(item => Number.isFinite(Date.parse(item.dueAt)) && Date.parse(item.dueAt) <= time && banks[item.subject])
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

function updateReviewScheduleV3(question, ratio, hintCount = 0) {
  ensureLearningProfileV2();
  const lessonId = question.lessonId;
  const previous = user.reviewSchedule[lessonId] || { successfulReviews: 0, intervalDays: 1 };
  const independentScore = Math.max(0, ratio - Math.min(.24, hintCount * .04));
  let successfulReviews = Number(previous.successfulReviews) || 0;
  let intervalDays = 1;
  if (independentScore >= .8) {
    successfulReviews += 1;
    const ladder = [1, 3, 7, 14, 30, 60, 120];
    intervalDays = ladder[Math.min(ladder.length - 1, successfulReviews - 1)];
  } else if (independentScore >= .6) {
    intervalDays = 1;
  } else {
    successfulReviews = 0;
    intervalDays = 1;
  }
  const due = new Date();
  due.setHours(8, 0, 0, 0);
  due.setDate(due.getDate() + intervalDays);
  user.reviewSchedule[lessonId] = {
    subject,
    levelId: String(question.levelId),
    lessonId,
    title: question.lessonTitle,
    intervalDays,
    successfulReviews,
    lastScore: Math.round(ratio * 100),
    dueAt: due.toISOString(),
    lastAt: new Date().toISOString()
  };
  return user.reviewSchedule[lessonId];
}

function reviewLabelV3(lessonId) {
  const item = user.reviewSchedule?.[lessonId];
  if (!item?.dueAt) return '';
  const due = new Date(item.dueAt);
  if (due.getTime() <= Date.now()) return lang === 'zh' ? '今天复习' : 'Review today';
  const days = Math.max(1, Math.ceil((due.getTime() - Date.now()) / 86400000));
  return lang === 'zh' ? `${days} 天后复习` : `Review in ${days}d`;
}

function nextRecommendedLessonV3() {
  const preferredGrade = String(learnerProfileV3.grade || 3);
  const lastSubject = user.lastCourse?.subject || 'math';
  const orderedSubjects = [lastSubject, ...['math', 'english', 'science'].filter(item => item !== lastSubject)];
  for (const subjectId of orderedSubjects) {
    const lessons = allLessonsV3(subjectId).filter(lesson => subjectId === 'english' || lesson.levelId === preferredGrade);
    const next = lessons.find(lesson => !user.knowledgeMastery?.[lesson.id]?.completed);
    if (next) return next;
  }
  return allLessonsV3()[0] || null;
}

function currentSmartActionV3() {
  const draft = readPracticeDraftV2();
  if (draft) return { kind: 'draft', label: lang === 'zh' ? '继续未完成练习' : 'Resume unfinished practice', detail: `${draft.current + 1}/${draft.questions.length}` };
  const wrong = user.wrongBook?.find(item => !item.resolved && banks[item.subject]);
  if (wrong) return { kind: 'correction', label: lang === 'zh' ? '先订正一道错题' : 'Correct one mistake', detail: lang === 'zh' ? '把漏洞及时补上' : 'Close the gap while it is fresh' };
  const due = dueReviewsV3()[0];
  if (due) return { kind: 'review', record: due, label: lang === 'zh' ? `复习：${tx(due.title)}` : `Review: ${tx(due.title)}`, detail: lang === 'zh' ? '系统判断今天需要再确认' : 'Due for a quick memory check' };
  const next = nextRecommendedLessonV3();
  return { kind: 'new', record: next, label: next ? (lang === 'zh' ? `新课：${tx(next.title)}` : `New: ${tx(next.title)}`) : (lang === 'zh' ? '开始今日学习' : 'Start today'), detail: lang === 'zh' ? '约 6 分钟完成一个知识点' : 'About 6 minutes for one concept' };
}

function renderSmartPlanV3() {
  if (typeof smartPlanMetrics === 'undefined') return;
  const dueCount = dueReviewsV3().length;
  const wrongCount = user.wrongBook?.filter(item => !item.resolved).length || 0;
  const todayDone = Number(user.dailyLessons?.[localDateKeyV2()]) || 0;
  const goal = Number(adminSettings.dailyLessonGoal) || DEFAULT_DAILY_LESSON_GOAL;
  const goalMet = todayDone >= goal;
  const action = currentSmartActionV3();
  smartPlanMetrics.innerHTML = `<span><small>${lang === 'zh' ? '到期复习' : 'Due reviews'}</small><strong>${dueCount}</strong></span><span><small>${lang === 'zh' ? '待订正' : 'Corrections'}</small><strong>${wrongCount}</strong></span><span><small>${lang === 'zh' ? '今日微课' : 'Lessons today'}</small><strong>${Math.min(todayDone, goal)}/${goal}</strong></span>`;
  smartPlanActionKicker.textContent = goalMet ? (lang === 'zh' ? '今日核心目标已完成' : 'CORE GOAL COMPLETE') : (lang === 'zh' ? '最值得先做' : 'BEST NEXT STEP');
  smartPlanActionLabel.textContent = action.label;
  smartPlanAction.title = action.detail;
  if (typeof mobileContinueLabelV4 !== 'undefined') {
    mobileContinueKickerV4.textContent = goalMet ? (lang === 'zh' ? '今日目标已完成' : 'GOAL COMPLETE') : (lang === 'zh' ? '今天下一步' : 'NEXT STEP');
    mobileContinueLabelV4.textContent = action.label;
    mobileContinueDockV4.title = action.detail;
  }
  smartPlanCopy.textContent = goalMet
    ? (lang === 'zh' ? '今天的核心任务已经完成。若继续，优先做短复习，不必为了积分增加题量。' : 'Today’s core goal is complete. If continuing, prefer a short review rather than extra volume for points.')
    : action.kind === 'draft' ? (lang === 'zh' ? '先把已经开始的内容收尾，避免留下半途任务。' : 'Finish what is already in progress before starting more.')
      : action.kind === 'correction' ? (lang === 'zh' ? '先补上最近的知识漏洞，再推进新的课程内容。' : 'Close the latest knowledge gap before moving forward.')
        : action.kind === 'review' ? (lang === 'zh' ? '这项内容到了记忆复查时间，用一次短复习确认是否真正记住。' : 'This concept is due for a brief memory check.')
          : (lang === 'zh' ? '只推进一个知识点，完成后就可以停下。' : 'Move one concept forward, then it is fine to stop.');
  renderDataDashboardV4();
}

function compactMinutesV4(milliseconds) {
  const minutes = Math.max(0, Math.round((Number(milliseconds) || 0) / 60000));
  if (minutes < 60) return lang === 'zh' ? `${minutes} 分` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return lang === 'zh' ? `${hours} 时${rest ? ` ${rest} 分` : ''}` : `${hours}h${rest ? ` ${rest}m` : ''}`;
}

function renderDataDashboardV4() {
  if (typeof weeklyActivityChartV4 === 'undefined') return;
  const zhMode = lang === 'zh';
  const usage = readUsage();
  const now = new Date();
  const weekdays = zhMode ? ['日', '一', '二', '三', '四', '五', '六'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const item = usage.days[localDay(date)] || {};
    const study = Math.max(0, Number(item.studyMs) || 0);
    const play = Math.max(0, Number(item.playMs) || 0);
    return { date, study, play, total: study + play };
  });
  const maximum = Math.max(15 * 60000, ...days.map(day => day.total));
  weeklyActivityChartV4.innerHTML = days.map(day => {
    const studyHeight = day.study ? Math.max(3, day.study / maximum * 100) : 0;
    const playHeight = day.play ? Math.max(3, day.play / maximum * 100) : 0;
    const label = `${day.date.getMonth() + 1}/${day.date.getDate()} · ${zhMode ? '学习' : 'Study'} ${compactMinutesV4(day.study)} · ${zhMode ? '受控休息' : 'Controlled break'} ${compactMinutesV4(day.play)}`;
    return `<div class="weekly-column-v4" title="${esc(label)}"><div class="weekly-value-v4">${day.total ? compactMinutesV4(day.total) : '—'}</div><div class="weekly-track-v4" role="img" aria-label="${esc(label)}"><i class="study" style="height:${studyHeight}%"></i><i class="play" style="height:${playHeight}%"></i></div><small>${weekdays[day.date.getDay()]}</small></div>`;
  }).join('');

  const subjectNames = zhMode ? { math: '数学', english: '英语', science: '科学' } : { math: 'Math', english: 'English', science: 'Science' };
  const subjectColors = { math: '#8fd5b7', english: '#eac46d', science: '#8eb7e8' };
  subjectMasteryChartV4.innerHTML = ['math', 'english', 'science'].map(subjectId => {
    const value = averageMasteryV2(subjectId);
    return `<button type="button" onclick="selectSubject('${subjectId}')"><span><strong>${subjectNames[subjectId]}</strong><b>${value}%</b></span><i aria-hidden="true"><em style="width:${value}%;background:${subjectColors[subjectId]}"></em></i></button>`;
  }).join('');

  const todayUsage = usage.days[localDay(now)] || {};
  const studyMs = Math.max(0, Number(todayUsage.studyMs) || 0);
  const playMs = Math.max(0, Number(todayUsage.playMs) || 0);
  const totalMs = studyMs + playMs;
  const studyShare = totalMs ? Math.round(studyMs / totalMs * 100) : 0;
  timeBalanceV4.innerHTML = `<div class="time-ring-v4" style="--study:${studyShare}%" role="img" aria-label="${zhMode ? `今天学习占 ${studyShare}%` : `${studyShare}% learning today`}"><strong>${compactMinutesV4(totalMs)}</strong><small>${zhMode ? '总使用' : 'total'}</small></div><div class="time-rows-v4"><span><i class="study"></i><b>${zhMode ? '学习' : 'Study'}</b><strong>${compactMinutesV4(studyMs)}</strong></span><span><i class="play"></i><b>${zhMode ? '受控休息' : 'Break'}</b><strong>${compactMinutesV4(playMs)}</strong></span></div>`;

  const recent = [...usage.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 5);
  recentLearningV4.innerHTML = recent.length ? recent.map(event => {
    const date = event.day === localDay(now) ? (zhMode ? '今天' : 'Today') : event.day.slice(5).replace('-', '/');
    const total = Math.max(0, Number(event.total) || 0);
    const correctCount = Math.max(0, Number(event.correct) || 0);
    const rate = total ? Math.round(correctCount / total * 100) : 0;
    return `<div><time>${esc(date)}</time><span><strong>${esc(subjectNames[event.subject] || event.subject)} · ${esc(tx(event.levelName) || event.levelId)}</strong><small>${total} ${zhMode ? '题' : 'questions'} · ${compactMinutesV4(event.durationMs)}</small></span><b class="${rate >= 80 ? 'is-good' : ''}">${rate}%</b></div>`;
  }).join('') : `<p class="data-empty-v4">${zhMode ? '完成第一节微课后，这里会显示课程、用时和结果。' : 'Course, time, and results appear after the first lesson.'}</p>`;

  dashboardDateV4.textContent = zhMode ? `${now.getMonth() + 1} 月 ${now.getDate()} 日 · 今日学习数据` : `${now.toLocaleDateString('en', { month: 'short', day: 'numeric' })} · TODAY`;
  dataOverviewTitle.textContent = learnerProfileV3.displayName ? (zhMode ? `${learnerProfileV3.displayName}的学习概览` : `${learnerProfileV3.displayName}'s overview`) : (zhMode ? '学习概览' : 'Learning overview');
  const auth = typeof WumingRemote !== 'undefined' ? WumingRemote.loadAuth() : null;
  dataFreshnessV4.textContent = auth ? (zhMode ? `已登录 ${auth.username} · 可同步` : `${auth.username} · sync available`) : (zhMode ? '数据保存在本机' : 'Data stored on this device');
}

function openLessonFromRecordV3(record, intent = 'review') {
  if (!record || !banks[record.subject]) return continueLearning();
  practiceIntentV3 = { type: intent, lessonId: record.lessonId || record.id, questionId: record.questionId || '' };
  closeSuiteModalV3();
  selectSubject(record.subject, record.levelId || record.level, record.lessonId || record.id);
}

function openNextSmartActionV3() {
  const action = currentSmartActionV3();
  if (action.kind === 'draft') return continueLearning();
  if (action.kind === 'correction') return startCorrectionsV2();
  if (action.record) return openLessonFromRecordV3(action.record, action.kind === 'review' ? 'review' : 'lesson');
  continueLearning();
}

function startDueReviewV3(index = 0) {
  const item = dueReviewsV3()[index];
  if (item) openLessonFromRecordV3(item, 'review');
}

function openOnboardingV3(force = false) {
  if (learnerProfileV3.onboarded && !force) return;
  const gradeOptions = Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}" ${learnerProfileV3.grade === index + 1 ? 'selected' : ''}>${index + 1} 年级</option>`).join('');
  openSuiteModalV3({
    icon: '起', kicker: force ? 'LEARNING PROFILE' : 'QUICK START', title: force ? '修改学习起点' : '两步开始第一节课',
    copy: '只需要学习阶段和每日目标；不收集生日、学校或真实姓名。',
    body: `<form id="onboardingFormV3" class="suite-form onboarding-form-v4"><div class="onboarding-core-v4"><label><span>当前学习阶段</span><select name="grade">${gradeOptions}</select></label><label><span>每天准备完成</span><select name="dailyGoal">${[1,2,3,4,5].map(value => `<option value="${value}" ${Number(adminSettings.dailyLessonGoal) === value ? 'selected' : ''}>${value} 节微课</option>`).join('')}</select></label><label><span>年龄保护</span><select name="under14"><option value="false" ${!learnerProfileV3.under14 ? 'selected' : ''}>已满 14 周岁</option><option value="true" ${learnerProfileV3.under14 ? 'selected' : ''}>未满 14 周岁</option></select></label></div><label id="onboardingGuardianV4" class="suite-check onboarding-guardian-v4" ${learnerProfileV3.under14 ? '' : 'hidden'}><input name="guardianConfirmed" type="checkbox" ${learnerProfileV3.guardianConfirmed ? 'checked' : ''}><span><strong>监护人已了解本机将保存学习记录</strong><small>仅在未满 14 周岁时需要确认；联网、AI和云同步仍需单独授权。</small></span></label><details class="onboarding-optional-v4"><summary>个性与教材设置（可选）</summary><div><label><span>怎么称呼你</span><input name="displayName" maxlength="20" autocomplete="off" value="${esc(learnerProfileV3.displayName)}" placeholder="可以留空"></label><section><span>课程版本</span><strong>通用课程（待正式教材）</strong><small>授权教材接入后，可在设置中选择出版社和上下册。</small><input name="curriculum" type="hidden" value="通用课程（待正式教材）"></section></div></details><div class="suite-actions"><button type="submit" class="primary-cta">${force ? '保存修改' : '保存并开始第一节'}</button></div></form>`
  });
  const ageSelect = onboardingFormV3.elements.under14;
  const guardianRow = document.getElementById('onboardingGuardianV4');
  const syncGuardianVisibility = () => { guardianRow.hidden = ageSelect.value !== 'true'; };
  ageSelect.addEventListener('change', syncGuardianVisibility);
  syncGuardianVisibility();
  onboardingFormV3.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const under14 = data.get('under14') === 'true';
    const guardianConfirmed = data.get('guardianConfirmed') === 'on';
    if (under14 && !guardianConfirmed) return suiteMessageV3('未满 14 周岁需要监护人确认后才能继续。');
    learnerProfileV3 = { ...learnerProfileV3, onboarded: true, displayName: String(data.get('displayName') || '').trim().slice(0, 20), grade: Number(data.get('grade')) || 3, curriculum: String(data.get('curriculum') || ''), under14, guardianConfirmed };
    adminSettings.dailyLessonGoal = Math.max(1, Math.min(5, Number(data.get('dailyGoal')) || 2));
    saveLearnerProfileV3();
    saveAdminSettings();
    if (!user.lastCourse) user.lastCourse = { subject: 'math', levelId: String(learnerProfileV3.grade), lessonId: '' };
    saveUser();
    closeSuiteModalV3();
    updateDash();
    if (!force) setTimeout(() => {
      const firstLesson = nextRecommendedLessonV3();
      if (!firstLesson) return openNextSmartActionV3();
      openLessonFromRecordV3(firstLesson, 'lesson');
      setTimeout(() => beginLessonFlowV3(), 80);
    }, 120);
  });
}

function remoteLearningAllowedV3() {
  return !learnerProfileV3.under14 || learnerProfileV3.guardianConfirmed;
}

function openCurriculumSettingsV3() {
  const catalog = typeof CurriculumV3 !== 'undefined' ? CurriculumV3.catalog() : null;
  if (!catalog) return;
  const seriesBySubject = new Map();
  for (const series of catalog.textbookSeries || []) {
    for (const subjectId of series.subjectIds || []) {
      if (!seriesBySubject.has(subjectId)) seriesBySubject.set(subjectId, []);
      seriesBySubject.get(subjectId).push(series);
    }
  }
  const rows = catalog.subjects.map(subject => {
    const series = seriesBySubject.get(subject.id) || [];
    const selected = learnerProfileV3.textbookSelections?.[subject.id] || '';
    return `<label><span>${esc(subject.title.zh)}</span><select name="edition:${subject.id}"><option value="">${series.length ? '尚未选择 / 由学校确定' : '教材目录待继续导入'}</option>${series.map(item => `<option value="${esc(item.id)}" ${selected === item.id ? 'selected' : ''}>${esc(item.title)} · ${esc(item.publisher)}</option>`).join('')}</select><small>${series.length ? '当前只有教材元数据；没有出版社授权时不会装入教材正文或原题。' : '课程标准已经登记，教材版本数据仍在建设。'}</small></label>`;
  }).join('');
  openSuiteModalV3({ icon: '册', kicker: 'TEXTBOOK EDITIONS · V3', title: '教材与学制设置', copy: '同一课程标准可以对应多套审定教材。选择只保存在本机，后续用于装载正确册次。', body: `<form id="curriculumSettingsFormV3" class="suite-form"><label><span>义务教育学制</span><select name="academicSystem"><option value="6-3" ${learnerProfileV3.academicSystem === '6-3' ? 'selected' : ''}>六三学制</option><option value="5-4" ${learnerProfileV3.academicSystem === '5-4' ? 'selected' : ''}>五四学制</option></select><small>教材目录和年级结构会随学制变化。</small></label><div class="curriculum-settings-list-v3">${rows}</div><div class="suite-actions"><button class="primary-cta" type="submit">保存教材设置</button></div></form>` });
  curriculumSettingsFormV3.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selections = {};
    for (const subject of catalog.subjects) {
      const value = String(data.get(`edition:${subject.id}`) || '');
      if (value) selections[subject.id] = value;
    }
    learnerProfileV3.academicSystem = data.get('academicSystem') === '5-4' ? '5-4' : '6-3';
    learnerProfileV3.textbookSelections = selections;
    learnerProfileV3.curriculum = Object.keys(selections).length ? `中国大陆国家课程 · 已选择 ${Object.keys(selections).length} 门教材版本` : '中国大陆国家课程 · 教材版本待选择';
    saveLearnerProfileV3();
    suiteMessageV3('教材设置已保存。只有通过授权与内容校验的册次才会被装载。', true);
  });
}

function openLearningPathV3(subjectId = user.lastCourse?.subject || 'math') {
  const subjects = ['math', 'english', 'science'];
  const subjectNames = { math: '数学', english: '英语', science: '科学' };
  const grade = String(learnerProfileV3.grade || 3);
  const lessons = allLessonsV3(subjectId).filter(lesson => subjectId === 'english' ? Number(lesson.levelId) === Math.min(25, Number(grade) + 3) : lesson.levelId === grade).slice(0, 30);
  const rows = lessons.map((lesson, index) => {
    const record = user.knowledgeMastery?.[lesson.id];
    const review = reviewLabelV3(lesson.id);
    const previous = index ? user.knowledgeMastery?.[lessons[index - 1].id] : null;
    const state = record?.completed ? 'is-complete' : previous && !previous.completed ? 'needs-foundation' : '';
    return `<button class="path-node ${state}" type="button" onclick="openLessonFromRecordV3(${JSON.stringify({ subject: lesson.subject, levelId: lesson.levelId, lessonId: lesson.id }).replace(/"/g, '&quot;')},'lesson')"><i>${record?.completed ? '✓' : index + 1}</i><span><strong>${esc(tx(lesson.title))}</strong><small>${record ? `掌握度 ${Math.round(Number(record.score) || 0)}%` : '尚未开始'}${review ? ` · ${esc(review)}` : ''}</small></span><b>→</b></button>`;
  }).join('');
  openSuiteModalV3({ icon: '路', kicker: 'KNOWLEDGE PATH', title: `${subjectNames[subjectId]} · ${subjectId === 'english' ? '推荐阅读阶段' : `${grade} 年级`}`, copy: '课程顺序用于给出前置提醒，不会强行锁住孩子的选择。', body: `<div class="suite-tabs">${subjects.map(item => `<button class="${item === subjectId ? 'active' : ''}" type="button" onclick="openLearningPathV3('${item}')">${subjectNames[item]}</button>`).join('')}</div><div class="path-list">${rows || '<p class="suite-empty">这个阶段暂时没有可用课程。</p>'}</div>` });
}

function localTutorHintV3(question, level) {
  const knowledge = tx(question.knowledge || question.lessonTitle) || '这个知识点';
  const type = question.type || 'single_choice';
  if (level === 1) return `先别急着算。用自己的话说一遍题目在问什么，再圈出与“${knowledge}”有关的条件。`;
  const strategies = {
    number: '把已知量和要求的量分开写，再检查单位与运算顺序。',
    text: '回忆这个概念最核心的关键词，再用题目要求的形式表达。',
    fill_blank: '先把空格前后的句子完整读一遍，判断这里需要什么词性或数量。',
    short_answer: '先写结论，再补一条能支持结论的理由。',
    reading: '回到原文定位和问题使用相同或相近词语的句子。',
    multi_select: '不要把选项一起猜；逐项判断每个选项是否独立成立。',
    ordering: '先找必定最先和最后发生的两项，再处理中间顺序。',
    matching: '先完成最确定的一组配对，再用排除法处理剩余项目。',
    boolean: '寻找题目中的绝对词，并尝试举一个反例。'
  };
  if (level === 2) return strategies[type] || '逐个比较选项和题目条件，先排除明显不符合的一项。';
  return `最后一步提示：按“条件 → 使用的规则 → 得出的结论”写成三行。仍然不确定也可以先作答，提交后系统会安排订正。`;
}

function renderTutorToolsV3(question) {
  if (graded) return '';
  const count = Math.max(0, Number(question._hintCountV3) || 0);
  const label = window.LEARNING_AI_CONFIG?.endpoint ? 'AI 分层提示' : '本机分层提示';
  return `<aside class="tutor-v3"><div><span>助</span><p><strong>${label}</strong><small>只围绕当前题目，不进行开放聊天，也不会索取个人信息。</small></p></div><button type="button" onclick="requestTutorHintV3()" ${count >= 3 ? 'disabled' : ''}>${count ? `再给一点提示 · ${count}/3` : '给我一点提示'}</button><p id="tutorHintV3" class="tutor-hint" ${count ? '' : 'hidden'}>${count ? esc(question._lastHintV3 || '') : ''}</p></aside>`;
}

async function requestTutorHintV3() {
  if (graded || !questions[current]) return;
  const question = questions[current];
  const level = Math.min(3, (Number(question._hintCountV3) || 0) + 1);
  let hint = '';
  const config = window.LEARNING_AI_CONFIG || {};
  if (config.endpoint && remoteLearningAllowedV3()) {
    try {
      const response = await fetch(config.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose: 'age-appropriate-layered-hint', level, subject, grade: learnerProfileV3.grade, question: tx(question.question), passage: tx(question.passage), options: (question.options || []).map(tx), knowledge: tx(question.knowledge), answer: answerTextV2(question), noOpenChat: true }) });
      if (response.ok) hint = String((await response.json()).hint || '').slice(0, 600);
    } catch {}
  }
  if (!hint) hint = localTutorHintV3(question, level);
  question._hintCountV3 = level;
  question._lastHintV3 = hint;
  savePracticeDraftV2();
  render();
}

function hintUsageForQuizV3() {
  return questions.reduce((sum, question) => sum + (Number(question._hintCountV3) || 0), 0);
}

function readContentReportsV3() {
  const reports = readJsonLocalV3(CONTENT_REPORTS_KEY_V3, []);
  return Array.isArray(reports) ? reports : [];
}

function reportQuestionV3(index = current) {
  const question = questions[index];
  if (!question) return;
  openSuiteModalV3({ icon: '报', kicker: 'CONTENT FEEDBACK', title: '报告这道题的问题', copy: `题目编号：${question.id}`, body: `<form id="contentReportFormV3" class="suite-form"><label><span>问题类型</span><select name="reason"><option>答案可能有误</option><option>题目有歧义</option><option>解析不清楚</option><option>内容可能超纲</option><option>存在不适龄内容</option><option>其他</option></select></label><label><span>补充说明（不要填写孩子个人信息）</span><textarea name="note" maxlength="500" rows="4" placeholder="说明哪里需要核查"></textarea></label><div class="suite-actions"><button class="primary-cta" type="submit">保存纠错记录</button></div></form>` });
  contentReportFormV3.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const reports = readContentReportsV3();
    reports.push({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, questionId: question.id, subject, levelId: String(question.levelId), lessonId: question.lessonId, reason: String(data.get('reason') || ''), note: String(data.get('note') || '').trim().slice(0, 500), provider: loadedContentProviderV2?.id || 'unknown', createdAt: new Date().toISOString(), status: 'open' });
    writeJsonLocalV3(CONTENT_REPORTS_KEY_V3, reports.slice(-500));
    suiteMessageV3('已保存在本机纠错队列，可从内容质量页导出。', true);
    setTimeout(closeSuiteModalV3, 700);
  });
}

function contentHealthV3() {
  const lessons = allLessonsV3();
  const questionsList = lessons.flatMap(lesson => lesson.questions);
  const ids = new Set();
  let duplicates = 0;
  for (const question of questionsList) { if (ids.has(question.id)) duplicates += 1; ids.add(question.id); }
  const explained = questionsList.filter(question => question.explanation || question.rationale).length;
  const typed = new Map();
  questionsList.forEach(question => typed.set(question.type || 'single_choice', (typed.get(question.type || 'single_choice') || 0) + 1));
  return { lessons: lessons.length, questions: questionsList.length, explained, duplicates, types: [...typed.entries()].sort((a, b) => b[1] - a[1]), reports: readContentReportsV3() };
}

function openContentHealthV3() {
  const health = contentHealthV3();
  const compatibility = loadedContentProviderV2?.kind === 'compatibility';
  const standardPilot = loadedContentProviderV2?.kind === 'standard-aligned-pilot';
  openSuiteModalV3({ icon: '检', kicker: 'CONTENT OPERATIONS', title: '内容质量与纠错队列', copy: compatibility ? '当前仍为迁移课程库；这里的“通过”只代表结构有效，不代表正式授权。' : standardPilot ? '国家课程目录V3已启用；试验题为课标对齐原创内容，不代表教材授权。' : '当前存在本机导入内容；授权声明仍需人工和法律核验。', body: `<div class="health-grid"><article><small>题目</small><strong>${health.questions}</strong></article><article><small>知识点微课</small><strong>${health.lessons}</strong></article><article class="${health.explained === health.questions ? 'is-good' : 'is-warning'}"><small>含正式解析</small><strong>${health.explained}/${health.questions}</strong></article><article class="${health.duplicates ? 'is-warning' : 'is-good'}"><small>重复编号</small><strong>${health.duplicates}</strong></article></div><div class="health-types">${health.types.map(([type, count]) => `<span>${esc(type)} <b>${count}</b></span>`).join('')}</div><section class="content-import-v3"><div><strong>安装正式课程包</strong><p>本机导入暂时兼容版本2；正式批量内容使用课程目录V3、分片校验和教材授权记录。导入不等于平台替你确认授权。</p></div><input id="coursePackageFileV3" type="file" accept="application/json,.json"><button type="button" onclick="installCoursePackageV3(coursePackageFileV3)">校验并安装</button><button type="button" class="danger-quiet" onclick="clearInstalledCoursePackagesV3()">恢复内置课程目录</button></section><section class="report-queue"><div><strong>本机纠错记录</strong><span>${health.reports.filter(report => report.status === 'open').length} 条待处理</span></div>${health.reports.slice(-10).reverse().map(report => `<article><span><b>${esc(report.reason)}</b><small>${esc(report.questionId)} · ${new Date(report.createdAt).toLocaleDateString()}</small></span><p>${esc(report.note || '未填写补充说明')}</p></article>`).join('') || '<p class="suite-empty">还没有纠错记录。</p>'}</section><div class="suite-actions"><button type="button" class="quiet-cta" onclick="exportProductDataV3('content')">导出内容纠错记录</button></div>` });
}

function weeklySummaryV3() {
  const log = readUsage();
  const days = [];
  const today = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) { const date = new Date(today); date.setDate(today.getDate() - offset); days.push(localDay(date)); }
  const totals = days.reduce((sum, day) => { const item = log.days[day] || {}; sum.study += Number(item.studyMs) || 0; sum.play += Number(item.playMs) || 0; if ((Number(item.studyMs) || 0) > 0) sum.active += 1; return sum; }, { study: 0, play: 0, active: 0 });
  const events = log.events.filter(event => days.includes(event.day));
  const solved = events.reduce((sum, event) => sum + (Number(event.total) || 0), 0);
  const correctCount = events.reduce((sum, event) => sum + (Number(event.correct) || 0), 0);
  const weak = Object.entries(user.knowledgeMastery || {}).filter(([, record]) => Number(record.score) < 80).sort((a, b) => Number(a[1].score) - Number(b[1].score)).slice(0, 5);
  return { days, totals, events, solved, correctCount, weak };
}

function openWeeklyReportV3() {
  const report = weeklySummaryV3();
  const accuracy = report.solved ? Math.round(report.correctCount / report.solved * 100) : 0;
  const sufficient = report.events.length >= 2 && report.solved >= 10;
  const subjects = [...new Set(report.events.map(event => event.subject).filter(Boolean))];
  const mastered = Object.values(user.knowledgeMastery || {}).filter(record => Number(record.score) >= 80).length;
  const unresolved = (user.wrongBook || []).filter(item => !item.resolved).length;
  const provider = loadedContentProviderV2 || window.NAMELESS_CONTENT_CONFIG?.provider || {};
  const sourceState = provider.kind === 'compatibility' ? '迁移内容，等待正式授权题源' : provider.kind === 'local-declared' ? '本机课程包，许可证声明待人工核验' : provider.kind === 'standard-aligned-pilot' ? '国家课程标准V3与原创试验题已启用；正式教材内容待出版社授权' : `${provider.name || '课程内容'}，来源与格式已校验`;
  const subjectNames = { math: '数学', english: '英语', science: '科学' };
  const evidenceTitle = sufficient ? (report.totals.active >= 4 ? '本周已形成可观察的学习节奏' : '本周已有可分析记录，但节奏仍可更稳定') : '数据不足，暂不判断掌握趋势';
  const evidenceCopy = sufficient
    ? (report.weak.length ? `较需要继续确认：${report.weak.map(([, item]) => tx(item.title)).filter(Boolean).slice(0, 3).join('、')}。这是练习证据，不等同于考试结论。` : '当前记录中未发现低于 80% 的已学知识点；继续按间隔复习确认长期保持。')
    : `本周只有 ${report.events.length} 次完整练习、${report.solved} 道有效作答。至少积累 2 次练习和 10 道作答后，再给出趋势判断。`;
  openSuiteModalV3({ icon: '周', kicker: '7 DAY EVIDENCE REVIEW', title: '本周家庭学习报告', copy: '只呈现可核验记录；数据不足时不夸大、不下结论。', body: `<div class="weekly-evidence-state ${sufficient ? 'is-ready' : 'is-limited'}"><span>${sufficient ? '证据可读' : '证据不足'}</span><div><strong>${evidenceTitle}</strong><p>${evidenceCopy}</p></div></div><div class="health-grid weekly-grid"><article><small>学习天数</small><strong>${report.totals.active}/7</strong></article><article><small>完整练习</small><strong>${report.events.length}</strong></article><article><small>有效作答</small><strong>${report.solved}</strong></article><article><small>本周正确率</small><strong>${report.solved ? `${accuracy}%` : '—'}</strong></article><article><small>专注学习</small><strong>${formatUsageTime(report.totals.study)}</strong></article><article><small>受控休息</small><strong>${formatUsageTime(report.totals.play)}</strong></article><article><small>覆盖学科</small><strong>${subjects.length}/3</strong></article><article><small>已掌握知识点</small><strong>${mastered}</strong></article></div><section class="weekly-proof-list"><div><small>本周覆盖</small><strong>${subjects.length ? subjects.map(id => subjectNames[id] || id).join('、') : '尚无完整课程记录'}</strong></div><div><small>待处理</small><strong>${unresolved ? `${unresolved} 道错题仍在订正队列` : '没有遗留错题'}</strong></div><div><small>内容来源</small><strong>${esc(sourceState)}</strong></div><div><small>AI 帮助记录</small><strong>当前没有可核验的远程 AI 使用记录</strong></div></section><div class="suite-actions"><button type="button" class="quiet-cta" onclick="exportProductDataV3('all')">导出完整学习档案</button><button type="button" class="primary-cta" onclick="closeSuiteModalV3();openLearningPathV3()">查看知识路径</button></div>` });
}

function productExportPayloadV3(scope = 'all') {
  if (scope === 'content') return { product: '学会啦', exportedAt: new Date().toISOString(), contentReports: readContentReportsV3(), provider: loadedContentProviderV2 };
  return { product: '学会啦', formatVersion: 1, exportedAt: new Date().toISOString(), learnerProfile: learnerProfileV3, learningData: user, usage: readUsage(), guardianSettings: { dailyLessonGoal: adminSettings.dailyLessonGoal, dailyPlayMinutesCap: adminSettings.dailyPlayMinutesCap, gameMinutesCap: adminSettings.gameMinutesCap, allowedLevels: adminSettings.allowedLevels }, contentReports: readContentReportsV3(), localDiagnostics: readJsonLocalV3(DIAGNOSTICS_KEY_V3, []), contentProvider: loadedContentProviderV2 };
}

function exportProductDataV3(scope = 'all') {
  const payload = productExportPayloadV3(scope);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `学会啦-${scope === 'content' ? '内容纠错' : '学习档案'}-${localDateKeyV2()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

function openPrivacyCenterV3() {
  const auth = typeof WumingRemote !== 'undefined' ? WumingRemote.loadAuth() : null;
  const diagnostics = readJsonLocalV3(DIAGNOSTICS_KEY_V3, []);
  const aiConfigured = Boolean(window.LEARNING_AI_CONFIG?.endpoint);
  openSuiteModalV3({ icon: '锁', kicker: 'PRIVACY & CONTROL', title: '隐私与数据中心', copy: '学习数据属于孩子和家庭。默认保存在本机，远程能力必须明确开启。', body: `<div class="privacy-grid"><article><i>本机</i><div><strong>学习记录</strong><p>${auth ? `已登录 ${esc(auth.username)}，学习档案可同步。家长设置仍只在本机。` : '未登录云端，学习记录只保存在这台设备。'}</p></div></article><article><i>${learnerProfileV3.under14 ? '未14' : '14+'}</i><div><strong>年龄保护</strong><p>${learnerProfileV3.under14 ? (learnerProfileV3.guardianConfirmed ? '监护人已确认本机保存学习记录。' : '尚未获得监护确认，联网功能应保持关闭。') : '档案标记为已满 14 周岁。'}</p></div></article><article><i>AI</i><div><strong>分层提示</strong><p>${aiConfigured ? '已配置远程AI接口；只允许当前题目的封闭式提示。' : '当前使用本机规则提示，不会把题目或孩子信息发送给AI服务。'}</p></div></article><article><i>诊</i><div><strong>本机诊断</strong><p>仅记录错误类型与文件位置，不记录作答内容。当前 ${diagnostics.length} 条。</p></div></article></div><label class="suite-check privacy-toggle"><input id="diagnosticsToggleV3" type="checkbox" ${learnerProfileV3.diagnosticsEnabled ? 'checked' : ''} onchange="toggleDiagnosticsV3(this.checked)"><span><strong>允许保存本机故障诊断</strong><small>用于排查崩溃，最多保存 100 条，可随学习档案一起导出或删除。</small></span></label><div class="suite-actions wrap"><button type="button" class="quiet-cta" onclick="openOnboardingV3(true)">修改学习档案</button><button type="button" class="quiet-cta" onclick="exportProductDataV3('all')">导出全部数据</button>${auth ? '<button type="button" class="danger-quiet" onclick="showCloudDeleteV3()">删除云端账号</button>' : ''}<button type="button" class="danger-quiet" onclick="showLocalDeleteV3()">删除本机数据</button></div><div id="privacyDangerV3"></div>` });
}

function toggleDiagnosticsV3(enabled) {
  learnerProfileV3.diagnosticsEnabled = enabled === true;
  saveLearnerProfileV3();
  suiteMessageV3(enabled ? '本机故障诊断已开启。' : '本机故障诊断已关闭。', true);
}

function showLocalDeleteV3() {
  privacyDangerV3.innerHTML = `<form id="localDeleteFormV3" class="danger-zone"><strong>删除后无法恢复</strong><p>将删除学习记录、使用记录、家长设置、纠错记录和本机账号缓存。请输入管理员密令确认。</p><input name="passcode" type="password" autocomplete="current-password" required placeholder="管理员密令"><button type="submit">确认删除本机数据</button></form>`;
  localDeleteFormV3.addEventListener('submit', async event => {
    event.preventDefault();
    const passcode = new FormData(event.currentTarget).get('passcode');
    if (!await verifyAdminPassword(passcode)) return suiteMessageV3('管理员密令不正确。');
    const exactKeys = [
      'gongxing_academy_data', USAGE_KEY, ADMIN_SETTINGS_KEY, 'wuming_admin_password_hash_v1',
      LEARNER_PROFILE_KEY_V3, CONTENT_REPORTS_KEY_V3, DIAGNOSTICS_KEY_V3, ACCOUNT_GUEST_KEY,
      GAME_SESSION_KEY, 'wuming_remote_auth_v1', 'gongxing_lang', 'gongxing_arcade_scores',
      'gongxing_reaction_best_ms', 'gongxing_pacman_score_reset_v1', 'gongxing_forest_score_reset_v1',
      'gongxing_stick_settings_v1', 'gongxing_stick_keys_v1', 'gotit_chess_save_v3'
    ];
    exactKeys.forEach(key => localStorage.removeItem(key));
    const localKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(Boolean);
    localKeys.filter(key => key.startsWith(ACCOUNT_CACHE_PREFIX)).forEach(key => localStorage.removeItem(key));
    const sessionKeys = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index)).filter(Boolean);
    sessionKeys.filter(key => key === ADMIN_ACTIVE_KEY || key === PRACTICE_DRAFT_KEY_V2 || key.startsWith('nameless-last-lesson:')).forEach(key => sessionStorage.removeItem(key));
    try { WumingRemote.logout(); } catch {}
    try {
      await new Promise(resolve => {
        if (!('indexedDB' in window)) return resolve();
        const request = indexedDB.deleteDatabase(CONTENT_DB_V3);
        request.onsuccess = request.onerror = request.onblocked = resolve;
      });
    } catch {}
    location.reload();
  });
}

function showCloudDeleteV3() {
  privacyDangerV3.innerHTML = `<form id="cloudDeleteFormV3" class="danger-zone"><strong>删除云端账号与存档</strong><p>好友关系和排行榜记录也会被移除。本机数据不会自动删除。</p><input name="password" type="password" autocomplete="current-password" minlength="8" required placeholder="账号密码"><button type="submit">确认删除云端账号</button></form>`;
  cloudDeleteFormV3.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await WumingRemote.deleteAccount(String(new FormData(event.currentTarget).get('password') || ''));
      accountLogout();
      closeSuiteModalV3();
    } catch (error) { suiteMessageV3(typeof accountError === 'function' ? accountError(error) : '删除失败。'); }
  });
}

function captureDiagnosticV3(kind, message, source = '', line = 0) {
  if (!learnerProfileV3.diagnosticsEnabled) return;
  const entries = readJsonLocalV3(DIAGNOSTICS_KEY_V3, []);
  entries.push({ kind: String(kind).slice(0, 30), message: String(message || 'Unknown error').replace(/[\r\n]+/g, ' ').slice(0, 180), source: String(source || '').split('/').pop().slice(0, 80), line: Math.max(0, Number(line) || 0), at: new Date().toISOString() });
  writeJsonLocalV3(DIAGNOSTICS_KEY_V3, entries.slice(-100));
}

function initProductSuiteV3() {
  renderSmartPlanV3();
  window.addEventListener('error', event => captureDiagnosticV3('error', event.message, event.filename, event.lineno));
  window.addEventListener('unhandledrejection', event => captureDiagnosticV3('promise', event.reason?.message || event.reason));
  suiteModal.addEventListener('click', event => { if (event.target === suiteModal) closeSuiteModalV3(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./service-worker.js').catch(error => captureDiagnosticV3('service-worker', error.message));
  if (!learnerProfileV3.onboarded) setTimeout(() => openOnboardingV3(), 350);
}

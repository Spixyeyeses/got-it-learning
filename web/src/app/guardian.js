function guardianPercent(value, total) {
  return total > 0 ? Math.round(value / total * 100) : 0;
}

function guardianSubjectName(subjectId) {
  const names = lang === 'zh'
    ? { math: '数学', english: '英语', science: '科学' }
    : { math: 'Math', english: 'English', science: 'Science' };
  return names[subjectId] || subjectId || (lang === 'zh' ? '课程' : 'Course');
}

function renderGuardian() {
  ensureLearningProfileV2();
  const zhMode = lang === 'zh';
  const usage = readUsage();
  const todayKey = localDay();
  const todayUsage = usage.days[todayKey] || {};
  const studyMs = Math.max(0, Number(todayUsage.studyMs) || 0);
  const playMs = Math.max(0, Number(todayUsage.playMs) || 0);
  const totalMs = studyMs + playMs;
  const studyShare = guardianPercent(studyMs, totalMs);
  const playShare = totalMs ? 100 - studyShare : 0;
  const lessonGoal = Math.max(1, Number(adminSettings.dailyLessonGoal) || DEFAULT_DAILY_LESSON_GOAL);
  const lessonsDone = Math.max(0, Number(user.dailyLessons?.[todayKey]) || 0);
  const playCap = Math.max(5, Number(adminSettings.dailyPlayMinutesCap) || DEFAULT_DAILY_PLAY_MINUTES);
  const playMinutes = playMs > 0 ? Math.ceil(playMs / 60000) : 0;
  const unresolved = (user.wrongBook || []).filter(item => !item.resolved).length;
  const accuracyValue = user.totalSolved ? Math.round(user.totalCorrect / user.totalSolved * 100) : 0;
  const provider = loadedContentProviderV2 || window.NAMELESS_CONTENT_CONFIG?.provider || {};
  const compatibility = provider.kind === 'compatibility';
  const localDeclared = provider.kind === 'local-declared';
  const standardPilot = provider.kind === 'standard-aligned-pilot';
  const auth = typeof WumingRemote !== 'undefined' ? WumingRemote.loadAuth() : null;
  const todayEvents = usage.events.filter(event => event.day === todayKey);
  const recent = todayEvents.slice(-3).reverse();
  const todayAnswered = todayEvents.reduce((sum, event) => sum + (Number(event.total) || 0), 0);
  const evidenceReady = todayEvents.length >= 2 && todayAnswered >= 10;
  const aiConfigured = Boolean(window.LEARNING_AI_CONFIG?.endpoint);

  guardianKicker.textContent = zhMode ? 'GUARDIAN OVERVIEW · 今日' : 'GUARDIAN OVERVIEW · TODAY';
  guardianTitle.textContent = zhMode ? '家长安心报告' : 'Guardian Overview';
  guardianCopy.textContent = zhMode
    ? '不看刷了多少，只看时间是否健康、知识是否真正掌握。'
    : 'Look beyond question counts to healthy time use and real mastery.';
  guardianDetailsButton.textContent = zhMode ? '查看详细记录' : 'View details';
  guardianSettingsButton.textContent = zhMode ? '调整守护设置' : 'Adjust guardrails';

  const lessonState = lessonsDone >= lessonGoal ? (zhMode ? '今日目标已完成' : 'Daily goal met') : (zhMode ? `还差 ${lessonGoal - lessonsDone} 节` : `${lessonGoal - lessonsDone} to go`);
  const playState = playMinutes >= playCap ? (zhMode ? '今日已到上限' : 'Daily limit reached') : (zhMode ? `还可 ${Math.max(0, playCap - playMinutes)} 分钟` : `${Math.max(0, playCap - playMinutes)} min left`);
  guardianSummary.innerHTML = `
    <section class="guardian-balance">
      <div class="guardian-balance-head"><div><small>${zhMode ? '今日时间分配' : 'Today’s time balance'}</small><strong>${formatUsageTime(totalMs)}</strong></div><span>${totalMs ? `${studyShare}% ${zhMode ? '用于学习' : 'learning'}` : (zhMode ? '今天刚刚开始' : 'Just getting started')}</span></div>
      <div class="guardian-ratio" role="img" aria-label="${zhMode ? `学习 ${studyShare}%，受控休息 ${playShare}%` : `Learning ${studyShare}%, controlled break ${playShare}%`}"><i style="width:${studyShare}%"></i></div>
      <div class="guardian-ratio-labels"><span><b class="study-dot"></b>${zhMode ? '专注学习' : 'Focused learning'} ${formatUsageTime(studyMs)}</span><span><b class="play-dot"></b>${zhMode ? '受控休息' : 'Controlled break'} ${formatUsageTime(playMs)}</span></div>
    </section>
    <section class="guardian-evidence-state ${evidenceReady ? 'is-ready' : 'is-limited'}"><span>${evidenceReady ? (zhMode ? '证据可读' : 'Evidence ready') : (zhMode ? '证据不足' : 'Limited evidence')}</span><div><strong>${evidenceReady ? (zhMode ? '今天已有足够记录查看表现' : 'Enough records to review today') : (zhMode ? '暂不判断今天的掌握趋势' : 'No mastery trend claimed yet')}</strong><p>${evidenceReady ? (zhMode ? `来自 ${todayEvents.length} 次完整练习、${todayAnswered} 道有效作答；仍需后续复习确认长期掌握。` : `${todayEvents.length} complete sessions and ${todayAnswered} valid answers; later review is still needed.`) : (zhMode ? `当前只有 ${todayEvents.length} 次完整练习、${todayAnswered} 道有效作答。积累更多记录后再判断。` : `Only ${todayEvents.length} complete sessions and ${todayAnswered} valid answers so far.`)}</p></div></section>
    <section class="guardian-metrics">
      <article class="${lessonsDone >= lessonGoal ? 'is-good' : ''}"><small>${zhMode ? '每日微课目标' : 'Daily lesson goal'}</small><strong>${Math.min(lessonsDone, lessonGoal)} / ${lessonGoal}</strong><span>${lessonState}</span></article>
      <article class="${playMinutes < playCap ? 'is-good' : 'is-limit'}"><small>${zhMode ? '休息区时间边界' : 'Break-area boundary'}</small><strong>${playMinutes} / ${playCap} ${zhMode ? '分钟' : 'min'}</strong><span>${playState}</span></article>
      <article><small>${zhMode ? '长期正确率' : 'Long-term accuracy'}</small><strong>${accuracyValue}%</strong><span>${zhMode ? '结合掌握度判断，不只看一次分数' : 'Read with mastery, not one score'}</span></article>
      <article class="${unresolved === 0 ? 'is-good' : ''}"><small>${zhMode ? '待订正内容' : 'Corrections due'}</small><strong>${unresolved} ${zhMode ? '道' : ''}</strong><span>${unresolved ? (zhMode ? '已进入订正队列，不会悄悄跳过' : 'Queued so mistakes are not skipped') : (zhMode ? '当前没有遗留错题' : 'No unresolved mistakes')}</span></article>
    </section>
    <section class="guardian-recent"><div class="guardian-section-title"><strong>${zhMode ? '今天推进到哪里' : 'What moved forward today'}</strong><span>${recent.length ? `${recent.length} ${zhMode ? '条记录' : 'records'}` : ''}</span></div>${recent.length ? recent.map(event => `<div><span>${esc(guardianSubjectName(event.subject))} · ${esc(tx(event.levelName) || event.levelId)}</span><small>${Number(event.correct) || 0}/${Number(event.total) || 0} · ${formatUsageTime(Number(event.durationMs) || 0)}</small></div>`).join('') : `<p>${zhMode ? '完成第一节微课后，这里会出现课程阶段与结果。' : 'Course stages and outcomes appear after the first lesson.'}</p>`}</section>`;

  guardianTrust.innerHTML = `
    <div class="guardian-section-title"><strong>${zhMode ? '可以核验的四件事' : 'Four things you can verify'}</strong></div>
    <article><i>01</i><div><strong>${zhMode ? '规则由家长决定' : 'Parent-controlled boundaries'}</strong><p>${zhMode ? `每日目标 ${lessonGoal} 节、休息区最多 ${playCap} 分钟；免积分也不会绕过时间上限。` : `${lessonGoal} lessons daily and up to ${playCap} break minutes; free access never bypasses the limit.`}</p></div></article>
    <article class="${compatibility || localDeclared || standardPilot ? 'is-warning' : ''}"><i>02</i><div><strong>${zhMode ? '内容来源公开透明' : 'Transparent content source'}</strong><p>${esc(compatibility ? (zhMode ? `${provider.name || '迁移课程库'}用于产品迁移验证，正式授权题源接入前不会伪装成正式题库。` : `${provider.name || 'Transition library'} is for migration validation and is clearly marked until licensed content is connected.`) : localDeclared ? (zhMode ? `${provider.name || '本机课程包'}通过了结构校验，但许可证声明仍等待人工和法律核验。` : `${provider.name || 'Local course package'} passed structural checks; its licence declaration still needs human and legal verification.`) : standardPilot ? (zhMode ? '已启用国家课程标准V3和原创试验题；教材正文、插图和原题尚未接入，等待出版社授权。' : 'Curriculum V3 and original pilot items are active; textbook prose, art, and original questions await publisher permission.') : (zhMode ? `${provider.name || '课程内容'}已通过来源与格式校验。` : `${provider.name || 'Course content'} passed source and format checks.`))}</p></div></article>
    <article><i>03</i><div><strong>${zhMode ? '学习记录归属清楚' : 'Clear data ownership'}</strong><p>${auth?.username ? (zhMode ? `当前登录 ${esc(auth.username)}，学习记录可同步；家长设置仍保存在本机。` : `Signed in as ${esc(auth.username)} for sync; guardian settings stay on this device.`) : (zhMode ? '当前未登录云端，学习记录与家长设置只保存在这台设备。' : 'Not signed in; learning data and guardian settings remain on this device.')} </p></div></article>
    <article><i>04</i><div><strong>${zhMode ? 'AI 边界说清楚' : 'Clear AI boundaries'}</strong><p>${aiConfigured ? (zhMode ? '已配置远程 AI，但当前报告没有可核验的 AI 使用记录，因此不声称 AI 参与了本次学习。' : 'Remote AI is configured, but this report has no verifiable AI-use record and makes no claim that AI participated.') : (zhMode ? '当前使用本机规则提示，不会把题目或孩子信息发送给远程 AI。' : 'Current hints run locally; questions and child data are not sent to remote AI.')}</p></div></article>`;
}

function openGuardian() {
  if (typeof flushStudyUsage === 'function') flushStudyUsage();
  renderGuardian();
  guardianModal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => guardianModal.querySelector('.exchange-close')?.focus(), 0);
}

function closeGuardian() {
  guardianModal.hidden = true;
  document.body.style.overflow = '';
}

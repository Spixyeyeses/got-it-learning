function error(message = '') {
  const element = document.querySelector('#error');
  element.textContent = message;
  element.style.display = message ? 'block' : 'none';
}

function applyArcadeGameCount(count) {
  if (!Number.isInteger(count) || count < 1) return arcadeGameCount;
  arcadeGameCount = count;
  if (typeof syncFreeGameCopy === 'function') syncFreeGameCopy();
  return arcadeGameCount;
}

async function refreshArcadeContent(refreshAssets = false) {
  if (location.protocol === 'file:') return applyArcadeGameCount(DEFAULT_ARCADE_GAME_COUNT);
  const pageUrl = new URL('./games.html', location.href);
  pageUrl.searchParams.set('contentRefresh', String(Date.now()));
  const response = await fetch(pageUrl, { cache: 'reload' });
  if (!response.ok) throw new Error(`games.html: ${response.status}`);
  const documentCopy = new DOMParser().parseFromString(await response.text(), 'text/html');
  const count = documentCopy.querySelectorAll('.game-card[data-game]').length;
  applyArcadeGameCount(count);
  if (refreshAssets) {
    const assetUrls = [...documentCopy.querySelectorAll('script[src],link[rel="stylesheet"][href]')]
      .map(element => element.getAttribute('src') || element.getAttribute('href'))
      .filter(Boolean);
    await Promise.all(assetUrls.map(async asset => {
      const assetResponse = await fetch(new URL(asset, pageUrl), { cache: 'reload' });
      if (!assetResponse.ok) throw new Error(`${asset}: ${assetResponse.status}`);
    }));
  }
  return count;
}

async function refreshLearningContent({ refreshGameAssets = false } = {}) {
  const [bankCount, gameCount] = await Promise.all([
    refreshQuestionBanks(),
    refreshArcadeContent(refreshGameAssets)
  ]);
  return { bankCount, gameCount };
}

async function init() {
  importArcadeReturn();
  loadAdminSettings();
  applyAdminMode();
  let contentFailed = false;
  try {
    await refreshQuestionBanks();
  } catch (exception) {
    console.error(exception);
    contentFailed = true;
    const detail = exception instanceof Error ? exception.message : String(exception);
    error(`课程内容加载或验证失败：${detail}`);
    document.querySelector('#start').disabled = true;
  }
  try {
    await refreshArcadeContent();
  } catch (exception) {
    console.warn('游戏目录刷新失败，继续使用本机目录。', exception);
    applyArcadeGameCount(DEFAULT_ARCADE_GAME_COUNT);
  }
  loadUser();
  setLang(localStorage.getItem('gongxing_lang') === 'en' ? 'en' : 'zh');
  if (typeof initProductSuiteV3 === 'function') initProductSuiteV3();
  renderAccountButton();
  const params = new URLSearchParams(location.search);
  if (!contentFailed && params.has('gameExpired')) error('专注休息时间已结束，完成下一节微课即可继续积累积分。');
  else if (!contentFailed && params.has('gameAccess')) error('请先使用专注积分兑换休息时间。');
  if (params.has('gameExpired') || params.has('gameAccess')) history.replaceState({}, '', location.pathname);
}

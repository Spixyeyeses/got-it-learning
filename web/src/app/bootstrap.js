function visibleModalV3() {
  return [
    typeof titleDetailModal !== 'undefined' ? titleDetailModal : null,
    typeof suiteModal !== 'undefined' ? suiteModal : null,
    typeof adminModal !== 'undefined' ? adminModal : null,
    typeof guardianModal !== 'undefined' ? guardianModal : null,
    typeof usageModal !== 'undefined' ? usageModal : null,
    typeof exchangeModal !== 'undefined' ? exchangeModal : null,
    typeof accountModal !== 'undefined' ? accountModal : null,
    typeof friendsModal !== 'undefined' ? friendsModal : null,
    typeof leaderboardModal !== 'undefined' ? leaderboardModal : null
  ].find(modal => modal && !modal.hidden);
}

function closeVisibleModalV3(modal) {
  if (typeof titleDetailModal !== 'undefined' && modal === titleDetailModal) closeAchievementDetailV6();
  else if (modal === suiteModal) closeSuiteModalV3();
  else if (modal === adminModal) closeAdmin();
  else if (modal === guardianModal) closeGuardian();
  else if (modal === usageModal) closeUsage();
  else if (modal === exchangeModal) closeExchange();
  else if (typeof accountModal !== 'undefined' && modal === accountModal) closeAccount();
  else if (typeof friendsModal !== 'undefined' && modal === friendsModal) closeFriends();
  else if (typeof leaderboardModal !== 'undefined' && modal === leaderboardModal) closeLeaderboard();
}

document.addEventListener('keydown', event => {
  const modal = visibleModalV3();
  if (modal) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeVisibleModalV3(modal);
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...modal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter(node => node.getClientRects().length && !node.closest('[hidden]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (typeof handlePracticeShortcutV2 === 'function') handlePracticeShortcutV2(event);
});

exchangeModal.addEventListener('click', event => { if (event.target === exchangeModal) closeExchange(); });
usageModal.addEventListener('click', event => { if (event.target === usageModal) closeUsage(); });
guardianModal.addEventListener('click', event => { if (event.target === guardianModal) closeGuardian(); });
titleDetailModal.addEventListener('click', event => { if (event.target === titleDetailModal) closeAchievementDetailV6(); });
adminModal.addEventListener('click', event => { if (event.target === adminModal) closeAdmin(); });

init().catch(exception => {
  console.error('Application initialization failed.', exception);
  error(lang === 'zh' ? '学习数据加载失败，请刷新后重试。' : 'Learning data failed to load. Please refresh and try again.');
});

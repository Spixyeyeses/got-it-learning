window.addEventListener('focus',()=>sessionPaused?resumeGameAccess():recheckGameAccess());
window.addEventListener('pagehide',()=>{flushPlayUsage(true);pauseGameAccess();prepareArcadeReturn()});
window.addEventListener('pageshow',resumeGameAccess);
document.addEventListener('visibilitychange',()=>{if(document.hidden){flushPlayUsage(true);pauseGameAccess()}else{playUsageLast=Date.now();sessionPaused?resumeGameAccess():recheckGameAccess()}});
window.addEventListener('storage',e=>{if(e.key===GAME_SESSION_KEY)recheckGameAccess()});

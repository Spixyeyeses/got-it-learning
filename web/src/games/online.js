// Online matches were intentionally retired. These small compatibility hooks
// keep older game modules focused on their local and AI modes without opening
// network connections or exposing matchmaking controls.
let onlineSession = null;
function onlineReady(){return false}
function onlineOption(){return ''}
function onlineIdentity(){return ''}
function onlinePlayerNumber(){return 0}
function onlineEventPlayer(){return 0}
function onlineMatchId(){return ''}
function onlineStatusCopy(){return L('本游戏支持电脑对战与同屏双人','AI and local play are available')}
async function beginOnlineMatch(){throw new Error('ONLINE_PLAY_RETIRED')}
function sendOnlineEvent(){return Promise.reject(new Error('ONLINE_PLAY_RETIRED'))}
async function endOnlineMatch(){onlineSession=null}

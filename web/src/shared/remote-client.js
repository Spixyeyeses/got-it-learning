(function(global){
  const AUTH_KEY='wuming_remote_auth_v1';
  const cleanBase=value=>String(value||'').trim().replace(/\/+$/,'');
  const configured=()=>!!cleanBase(global.REMOTE_SERVER_URL);
  const loadAuth=()=>{try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'null')}catch{return null}};
  const saveAuth=value=>value?localStorage.setItem(AUTH_KEY,JSON.stringify(value)):localStorage.removeItem(AUTH_KEY);
  const request=async(path,options={})=>{
    const base=cleanBase(global.REMOTE_SERVER_URL);
    if(!base)throw new Error('REMOTE_NOT_CONFIGURED');
    const auth=loadAuth(),headers={'Content-Type':'application/json',...(options.headers||{})};
    if(auth?.token)headers.Authorization=`Bearer ${auth.token}`;
    const response=await fetch(base+path,{...options,headers});
    let body=null;try{body=await response.json()}catch{}
    if(!response.ok){const error=new Error(body?.error||`HTTP_${response.status}`);error.status=response.status;throw error}
    return body
  };
  const authenticate=async(kind,username,password,data)=>{
    const result=await request(`/api/auth/${kind}`,{method:'POST',body:JSON.stringify({username,password,data})});
    saveAuth({token:result.token,username:result.user.username,revision:result.user.revision||0});
    return result
  };
  const sync=async data=>{
    const auth=loadAuth();if(!auth)throw new Error('AUTH_REQUIRED');
    const result=await request('/api/sync',{method:'POST',body:JSON.stringify({baseRevision:auth.revision||0,data})});
    saveAuth({...auth,revision:result.user.revision});
    return result
  };
  global.WumingRemote={
    configured,loadAuth,logout:()=>saveAuth(null),request,
    register:(username,password,data)=>authenticate('register',username,password,data),
    login:(username,password)=>authenticate('login',username,password),
    sync,
    addFriend:username=>request('/api/friends',{method:'POST',body:JSON.stringify({username})}),
    friends:()=>request('/api/friends'),
    leaderboard:period=>request(`/api/leaderboard?period=${encodeURIComponent(period)}`),
    deleteAccount:async password=>{const result=await request('/api/account',{method:'DELETE',body:JSON.stringify({password})});saveAuth(null);return result}
  };
})(window);

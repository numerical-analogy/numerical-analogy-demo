// Solve m_p(A,D) = m_p(B,C) without reordering the entered analogy.
// Using log means avoids the spurious p=0 root of the raw power-sum equation.
function logCosh(x){
  const z=Math.abs(x);
  if(z<1e-3){const s=z*z;return s/2-s*s/12+s*s*s/45;}
  return z+Math.log1p(Math.exp(-2*z))-Math.LN2;
}
function logMean(x,y,p){
  if(x===0&&y===0)return -Infinity;
  if(x===0||y===0)return p>0?Math.log(Math.max(x,y))-Math.LN2/p:-Infinity;
  const lx=Math.log(x),ly=Math.log(y);
  if(p===0)return (lx+ly)/2;
  return (lx+ly)/2+logCosh(p*(lx-ly)/2)/p;
}
export function calculatePower(a,b,c,d){
  if([a,b,c,d].some(v=>!Number.isFinite(v)||v<0))return {kind:'error',label:'Enter four nonnegative numbers.',message:'The order A : B :: C : D is preserved.'};
  let u=[a,d].sort((x,y)=>x-y),v=[b,c].sort((x,y)=>x-y);
  const hasZero=Math.min(a,b,c,d)===0;
  if(u[0]===v[0]&&u[1]===v[1])return {kind:'multiple',label:hasZero?'Any nonnegative power':'Any real power',message:'The power is not unique. Choose a power above.'};
  if(u[0]===0&&v[0]===0)return {kind:'unique',power:0,message:'Both geometric means are zero.'};
  if(u[0]>v[0]) [u,v]=[v,u];
  if(u[1]<=v[1]){
    if(u[1]===v[1])return {kind:'limit',label:'power → +∞',message:'No finite power; equality holds in the maximum limit.'};
    if(u[0]===v[0]&&!hasZero)return {kind:'limit',label:'power → −∞',message:'No finite power; equality holds in the minimum limit.'};
    return {kind:'none',label:'No finite power',message:'No numerical analogy in the entered order.'};
  }
  if(u[0]===v[0])return {kind:'limit',label:'power → −∞',message:'No finite power; equality holds in the minimum limit.'};
  const f=p=>logMean(u[0],u[1],p)-logMean(v[0],v[1],p);
  const f0=hasZero?-Infinity:f(0);
  if(Math.abs(f0)<1e-14)return {kind:'unique',power:0,message:''};
  let lo,hi;
  if(f0<0){lo=0;hi=1;while(f(hi)<0&&hi<1e12)hi*=2;}
  else{hi=0;lo=-1;while(f(lo)>0&&lo>-1e12)lo*=2;}
  if(!(f(lo)<=0&&f(hi)>=0))return {kind:'error',label:'Power is outside the numerical search range.',message:''};
  for(let i=0;i<180;i++){
    const mid=(lo+hi)/2,delta=f(mid);
    if(delta===0){lo=hi=mid;break;}
    if(delta<0)lo=mid;else hi=mid;
    if(hi-lo<1e-12*Math.max(1,Math.abs(mid)))break;
  }
  const power=(lo+hi)/2;
  if(!Number.isFinite(power)||Math.abs(f(power))>1e-8)return {kind:'error',label:'Could not resolve a stable finite power.',message:''};
  return {kind:'unique',power,message:Math.abs(power)>20?'The drawing demo accepts powers from −20 to 20.':''};
}

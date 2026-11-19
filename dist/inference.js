// Same deterministic mean-based inference and admissibility checks as the notebook.
export function solveLatent(means, power) {
  if (!Number.isFinite(power)) throw new Error('Power must be a finite number.');
  const latent = new Float32Array(32);
  let valid = true;
  for (let j = 0; j < 32; j++) {
    const a = Math.max(means[j], 1e-4);
    const b = Math.max(means[32+j], 1e-4);
    const c = Math.max(means[64+j], 1e-4);
    let value;
    if (Math.abs(power) < 1e-8) value = b*c/a;
    else {
      const scale = power > 0 ? Math.max(a,b,c) : Math.min(a,b,c);
      const rhs = -Math.pow(a/scale,power)+Math.pow(b/scale,power)+Math.pow(c/scale,power);
      valid &&= power > 0 ? rhs >= 0 : rhs > 0;
      value = scale*Math.pow(Math.max(rhs,power > 0 ? 0 : 1e-30),1/power);
    }
    valid &&= Number.isFinite(value) && value < 100;
    latent[j] = Math.min(100,Math.max(0,Number.isNaN(value) ? 0 : value));
  }
  return {latent,valid};
}

export function normalizeDrawing(canvas) {
  const w=canvas.width,h=canvas.height;
  const rgba=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    if(rgba[(y*w+x)*4]>20){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  }
  if(x1<x0) return null;
  const bw=x1-x0+1,bh=y1-y0+1,scale=20/Math.max(bw,bh);
  const tmp=document.createElement('canvas');tmp.width=tmp.height=28;
  const ctx=tmp.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='black';ctx.fillRect(0,0,28,28);
  const nw=Math.max(1,Math.round(bw*scale)),nh=Math.max(1,Math.round(bh*scale));
  ctx.drawImage(canvas,x0,y0,bw,bh,Math.floor((28-nw)/2),Math.floor((28-nh)/2),nw,nh);
  const data=ctx.getImageData(0,0,28,28).data;
  let mass=0,mx=0,my=0;
  for(let y=0;y<28;y++)for(let x=0;x<28;x++){
    const v=data[(y*28+x)*4];mass+=v;mx+=x*v;my+=y*v;
  }
  if(!mass)return null;
  const dx=Math.round(13.5-mx/mass),dy=Math.round(13.5-my/mass);
  const result=new Float32Array(784);
  for(let y=0;y<28;y++)for(let x=0;x<28;x++){
    const sx=x-dx,sy=y-dy;
    if(sx>=0&&sx<28&&sy>=0&&sy<28)result[y*28+x]=data[(sy*28+sx)*4]/255;
  }
  return result;
}

export class Models {
  async load(progress=()=>{}) {
    // Single-thread WASM works on Pages without cross-origin isolation headers.
    ort.env.wasm.numThreads=1;
    ort.env.wasm.wasmPaths=new URL('./vendor/',import.meta.url).href;
    this.sessions={};
    const names=['classifier','proposed_encoder','proposed_decoder'];
    for(let i=0;i<names.length;i++) {
      progress(i,names.length);
      const name=names[i];
      this.sessions[name]=await ort.InferenceSession.create(new URL(`./models/${name}.onnx`,import.meta.url).href,
        {executionProviders:['wasm'],graphOptimizationLevel:'all'});
    }
    progress(names.length,names.length);
  }
  async classify(images) {
    const result=await this.sessions.classifier.run({images:new ort.Tensor('float32',images,[images.length/784,1,28,28])});
    return Array.from({length:images.length/784},(_,i)=>{
      const scores=Array.from(result.logits.data.slice(i*10,i*10+10));
      const max=Math.max(...scores),denom=scores.reduce((s,v)=>s+Math.exp(v-max),0);
      return {digit:scores.indexOf(max),confidence:1/denom};
    });
  }
  async solve(images,labels,power) {
    const feeds={images:new ort.Tensor('float32',images,[3,1,28,28]),
      labels:new ort.Tensor('int64',BigInt64Array.from(labels,BigInt),[3])};
    const proposedMeans=(await this.sessions.proposed_encoder.run(feeds)).means.data;
    const {latent,valid}=solveLatent(proposedMeans,power);
    // Retain clipped notebook output for numerical verification; the UI suppresses it if invalid.
    const proposed=(await this.sessions.proposed_decoder.run({latent:new ort.Tensor('float32',latent,[1,32])})).image.data;
    return {proposed,latent,valid};
  }
}

import {Models,normalizeDrawing} from './inference.js';
import {calculatePower} from './power.js';

const $=s=>document.querySelector(s);
const models=new Models();
let ready=false,busy=false,revision=0,lastCalculation=null;
const states=[];
const output=$('#proposed-output');

function pixels(canvas,data){
  const ctx=canvas.getContext('2d'),img=ctx.createImageData(28,28);
  for(let i=0;i<784;i++){
    const v=data?Math.round(Math.max(0,Math.min(1,data[i]))*255):0;
    img.data[i*4]=img.data[i*4+1]=img.data[i*4+2]=v;img.data[i*4+3]=255;
  }
  ctx.putImageData(img,0,0);
}
function status(message='',error=false){
  $('#status').textContent=message;$('#status').hidden=!message;
  $('#status').classList.toggle('error',error);
}
function changed(){
  revision++;pixels(output,null);$('#relation-summary').textContent='A : B :: C : ?';
  $('#domain-note').hidden=true;$('#timing').textContent='';status();
}
function reset(state){
  const ctx=state.canvas.getContext('2d');ctx.fillStyle='black';ctx.fillRect(0,0,280,280);
  state.input=null;changed();
}
document.querySelectorAll('.digit-card').forEach(card=>{
  const state={canvas:card.querySelector('.drawing')};states.push(state);reset(state);
  card.querySelector('.clear').addEventListener('click',()=>{if(!busy)reset(state);});
  let drawing=false,last=null;
  const position=e=>{
    const r=state.canvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)*280/r.width,y:(e.clientY-r.top)*280/r.height};
  };
  function stroke(point){
    const ctx=state.canvas.getContext('2d');ctx.strokeStyle='white';ctx.fillStyle='white';
    ctx.lineWidth=19;ctx.lineCap='round';ctx.lineJoin='round';
    if(last){ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(point.x,point.y);ctx.stroke();}
    else{ctx.beginPath();ctx.arc(point.x,point.y,9.5,0,Math.PI*2);ctx.fill();}
    last=point;
  }
  state.canvas.addEventListener('pointerdown',e=>{
    if(busy||drawing)return;
    e.preventDefault();state.canvas.setPointerCapture(e.pointerId);
    state.input=null;changed();drawing=true;last=null;stroke(position(e));
  });
  state.canvas.addEventListener('pointermove',e=>{if(drawing)stroke(position(e));});
  function finish(){
    if(!drawing)return;drawing=false;last=null;state.input=normalizeDrawing(state.canvas);
  }
  state.canvas.addEventListener('pointerup',finish);
  state.canvas.addEventListener('pointercancel',finish);
});
$('#clear-all').addEventListener('click',()=>{if(!busy)states.forEach(reset);});
$('#power').addEventListener('input',changed);

async function solve(){
  if(!ready||busy)return;
  const runRevision=revision;
  try{
    if(states.some(s=>!s.input))throw new Error('Draw a digit in A, B and C.');
    const raw=$('#power').value.trim(),power=Number(raw);
    if(!raw||!Number.isFinite(power)||Math.abs(power)>20)throw new Error('Enter a power between −20 and 20.');
    busy=true;$('#solve').disabled=true;$('#solve').textContent='Solving…';status();
    const inputs=new Float32Array(2352);states.forEach((s,i)=>inputs.set(s.input,i*784));
    const guesses=await models.classify(inputs),labels=guesses.map(g=>g.digit);
    const start=performance.now();
    const result=await models.solve(inputs,labels,power);
    if(revision!==runRevision){status('Inputs changed. Select Solve again.');return;}
    pixels(output,result.valid?result.proposed:null);
    $('#relation-summary').textContent=`${labels[0]} : ${labels[1]} :: ${labels[2]} : ?   ·   power = ${Number(power.toPrecision(7))}`;
    $('#timing').textContent=`${Math.round(performance.now()-start)} ms`;
    $('#domain-note').hidden=result.valid;
    $('#domain-note').textContent='No admissible latent solution. Try another power or handwriting.';
    return result;
  }catch(error){status(error.message||'Could not run the model. Please try again.',true);}
  finally{busy=false;$('#solve').disabled=!ready;$('#solve').textContent='Solve';}
}
$('#solve').addEventListener('click',solve);

function invalidateCalculation(){
  lastCalculation=null;$('#calculator-result').textContent='';$('#calculator-detail').textContent='';
  $('#use-power').disabled=true;
}
document.querySelectorAll('#power-calculator input').forEach(input=>input.addEventListener('input',invalidateCalculation));
$('#power-calculator').addEventListener('submit',event=>{
  event.preventDefault();invalidateCalculation();
  const values=['a','b','c','d'].map(letter=>{
    const value=$(`#number-${letter}`).value.trim();return value===''?NaN:Number(value);
  });
  const result=calculatePower(...values);lastCalculation=result;
  $('#calculator-result').textContent=result.kind==='unique'?`power ${result.exact?'=':'≈'} ${Number(result.power.toPrecision(12))}`:result.label;
  $('#calculator-detail').textContent=result.message||'';
  $('#use-power').disabled=result.kind!=='unique'||Math.abs(result.power)>20;
});
$('#use-power').addEventListener('click',()=>{
  if(lastCalculation?.kind!=='unique'||busy)return;
  $('#power').value=Number(lastCalculation.power.toFixed(6));changed();$('#power').focus();
});

async function initialize(){
  try{
    for(let n=0;!globalThis.ort&&n<200;n++)await new Promise(r=>setTimeout(r,50));
    if(!globalThis.ort)throw new Error('The inference runtime did not load. Reload the page.');
    await models.load((done,total)=>{$('#solve').textContent=`Loading ${done}/${total}…`;});
    ready=true;$('#solve').disabled=false;$('#solve').textContent='Solve';
  }catch(error){status(`Model loading failed: ${error.message}`,true);$('#solve').textContent='Reload to retry';}
}
initialize();
export {models,solve};

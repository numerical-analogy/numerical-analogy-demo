"""Check the simplified browser UI, calculator and proposed-model inference."""
import functools
import http.server
import itertools
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8767),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:8767/dist/'
fixtures=json.loads((ROOT/'review/fixtures.json').read_text())
samples=json.loads((ROOT/'review/samples.json').read_text())
power_refs=json.loads((ROOT/'review/power_reference.json').read_text())
report={'fixture_errors':[],'console_errors':[],'checks':[]}
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome',headless=True)
        page=browser.new_page(viewport={'width':1280,'height':900})
        external=[];requests=[]
        page.on('request',lambda r:requests.append(r.url))
        page.on('request',lambda r:external.append(r.url) if not r.url.startswith('http://127.0.0.1:8767/') else None)
        page.on('pageerror',lambda e:report['console_errors'].append(str(e)))
        page.goto(url)
        page.wait_for_function("document.querySelector('#solve').textContent==='Solve'",timeout=120000)
        assert page.locator('#former-output').count()==0
        assert not any('former' in u for u in requests)
        report['checks'].append('Only the proposed VAE and classifier are loaded; no former-model UI or weights.')
        for fixture in fixtures:
            result=page.evaluate("""async({fixture,samples})=>{
              const {models}=await import('./app.js');
              const input=new Float32Array(2352);
              fixture.digits.forEach((d,i)=>input.set(samples[d][0].map(v=>v/255),i*784));
              const r=await models.solve(input,fixture.digits,fixture.power);
              return {proposed:Array.from(r.proposed),latent:Array.from(r.latent),valid:r.valid};
            }""",{'fixture':fixture,'samples':samples})
            assert result['valid']==fixture['valid']
            errors={k:max(abs(a-b) for a,b in zip(result[k],fixture[k])) for k in ('proposed','latent')}
            assert max(errors.values())<3e-5,errors
            report['fixture_errors'].append({'digits':fixture['digits'],'power':fixture['power'],**errors})
        report['checks'].append('Proposed-model WASM inference matches PyTorch for seven cases.')
        calculated=page.evaluate("""async(refs)=>{
          const {calculatePower}=await import('./power.js');
          return refs.map(r=>calculatePower(...r.values));
        }""",power_refs)
        max_error=0
        for ref,res in zip(power_refs,calculated):
            assert res['kind']=='unique',(ref,res)
            error=abs(ref['power']-res['power']);max_error=max(max_error,error)
            assert error<2e-6,(ref,res,error)
        report['power_reference_max_error']=max_error
        report['checks'].append('Calculator matches an independent 70-digit generalized-mean calculation on 210 distinct MNIST digit quadruples.')
        cases=[([1,2,3,4],'unique',1),([1,4,7,8],'unique',2),([1,2,3,5],'unique',.30379398195),
               ([1,2,4,8],'unique',0),([1.6,2,4,8],'unique',-1),([0,3,4,5],'unique',2),
               ([2,2,8,8],'multiple',None),([1,4,2,3],'none',None),([1,2,3,3],'limit',None),
               ([0,0,2,3],'unique',0),([0,1,2,0],'none',None),([-1,2,3,4],'error',None)]
        for values,kind,wanted in cases:
            res=page.evaluate("""async(values)=>{const {calculatePower}=await import('./power.js');return calculatePower(...values)}""",values)
            assert res['kind']==kind,(values,res,kind)
            if wanted is not None:assert abs(res['power']-wanted)<1e-8,(values,res,wanted)
        # Eight analogy symmetries must preserve the same power, without changing the given pairing.
        for values in [(1,4,7,8),(8,4,7,1),(1,7,4,8),(8,7,4,1),(4,1,8,7),(7,1,8,4),(4,8,1,7),(7,8,1,4)]:
            res=page.evaluate("""async(values)=>{const {calculatePower}=await import('./power.js');return calculatePower(...values)}""",values)
            assert res['kind']=='unique' and abs(res['power']-2)<1e-8,(values,res)
        report['checks'].append('Calculator handles geometric, negative, zero-input, degenerate, invalid-order and limiting cases.')
        for letter,value in zip('abcd',(1,2,3,5)):page.fill('#number-'+letter,str(value))
        page.click('#power-calculator button[type=submit]')
        assert '0.30379398' in page.locator('#calculator-result').inner_text()
        page.click('#use-power')
        assert abs(float(page.input_value('#power'))-.30379398195)<1e-8
        page.fill('#number-d','6');assert page.locator('#use-power').is_disabled()
        page.fill('#number-d','');page.click('#power-calculator button[type=submit]')
        assert 'Enter four' in page.locator('#calculator-result').inner_text()
        report['checks'].append('Calculator result transfers to the power field; edits invalidate the old result; empty fields are rejected.')
        page.click('#solve');assert 'Draw a digit' in page.locator('#status').inner_text()
        for letter,points in [('a',[(.5,.2),(.5,.8)]),
                              ('b',[(.25,.3),(.45,.2),(.65,.3),(.65,.4),(.25,.8),(.7,.8)]),
                              ('c',[(.25,.25),(.7,.25),(.45,.5),(.7,.65),(.55,.8),(.25,.75)])]:
            box=page.locator('#draw-'+letter).bounding_box()
            for i,(x,y) in enumerate(points):
                page.mouse.move(box['x']+x*box['width'],box['y']+y*box['height'],steps=6)
                if i==0:page.mouse.down()
            page.mouse.up()
        page.fill('#power','1');page.click('#solve')
        page.wait_for_function("!document.querySelector('#solve').disabled")
        assert 'power = 1' in page.locator('#relation-summary').inner_text()
        for letter,value in zip('abcd',(1,4,7,8)):page.fill('#number-'+letter,str(value))
        page.click('#power-calculator button[type=submit]')
        left=page.locator('.workspace').bounding_box();right=page.locator('#results').bounding_box()
        assert abs(left['y']-right['y'])<1 and right['x']>left['x']+left['width']
        assert right['y']+right['height']<900 and left['y']+left['height']<900
        assert page.locator('.example-row').count()==0 and page.locator('.explanation').count()==0
        assert page.locator('.solve-bar button').count()==1
        page.screenshot(path=str(ROOT/'review/desktop.png'),full_page=True)
        report['checks'].append('Handwriting is recognized and solved; input and result are side by side and visible within a 900px-high desktop viewport.')
        page.fill('#power','21');page.click('#solve');assert 'between' in page.locator('#status').inner_text()
        page.click('#clear-all');assert page.locator('#relation-summary').inner_text()=='A : B :: C : ?'
        mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        mp=mobile.new_page();mp.goto(url)
        mp.wait_for_function("document.querySelector('#solve').textContent==='Solve'",timeout=120000)
        mp.click('#power-calculator button[type=submit]')
        assert '2' in mp.locator('#calculator-result').inner_text()
        assert mp.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
        mp.screenshot(path=str(ROOT/'review/mobile.png'),full_page=True)
        report['checks'].append('Phone layout has no horizontal overflow; calculator works on mobile.')
        assert not external,external
        assert not report['console_errors'],report['console_errors']
        browser.close()
finally:
    server.shutdown()
    (ROOT/'review/browser_validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))

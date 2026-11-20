"""Export the existing notebook weights without retraining or quantization."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import tarfile
import shutil
import itertools
import mpmath as mp

import numpy as np
import onnx
import onnxruntime as ort
import torch
from torch import nn
from torchvision.datasets import MNIST

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[1]
SOURCE = args.source
sys.path.insert(0, str(SOURCE))
from model import VAE

torch.set_num_threads(2)
OUT = ROOT / 'dist' / 'image'
(ROOT/'review').mkdir(exist_ok=True)
(OUT/'models').mkdir(parents=True,exist_ok=True)

class Means(nn.Module):
    def __init__(self, encoder):
        super().__init__()
        self.encoder = encoder
    def forward(self, images, labels):
        return self.encoder(images, labels)[0]

class Classifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1,32,3,padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32,64,3,padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Flatten(), nn.Linear(64*7*7,128), nn.ReLU(),
            nn.Dropout(.5), nn.Linear(128,10))
    def forward(self, x):
        return self.conv(x)

def load(model, name):
    saved = torch.load(SOURCE/'models'/name, map_location='cpu', weights_only=True)
    model.load_state_dict(saved.get('model_state_dict', saved))
    return model.eval().requires_grad_(False)

models = {'proposed': load(VAE(latent_dim=32), 'current_power_nlg.pt')}
classifier = load(Classifier(), 'classifier.pt')
dataset = MNIST(str(SOURCE/'data'), train=False, download=False)
rng = np.random.default_rng(42)
samples = {str(d): [dataset.data[int(i)].numpy().reshape(-1).tolist() for i in
                    rng.choice(np.flatnonzero(dataset.targets.numpy()==d), 8, replace=False)]
           for d in range(10)}
(ROOT/'review/samples.json').write_text(json.dumps(samples,separators=(',',':')))
images = torch.stack([dataset.data[int(np.flatnonzero(dataset.targets.numpy()==d)[0])]
                      for d in (1,4,7)])[:,None].float()/255
labels = torch.tensor([1,4,7],dtype=torch.long)
report = {'models': {}, 'max_absolute_errors': {}}

def export(module, filename, inputs, names, output, dynamic):
    module.eval()
    path = OUT/'models'/filename
    torch.onnx.export(module, inputs, str(path), input_names=names,
                      output_names=[output], dynamic_axes=dynamic,
                      opset_version=17, dynamo=False)
    onnx.checker.check_model(str(path))
    session = ort.InferenceSession(str(path), providers=['CPUExecutionProvider'])
    with torch.no_grad(): expected = module(*inputs).numpy()
    actual = session.run(None,{n:t.numpy() for n,t in zip(names,inputs)})[0]
    np.testing.assert_allclose(actual,expected,atol=2e-5,rtol=2e-4)
    report['max_absolute_errors'][filename] = float(np.max(np.abs(actual-expected)))

for name,model in models.items():
    export(Means(model.encoder),name+'_encoder.onnx',(images,labels),['images','labels'],'means',
           {'images':{0:'batch'},'labels':{0:'batch'},'means':{0:'batch'}})
    export(model.decoder,name+'_decoder.onnx',(torch.zeros(1,32),),['latent'],'image',
           {'latent':{0:'batch'},'image':{0:'batch'}})
    source = SOURCE/'models'/'current_power_nlg.pt'
    report['models'][name] = {'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                             'latent_dim':32}
export(classifier,'classifier.onnx',(images,),['images'],'logits',
       {'images':{0:'batch'},'logits':{0:'batch'}})

fixtures=[]
for digits,p in [([1,2,3],1),([1,4,7],2),([2,2,8],1),([1,2,3],.30379398190416396),
                 ([2,4,3],0),([2,4,3],-1),([1,2,3],-2)]:
    x=torch.tensor([samples[str(d)][0] for d in digits],dtype=torch.float32).reshape(3,1,28,28)/255
    y=torch.tensor(digits,dtype=torch.long)
    with torch.no_grad():
        values=models['proposed'].encoder(x,y)[0].clamp_min(0).double().clamp_min(1e-4)
        a,b,c=values
        if abs(p)<1e-8:
            predicted=b*c/a
            domain=torch.ones(32,dtype=torch.bool)
        else:
            scale=values.max(0).values if p>0 else values.min(0).values
            rhs=-(a/scale).pow(p)+(b/scale).pow(p)+(c/scale).pow(p)
            domain=rhs>=0 if p>0 else rhs>0
            predicted=scale*(rhs.clamp_min(0) if p>0 else rhs.clamp_min(1e-30)).pow(1/p)
        valid=bool(domain.all() & torch.isfinite(predicted).all() & (predicted<100).all())
        predicted=torch.nan_to_num(predicted,nan=0.,posinf=100.,neginf=0.).clamp(0,100).float()
        proposed=models['proposed'].decoder(predicted[None])[0,0].numpy()
    fixtures.append({'digits':digits,'power':p,'valid':valid,'latent':predicted.tolist(),
                     'proposed':proposed.reshape(-1).tolist()})
(ROOT/'review/fixtures.json').write_text(json.dumps(fixtures))
(ROOT/'review/model_validation.json').write_text(json.dumps(report,indent=2))
mp.mp.dps=70
references=[]
for terms in itertools.combinations(range(10),4):
    a,b,c,d=map(mp.mpf,terms)
    def difference(p):
        def log_mean(x,y):
            if p==0:return mp.log(x*y)/2 if x*y else mp.ninf
            return mp.log((x**p+y**p)/2)/p
        return log_mean(a,d)-log_mean(b,c)
    if a*d==b*c: power=mp.mpf(0)
    else:
        if difference(mp.mpf(0))<0:
            lo,hi=mp.mpf(0),mp.mpf(1)
            while difference(hi)<0:hi*=2
        else:
            lo,hi=mp.mpf(-1),mp.mpf(0)
            while difference(lo)>0:lo*=2
        for i in range(180):
            mid=(lo+hi)/2
            if difference(mid)<0:lo=mid
            else:hi=mid
        power=(lo+hi)/2
    references.append({'values':terms,'power':float(power)})
(ROOT/'review/power_reference.json').write_text(json.dumps(references))

archive=ROOT/'onnxruntime-web-1.31.1.tgz'
vendor=OUT/'vendor'
vendor.mkdir(exist_ok=True)
with tarfile.open(archive) as tar:
    for file in ['dist/ort.wasm.min.js','dist/ort-wasm-simd-threaded.wasm',
                 'dist/ort-wasm-simd-threaded.mjs']:
        try:
            member=tar.extractfile('package/'+file)
            (vendor/Path(file).name).write_bytes(member.read())
        except KeyError:
            raise
for file in ('LICENSE','ThirdPartyNotices.txt'):
    shutil.copyfile(Path(ort.__file__).parent/file, vendor/file)
print(json.dumps(report,indent=2))

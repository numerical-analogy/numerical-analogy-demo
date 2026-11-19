# Numerical Analogy on Images

A browser-only demonstration of an analogy-solving VAE. Draw A, B and C, enter a
power and generate the fourth image. A separate calculator finds the power of
A : B :: C : D from four nonnegative numbers.

## Run locally

Use Python 3 (no packages needed):

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory dist
```

Open http://localhost:8765. On Windows, double-click `Start_Demo.cmd`.
Model files need HTTP, so opening `index.html` directly as a file will not work.
The server serves static files only. Handwriting and inference stay in the browser.

## Use

Draw one digit in each of the three canvases. The classifier estimates the input
labels automatically. Enter a finite power from -20 to 20 and select Solve.
The generated image appears beside the drawing area. The decoder receives no
target image or target digit label. If the latent solution is inadmissible, the
page reports this instead of showing a valid completion.

The calculator preserves the entered relation A : B :: C : D and solves
m_p(A,D) = m_p(B,C). It supports fractional and negative powers for positive inputs,
the geometric case at p=0, and nonnegative input values. Zero inputs use positive
powers or the geometric convention at zero; negative powers at zero are not used.
Multiple powers, absent finite solutions and infinite limiting cases are reported
explicitly. Select **Use this power** to transfer a unique result to the drawing
panel; the fourth calculator value is never passed to image inference.

## GitHub Pages

In **Settings > Pages > Source**, select **GitHub Actions**. The included workflow
publishes `dist/` on pushes to main. No build step, API key or inference backend is
needed. Relative asset paths support project sites.

The first download is approximately 44 MB. Only the proposed VAE and a digit
classifier are included. All runtime files are hosted with the page. No analytics,
external inference API or handwriting upload is used.

## Development validation

The original pretrained weights are exported without retraining or quantization.
Development checks compare browser WASM output against PyTorch on seven analogies,
and check the power calculator against 210 independent, 70-digit generalized-mean
solutions plus degenerate and invalid cases. Desktop and mobile interaction are
also exercised in Chrome.

To regenerate the model assets, use the original notebook project's `model.py`,
`models/current_power_nlg.pt`, `models/classifier.pt`, and MNIST test data:

```sh
pip install torch torchvision numpy onnx onnxruntime playwright mpmath
npm pack onnxruntime-web@1.31.1
python scripts/export_models.py --source /path/to/notebook/project
python scripts/browser_check.py
```

The original Python training environment is not required to run the website.
ONNX Runtime Web is pinned to 1.31.1, under the MIT license. Its copyright and
third-party notices are included in `dist/vendor/`; notice files were retained
from the installed ONNX Runtime Python package (1.32.0).

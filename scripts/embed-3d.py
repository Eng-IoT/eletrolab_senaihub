"""Embed the local 3D sources into the single-file offline app."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
target = root / 'dist/index.html'
text = target.read_text()
for name, suffix, start, end, anchor in [
    ('house3d', 'css', '/* BEGIN HOUSE3D CSS */', '/* END HOUSE3D CSS */', '</style>'),
    ('floor-ui', 'css', '/* BEGIN FLOOR CSS */', '/* END FLOOR CSS */', '</style>'),
    ('floor-core', 'js', '// BEGIN FLOOR CORE', '// END FLOOR CORE', 'let storageOK=true'),
    ('house3d', 'js', '// BEGIN HOUSE3D JS', '// END HOUSE3D JS', "window.addEventListener('beforeprint',preparePrint)"),
    ('floor-ui', 'js', '// BEGIN FLOOR UI', '// END FLOOR UI', "window.addEventListener('beforeprint',preparePrint)"),
]:
    content = (root / f'src/{name}.{suffix}').read_text().rstrip()
    replacement = f'{start}\n{content}\n{end}'
    pattern = re.escape(start) + r'[\s\S]*?' + re.escape(end)
    if re.search(pattern, text):
        text = re.sub(pattern, lambda _: replacement, text, count=1)
    else:
        if anchor not in text:
            raise RuntimeError(f'Missing embedding anchor for {name}')
        text = text.replace(anchor, replacement + '\n' + anchor, 1)
target.write_text(text)
print(f'Embedded CSS and WebGL source: {target.stat().st_size:,} bytes')

"""Builds index.html from src/ui.html and src/engine.js. Run: python3 tools/build.py"""
from pathlib import Path
root = Path(__file__).resolve().parent.parent
eng = (root / 'src/engine.js').read_text().replace("if (typeof module !== 'undefined') module.exports = { createFollower, norm };\n", '')
ui = (root / 'src/ui.html').read_text().replace('/*ENGINE*/', eng)
head = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>body{margin:0}[hidden]{display:none!important}</style>\n')
(root / 'index.html').write_text(head + ui.replace('<header', '</head><body>\n<header', 1) + '\n</body></html>\n')
print('built index.html')

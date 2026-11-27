#!/usr/bin/env python3
"""Builds the static PrimeMe AI website: wraps content/*.html with header and footer.

Run: python3 website/build.py  →  writes website/public/*.html (upload that folder to any static host).
Operator details come from website/operator.json (copy operator.example.json and fill it in). Missing
values stay visible as highlighted placeholders, and every page carries noindex until PUBLISH=1, so a
draft can't end up in search engines by accident.
"""
import html, json, os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'public')
op_file = os.path.join(ROOT, 'operator.json')
operator = json.load(open(op_file)) if os.path.exists(op_file) else {}
publish = os.environ.get('PUBLISH') == '1'

PAGES = [
    ('index', 'PrimeMe AI – Become your Prime.', ''),
    ('datenschutz', 'Datenschutzerklärung – PrimeMe AI', 'Datenschutz'),
    ('nutzungsbedingungen', 'Nutzungsbedingungen – PrimeMe AI', 'Nutzungsbedingungen'),
    ('abo', 'Abonnementbedingungen – PrimeMe AI', 'Abonnements'),
    ('gesundheit', 'Gesundheitliche Hinweise – PrimeMe AI', 'Gesundheit'),
    ('impressum', 'Impressum – PrimeMe AI', 'Impressum'),
    ('support', 'Support – PrimeMe AI', 'Support'),
]
NAV = ''.join(f'<a href="{p}.html">{label}</a>' for p, _, label in PAGES if label and p in ('support', 'datenschutz', 'impressum'))
FOOT = ''.join(f'<a href="{p}.html">{label}</a>' for p, _, label in PAGES if label)

def fill(text):
    def rep(m):
        key = m.group(1)
        val = operator.get(key, '').strip()
        return html.escape(val) if val else f'<span class="todo">[{key} – bitte ergänzen]</span>'
    return re.sub(r'\{\{([A-Z_]+)\}\}', rep, text)

os.makedirs(OUT, exist_ok=True)
shutil.copy(os.path.join(ROOT, 'style.css'), OUT)
shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(OUT, 'assets'), dirs_exist_ok=True)
for page, title, _ in PAGES:
    body = fill(open(os.path.join(ROOT, 'content', f'{page}.html'), encoding='utf-8').read())
    robots = '' if publish else '<meta name="robots" content="noindex, nofollow">'
    doc = f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{robots}
<title>{html.escape(title)}</title>
<link rel="stylesheet" href="style.css">
<link rel="icon" href="assets/prime-face.webp">
</head>
<body>
<header class="site"><a class="brand" href="index.html">PRIMEME AI</a><nav>{NAV}</nav></header>
<main>
{body}
</main>
<footer class="site"><span>© PrimeMe AI</span><nav>{FOOT}</nav></footer>
</body>
</html>
'''
    open(os.path.join(OUT, f'{page}.html'), 'w', encoding='utf-8').write(doc)
print(f'Built {len(PAGES)} pages into {OUT} ({"publish" if publish else "draft, noindex"}).')

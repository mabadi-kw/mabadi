#!/usr/bin/env python3
"""يبني files.json (قائمة ملفات التنزيل للعمل دون اتصال): data وpagetext من هذا المستودع،
وصور الصفحات pages من مستودع الصور المستقل mabadi-pages (نسخة بجانب هذا المستودع: ../mabadi-pages).
الاستعمال: python3 tools/files_json.py   (يُستدعى من tools/bump-version.sh)"""
import os, json, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
IMG = os.environ.get('MABADI_PAGES') or os.path.join(os.path.dirname(ROOT), 'mabadi-pages')
files = []
def walk(base, sub):
    for dp, _, fs in os.walk(os.path.join(base, sub)):
        for f in sorted(fs):
            if f == 'meta.json' and sub == 'pages': continue
            files.append({'p': os.path.relpath(os.path.join(dp, f), base).replace(os.sep, '/'), 's': os.path.getsize(os.path.join(dp, f))})
walk(ROOT, 'data'); walk(ROOT, 'pagetext')
if os.path.isdir(os.path.join(IMG, 'pages')): walk(IMG, 'pages')
elif os.path.isdir(os.path.join(ROOT, 'pages')): walk(ROOT, 'pages')
else: print('تنبيه: لا مجلد صور (../mabadi-pages/pages)؛ files.json بلا صور', file=sys.stderr)
files.sort(key=lambda x: x['p'])
json.dump({'bytes': sum(f['s'] for f in files), 'files': files}, open(os.path.join(ROOT, 'files.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('files.json:', len(files), 'ملفًا', round(sum(f['s'] for f in files) / 1e6), 'م.ب', file=sys.stderr)

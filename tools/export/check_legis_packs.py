#!/usr/bin/env python3
"""فحص حزم التشريعات: كل فقرة في الحزم موجودة حرفيًا في بيانات المكتبة، والأعداد والمعرّفات سليمة."""
import json, os, glob, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
L = os.path.join(ROOT, 'data', 'laws'); O = os.path.join(ROOT, 'packs', 'legis')
idx = json.load(open(os.path.join(L, 'index.json')))['laws']
src = set()
for x in idx:
    d = json.load(open(os.path.join(L, x['id'] + '.json')))
    for a in d['articles']:
        src.update(a['paras'])
        src.update(a.get('notes') or [])
    src.update(d.get('preamble') or []); src.update(d.get('signature') or [])
bad = 0; ok = 0; ids = set(); n = 0
def chk(where, paras):
    global bad, ok
    for p in paras or []:
        if p in src: ok += 1
        else: bad += 1; print('✘ نص غير موجود في المصدر:', where, p[:80])
I = json.load(open(glob.glob(os.path.join(O, 'mabadi-legis-index_v*.json'))[0]))
for f in sorted(glob.glob(os.path.join(O, 'mabadi-legis_*.json'))):
    P = json.load(open(f))
    for X in P['legislations']:
        assert X['id'] not in ids, X['id']; ids.add(X['id'])
        chk(X['id'] + ' preamble', X['preamble']); chk(X['id'] + ' signature', X['signature'])
        aids = set()
        for a in X['articles']:
            n += 1; assert a['id'] not in aids, a['id']; aids.add(a['id'])
            chk(a['id'], a['text_in_force']); chk(a['id'] + ' original', a['original_text']); chk(a['id'] + ' notes', a['edition_notes'])
            for m in a['amendments']: chk(a['id'] + ' amendment', m['published_text']); chk(a['id'] + ' clause', [m['enacting_clause']] if m.get('enacting_clause') else [])
            if a['text_in_force'] is None and a['status'] not in ('ملغاة',): assert a['needs_review'], a['id']
            if a['status'] == 'ملغاة': assert a['text_in_force'] is None, a['id']
c = I['counts']
print(f"الفقرات المطابقة للمصدر: {ok} — غير المطابقة: {bad}")
print(f"التشريعات: {len(ids)} (قوانين {c['laws']}، لوائح ومراسيم وقرارات {c['regulations']}) — المواد: {n}")
assert len(ids) == c['legislations'] == len(idx) and n == c['articles']
assert {r['id'] for r in I['legislations']} == ids
sys.exit(1 if bad else 0)

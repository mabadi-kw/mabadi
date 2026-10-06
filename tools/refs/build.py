"""المعرّف الثابت لكل مبدأ: مبني على الحكم لا على الكتاب.
الصيغة: <رقم الطعن>-<سنته>-<رمز الدائرة>/<ترتيب المبدأ في الحكم>   مثل 523-2020-L/1
رموز الدوائر (لاتينية حتى لا يتشوّه الرابط عند نسخه): انظر CH أدناه.
السجل tools/refs/registry.json يُلحَق به ولا يُعاد ترقيم ما سبق أبدًا:
 - المبدأ الذي له معرّف يبقى عليه.
 - المبدأ المكرر (dups.json) من الحكم نفسه يأخذ معرّف قرينه.
 - المبدأ الذي حُذف لوروده في موضع آخر (alias.json) ينقل معرّفه إلى الموضع الباقي.
 - الجديد يأخذ الرقم التالي في حكمه.
المخرج للتطبيق data/ref.json: {"v":1,"cols":{"<المجموعة>":["<المعرّف>" أو "" ...بترتيب ملف المجموعة]}}
"""
import json, os, re, sys, collections
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(ROOT, 'data'); REG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'registry.json')
CH = {'تجاري': 'C', 'مدني': 'V', 'جزائي': 'P', 'عمالي': 'L', 'أحوال شخصية': 'F', 'إداري': 'A',
      'طلبات رجال القضاء': 'J', 'تظلمات': 'G', 'هيئة عامة': 'H'}
KRE = re.compile(r'^(\d+)/(\d{4})')
def base_of(p):
    for c in p['c']:
        k = c.get('k') or ''
        m = KRE.match(k)
        if m: return f"{int(m.group(1))}-{m.group(2)}-{CH.get(c.get('ch'), 'X')}"
    return None
def main():
    m = json.load(open(os.path.join(D, 'meta.json')))
    cols = {c: json.load(open(os.path.join(D, c + '.json'))) for c in m['order']}
    PR = [p for c in m['order'] for p in cols[c]]; BY = {p['id']: p for p in PR}
    reg = json.load(open(REG)) if os.path.exists(REG) else {}
    old_n = len(reg)
    dups = json.load(open(os.path.join(D, 'dups.json'))) if os.path.exists(os.path.join(D, 'dups.json')) else []
    grp = {i: g for g in dups for i in g}
    alias = json.load(open(os.path.join(D, 'alias.json'))) if os.path.exists(os.path.join(D, 'alias.json')) else {}
    for a, t in alias.items():             # المحذوف ينقل معرّفه إلى الباقي
        if a in reg and t not in reg: reg[t] = reg[a]
    used = collections.defaultdict(set)
    for r in reg.values():
        b, n = r.rsplit('/', 1); used[b].add(int(n))
    new = 0
    for p in PR:
        if p['id'] in reg: continue
        b = base_of(p)
        if not b: continue
        mate = next((reg[i] for i in grp.get(p['id'], []) if i in reg and reg[i].rsplit('/', 1)[0] == b), None)
        if mate: reg[p['id']] = mate; continue
        n = max(used[b], default=0) + 1; used[b].add(n); reg[p['id']] = f'{b}/{n}'; new += 1
    json.dump(reg, open(REG, 'w'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    out = {'v': 1, 'about': 'المعرّف الثابت لكل مبدأ بترتيب ملف مجموعته — tools/refs/build.py', 'cols': {c: [reg.get(p['id'], '') for p in cols[c]] for c in m['order']}}
    json.dump(out, open(os.path.join(D, 'ref.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    have = sum(1 for p in PR if p['id'] in reg); bases = len({r.rsplit('/', 1)[0] for r in reg.values()})
    print(f'السجل: {old_n} → {len(reg)} (جديد {new}) · لها معرّف {have}/{len(PR)} · أحكام {bases}')
if __name__ == '__main__': main()

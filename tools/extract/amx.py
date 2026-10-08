#!/usr/bin/env python3
"""مرجع صيغة AMX1 (مطابق لأداة amx-tool.html):
  'AMX1' | key_id:1 | iterations:uint32 BE | salt:16 | iv:12 | AES-GCM-256( gzip( JSON UTF-8 ) )
  المفتاح: PBKDF2-SHA256(الرمز بصيغة NFC، الملح، الدورات) → 32 بايت.
amx.py dec <file.amx>            يطلب الرمز ويطبع الأعداد (للتحقق)
amx.py enc <plain.json> <out.amx> يطلب الرمز (للاختبار فقط؛ الأصل أن يُشفَّر على جهاز المستخدم)"""
import sys, os, json, gzip, struct, getpass, unicodedata
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
def _key(p, salt, it):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=it).derive(unicodedata.normalize('NFC', p).encode())
def encrypt(obj, p, it=600000, key_id=1):
    salt, iv = os.urandom(16), os.urandom(12)
    ct = AESGCM(_key(p, salt, it)).encrypt(iv, gzip.compress(json.dumps(obj, ensure_ascii=False).encode()), None)
    return b'AMX1' + bytes([key_id]) + struct.pack('>I', it) + salt + iv + ct
def decrypt(b, p):
    assert b[:4] == b'AMX1', 'ليس ملف AMX1'
    it = struct.unpack('>I', b[5:9])[0]; salt, iv = b[9:25], b[25:37]
    return json.loads(gzip.decompress(AESGCM(_key(p, salt, it)).decrypt(iv, b[37:], None)))
if __name__ == '__main__':
    if sys.argv[1] == 'dec':
        d = decrypt(open(sys.argv[2], 'rb').read(), os.environ.get('AMX_PASS') or getpass.getpass('الرمز: ')); print(d.get('pack'), d.get('counts'))
    elif sys.argv[1] == 'enc':
        open(sys.argv[3], 'wb').write(encrypt(json.load(open(sys.argv[2], encoding='utf-8')), os.environ.get('AMX_PASS') or getpass.getpass('الرمز: ')))

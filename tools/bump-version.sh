#!/bin/sh
# يحدّث رقم الإصدار في app.js (APP_BUILD) وsw.js (VERSION) معًا بتاريخ ووقت الكويت. الاستعمال: sh tools/bump-version.sh
set -e
cd "$(dirname "$0")/.."
# حارس الخصوصية: لا يصدر إصدار فيه ما يشبه بيانًا شخصيًا
python3 tools/privacy/test_privacy.py >/dev/null || { echo "✘ اختبار محرك الخصوصية فشل — أوقف النشر"; exit 1; }
python3 tools/privacy/guard.py --selftest >/dev/null || { echo "✘ اختبار الحارس فشل — أوقف النشر"; exit 1; }
python3 tools/privacy/guard.py || { echo "✘ حارس الخصوصية منع النشر"; exit 1; }
V=$(TZ=Asia/Kuwait date +%Y%m%d%H%M)
sed -i "s/const APP_BUILD='[0-9]*'/const APP_BUILD='$V'/" app.js
sed -i "s/const VERSION='[0-9]*'/const VERSION='$V'/" sw.js
echo "الإصدار: $V"
printf '{"build":"%s"}\n' "$V" > version.json
# مدخل «ما الجديد» المعلَّق ببناء "next" يأخذ رقم هذا الإصدار
[ -f changes.json ] && sed -i "s/\"build\": *\"next\"/\"build\":\"$V\"/" changes.json || true

#!/bin/sh
# يحدّث رقم الإصدار في app.js (APP_BUILD) وsw.js (VERSION) معًا بتاريخ ووقت الكويت. الاستعمال: sh tools/bump-version.sh
set -e
cd "$(dirname "$0")/.."
V=$(TZ=Asia/Kuwait date +%Y%m%d%H%M)
sed -i "s/const APP_BUILD='[0-9]*'/const APP_BUILD='$V'/" app.js
sed -i "s/const VERSION='[0-9]*'/const VERSION='$V'/" sw.js
echo "الإصدار: $V"
printf '{"build":"%s"}\n' "$V" > version.json
# مدخل «ما الجديد» المعلَّق ببناء "next" يأخذ رقم هذا الإصدار
[ -f changes.json ] && sed -i "s/\"build\":\"next\"/\"build\":\"$V\"/" changes.json || true

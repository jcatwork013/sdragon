#!/usr/bin/env bash
# Kiểm tra các bản đóng gói có CÙNG một mã game hay không.
# Chạy:  npm run verify
#
# Khác biệt DUY NHẤT được phép: index.html của bản đóng gói bỏ 3 dòng đăng ký
# service worker (app đã cài thì không cần) — do dev/www.mjs cố ý cắt.
set -u
cd "$(dirname "$0")/.."
ok=0; bad=0
h() { cat "$@" 2>/dev/null | shasum -a 256 | cut -c1-16; }
code() { ( cd "$1" 2>/dev/null && cat $(find js -name '*.js' | sort) $(find css -name '*.css' | sort) 2>/dev/null | shasum -a 256 | cut -c1-16 ); }

SRC=$(code .)
printf '%-24s %s\n' "Mã nguồn" "$SRC"

check() {  # check <nhãn> <thư mục đã giải nén>
  local got; got=$(code "$2")
  if [ "$got" = "$SRC" ]; then printf '%-24s %s  ✓ khớp\n' "$1" "$got"; ok=$((ok+1))
  else printf '%-24s %s  ✗ LỆCH\n' "$1" "${got:-—}"; bad=$((bad+1)); fi
}

T=$(mktemp -d)
ROOT=$(pwd)
APKFILE=$(ls "$ROOT"/dist/*.apk 2>/dev/null | head -1)
if [ -n "$APKFILE" ]; then
  mkdir -p "$T/apk"
  ( cd "$T/apk" && unzip -q "$APKFILE" 'assets/public/*' )
  check "APK" "$T/apk/assets/public"
fi
for pair in "macOS|dist/mac-arm64/SDrakon.app/Contents/Resources/app.asar" \
            "Windows|dist/win-unpacked/resources/app.asar"; do
  label=${pair%%|*}; asar=${pair##*|}
  if [ -f "$asar" ]; then
    npx --yes asar extract "$asar" "$T/${label}" >/dev/null 2>&1
    check "$label" "$T/${label}"
  fi
done
rm -rf "$T"
echo
[ $bad -eq 0 ] && echo "✅ $ok bản đóng gói dùng CÙNG một mã game." || echo "❌ $bad bản LỆCH mã — dựng lại trước khi phát hành."
exit $bad

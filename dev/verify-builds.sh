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
# Lấy đúng bản APK của phiên bản ĐANG dựng. Trước đây lấy file .apk đầu tiên
# theo thứ tự tên, nên khi dist/ còn bản cũ thì hoá ra đi so bản cũ với mã mới
# rồi báo LỆCH — báo động giả.
# Tên sản phẩm đọc từ package.json, KHÔNG đóng đinh. Đổi tên game một lần là
# script này bốc nhầm gói của bản cũ rồi báo LỆCH — báo động giả, mà lại đúng
# vào lúc cần tin nó nhất.
VER=$(node -p "require('$ROOT/package.json').version")
PROD=$(node -p "require('$ROOT/package.json').build.productName")
APKFILE="$ROOT/dist/$PROD-$VER.apk"
[ -f "$APKFILE" ] || { echo "  ! không thấy $PROD-$VER.apk trong dist/"; APKFILE=""; }
if [ -n "$APKFILE" ]; then
  mkdir -p "$T/apk"
  ( cd "$T/apk" && unzip -q "$APKFILE" 'assets/public/*' )
  check "APK" "$T/apk/assets/public"
fi
for pair in "macOS|dist/mac-arm64/$PROD.app/Contents/Resources/app.asar" \
            "Windows|dist/win-unpacked/resources/app.asar" \
            "Linux|dist/linux-unpacked/resources/app.asar"; do
  label=${pair%%|*}; asar=${pair##*|}
  if [ -f "$asar" ]; then
    :
  else
    printf '%-24s %s  ! không thấy %s\n' "$label" "—" "$asar"; bad=$((bad+1))
  fi
  if [ -f "$asar" ]; then
    npx --yes asar extract "$asar" "$T/${label}" >/dev/null 2>&1
    check "$label" "$T/${label}"
  fi
done
rm -rf "$T"
echo
[ $bad -eq 0 ] && echo "✅ $ok bản đóng gói dùng CÙNG một mã game." || echo "❌ $bad bản LỆCH mã — dựng lại trước khi phát hành."
exit $bad

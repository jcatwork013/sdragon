package com.sdrakon.game;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Toàn màn hình thật sự.
 *
 * Theme AppTheme.NoActionBar đã bật `windowFullscreen` + `windowLayoutIn-
 * DisplayCutoutMode=shortEdges`, nhưng `windowFullscreen` CHỈ ẩn thanh trạng
 * thái — thanh điều hướng (3 nút, hoặc vạch vuốt) vẫn chiếm chỗ. Muốn ẩn nốt
 * thì phải gọi tay qua WindowInsetsController.
 *
 * Dùng BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE: vuốt mép là thanh hiện tạm rồi
 * tự ẩn lại, người chơi không bao giờ bị kẹt.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        goImmersive();
    }

    /** Hệ thống trả lại thanh sau khi vuốt / gập máy / chuyển app → ẩn lại. */
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goImmersive();
    }

    private void goImmersive() {
        // false = tự lo phần chừa lề hệ thống. Web đọc env(safe-area-inset-*)
        // rồi chỉ đẩy dải giao diện vào trong, tranh nền vẫn tràn ra tận mép.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
}

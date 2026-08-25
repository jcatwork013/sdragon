import UIKit
import Capacitor
import AVFoundation

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    func sceneWillResignActive(_ scene: UIScene) {
        notifyWeb(event: "cricko:suspend")
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Sau cuộc gọi, WKWebView đôi khi báo AudioContext "running" nhưng
        // AVAudioSession vẫn mất route. Kích hoạt lại session trước, rồi báo JS
        // chạy chu kỳ suspend/resume và nối lại scheduler của bài hiện tại.
        let audio = AVAudioSession.sharedInstance()
        try? audio.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        try? audio.setActive(true)
        notifyWeb(event: "cricko:resume")
    }

    private func notifyWeb(event: String) {
        guard let controller = window?.rootViewController as? CAPBridgeViewController,
              let webView = controller.bridge?.webView else { return }
        webView.evaluateJavaScript("window.dispatchEvent(new Event('\(event)'))")
    }
}

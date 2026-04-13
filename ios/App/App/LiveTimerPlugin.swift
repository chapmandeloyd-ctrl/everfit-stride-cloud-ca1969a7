import Foundation
import Capacitor
import ActivityKit

// MARK: - Shared data model for the Live Activity

struct TimerActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var seconds: Int
        var isPaused: Bool
        var title: String
        var subtitle: String
    }

    var activityType: String
    var mode: String          // "countUp" or "countDown"
    var accentColor: String
    var icon: String
}

// MARK: - Capacitor Plugin

@objc(LiveTimerPlugin)
public class LiveTimerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveTimerPlugin"
    public let jsName = "LiveTimer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isRunning", returnType: CAPPluginReturnPromise),
    ]

    private var currentActivity: Any? = nil // Activity<TimerActivityAttributes>

    // MARK: start

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are not enabled by the user")
            return
        }

        let activityType = call.getString("activityType") ?? "workout"
        let title = call.getString("title") ?? "Activity"
        let subtitle = call.getString("subtitle") ?? ""
        let mode = call.getString("mode") ?? "countUp"
        let seconds = call.getInt("seconds") ?? 0
        let accentColor = call.getString("accentColor") ?? "#7C3AED"
        let icon = call.getString("icon") ?? "flame.fill"

        let attributes = TimerActivityAttributes(
            activityType: activityType,
            mode: mode,
            accentColor: accentColor,
            icon: icon
        )

        let state = TimerActivityAttributes.ContentState(
            seconds: seconds,
            isPaused: false,
            title: title,
            subtitle: subtitle
        )

        do {
            let content = ActivityContent(state: state, staleDate: nil)
            let activity = try Activity.request(
                attributes: attributes,
                content: content,
                pushType: nil
            )
            currentActivity = activity
            call.resolve(["activityId": activity.id])
        } catch {
            call.reject("Failed to start Live Activity: \(error.localizedDescription)")
        }
    }

    // MARK: update

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }

        guard let activity = currentActivity as? Activity<TimerActivityAttributes> else {
            call.reject("No active Live Activity")
            return
        }

        let current = activity.content.state
        let seconds = call.getInt("seconds") ?? current.seconds
        let title = call.getString("title") ?? current.title
        let subtitle = call.getString("subtitle") ?? current.subtitle
        let isPaused = call.getBool("isPaused") ?? current.isPaused

        let newState = TimerActivityAttributes.ContentState(
            seconds: seconds,
            isPaused: isPaused,
            title: title,
            subtitle: subtitle
        )

        Task {
            let content = ActivityContent(state: newState, staleDate: nil)
            await activity.update(content)
            call.resolve()
        }
    }

    // MARK: stop

    @objc func stop(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }

        guard let activity = currentActivity as? Activity<TimerActivityAttributes> else {
            call.resolve()
            return
        }

        Task {
            let finalState = activity.content.state
            let content = ActivityContent(state: finalState, staleDate: nil)
            await activity.end(content, dismissalPolicy: .immediate)
            currentActivity = nil
            call.resolve()
        }
    }

    // MARK: isRunning

    @objc func isRunning(_ call: CAPPluginCall) {
        let running = currentActivity != nil
        call.resolve(["running": running])
    }
}

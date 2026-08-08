import WidgetKit
import SwiftUI
import ActivityKit

// MARK: - Lock Screen Live Activity Widget

struct TimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerActivityAttributes.self) { context in
            // LOCK SCREEN banner
            LockScreenTimerView(context: context)
                .padding(16)
                .activityBackgroundTint(Color.black.opacity(0.85))
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded view
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: iconName(for: context.attributes.activityType))
                        .font(.title2)
                        .foregroundColor(Color(hex: context.attributes.accentColor))
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 2) {
                        Text(context.state.title)
                            .font(.headline)
                            .foregroundColor(.white)
                        Text(context.state.subtitle)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(formatTime(context.state.seconds))
                        .font(.system(.title2, design: .monospaced))
                        .foregroundColor(Color(hex: context.attributes.accentColor))
                }
            } compactLeading: {
                Image(systemName: iconName(for: context.attributes.activityType))
                    .foregroundColor(Color(hex: context.attributes.accentColor))
            } compactTrailing: {
                Text(formatTime(context.state.seconds))
                    .font(.system(.caption, design: .monospaced))
                    .foregroundColor(Color(hex: context.attributes.accentColor))
            } minimal: {
                Image(systemName: iconName(for: context.attributes.activityType))
                    .foregroundColor(Color(hex: context.attributes.accentColor))
            }
        }
    }
}

// MARK: - Lock Screen Banner View

struct LockScreenTimerView: View {
    let context: ActivityViewContext<TimerActivityAttributes>

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: iconName(for: context.attributes.activityType))
                .font(.title)
                .foregroundColor(Color(hex: context.attributes.accentColor))
                .frame(width: 44, height: 44)
                .background(Color(hex: context.attributes.accentColor).opacity(0.2))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            // Title + subtitle
            VStack(alignment: .leading, spacing: 2) {
                Text(context.state.title)
                    .font(.headline)
                    .foregroundColor(.white)
                    .lineLimit(1)
                Text(context.state.subtitle)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                    .lineLimit(1)
            }

            Spacer()

            // Timer
            VStack(alignment: .trailing, spacing: 2) {
                Text(formatTime(context.state.seconds))
                    .font(.system(.title2, design: .monospaced))
                    .foregroundColor(Color(hex: context.attributes.accentColor))
                if context.state.isPaused {
                    Text("PAUSED")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.orange)
                }
            }
        }
    }
}

// MARK: - Helpers

func iconName(for activityType: String) -> String {
    switch activityType {
    case "workout":  return "figure.strengthtraining.traditional"
    case "fasting":  return "fork.knife.circle"
    case "cardio":   return "figure.run"
    case "breathing": return "wind"
    case "rest":     return "bed.double"
    default:         return "flame.fill"
    }
}

func formatTime(_ totalSeconds: Int) -> String {
    let hrs = totalSeconds / 3600
    let mins = (totalSeconds % 3600) / 60
    let secs = totalSeconds % 60
    if hrs > 0 {
        return String(format: "%d:%02d:%02d", hrs, mins, secs)
    }
    return String(format: "%d:%02d", mins, secs)
}

// MARK: - Color hex extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            r = 1; g = 1; b = 1
        }
        self.init(red: r, green: g, blue: b)
    }
}

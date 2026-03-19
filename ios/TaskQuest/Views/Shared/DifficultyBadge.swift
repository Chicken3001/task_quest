import SwiftUI

struct DifficultyBadge: View {
    let difficulty: Difficulty

    var body: some View {
        Text(difficulty.rawValue.capitalized)
            .font(.caption2.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(XP.color(for: difficulty).opacity(0.2))
            .foregroundStyle(XP.color(for: difficulty))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(XP.color(for: difficulty).opacity(0.3), lineWidth: 1)
            )
    }
}

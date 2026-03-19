import SwiftUI

enum XP {
    static let rewards: [Difficulty: Int] = [
        .easy: 10,
        .medium: 25,
        .hard: 50,
        .epic: 100,
    ]

    static let timeEstimates: [Difficulty: String] = [
        .easy: "~30 min",
        .medium: "1-3 hrs",
        .hard: "4-8 hrs",
        .epic: "Multi-day",
    ]

    static func color(for difficulty: Difficulty) -> Color {
        switch difficulty {
        case .easy: .easyGreen
        case .medium: .mediumYellow
        case .hard: .hardOrange
        case .epic: .epicRed
        }
    }

    static func getLevel(xp: Int) -> Int {
        Int(floor(sqrt(Double(xp) / 50.0))) + 1
    }

    static func getXpForLevel(_ level: Int) -> Int {
        (level - 1) * (level - 1) * 50
    }

    static func getLevelProgress(xp: Int) -> (level: Int, currentLevelXp: Int, nextLevelXp: Int, progress: Double) {
        let level = getLevel(xp: xp)
        let currentLevelXp = getXpForLevel(level)
        let nextLevelXp = getXpForLevel(level + 1)
        let progress = Double(xp - currentLevelXp) / Double(nextLevelXp - currentLevelXp)
        return (level, currentLevelXp, nextLevelXp, progress)
    }
}

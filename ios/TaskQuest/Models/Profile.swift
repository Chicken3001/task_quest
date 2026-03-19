import Foundation

struct Profile: Codable, Identifiable, Sendable {
    let id: String
    var username: String
    var xp: Int
    var level: Int
    var currentStreak: Int
    var longestStreak: Int
    var lastCompletedDate: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, username, xp, level
        case currentStreak = "current_streak"
        case longestStreak = "longest_streak"
        case lastCompletedDate = "last_completed_date"
        case createdAt = "created_at"
    }
}

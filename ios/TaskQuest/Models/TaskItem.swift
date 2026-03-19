import Foundation

struct TaskItem: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let questId: String?
    let title: String
    let description: String?
    let difficulty: Difficulty
    let xpReward: Int
    var status: ItemStatus
    var notes: String?
    let position: Int
    let createdAt: String
    var completedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, difficulty, status, notes, position
        case userId = "user_id"
        case questId = "quest_id"
        case xpReward = "xp_reward"
        case createdAt = "created_at"
        case completedAt = "completed_at"
    }
}

enum Difficulty: String, Codable, CaseIterable, Sendable {
    case easy, medium, hard, epic
}

enum ItemStatus: String, Codable, Sendable {
    case active, completed
}

import Foundation

struct Quest: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let epicId: String?
    let name: String
    let description: String?
    let planSummary: String?
    var status: ItemStatus
    let position: Int
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, name, description, status, position
        case userId = "user_id"
        case epicId = "epic_id"
        case planSummary = "plan_summary"
        case createdAt = "created_at"
    }
}

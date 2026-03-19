import Foundation

struct Epic: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let name: String
    let description: String?
    let planSummary: String?
    var status: ItemStatus
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, name, description, status
        case userId = "user_id"
        case planSummary = "plan_summary"
        case createdAt = "created_at"
    }
}

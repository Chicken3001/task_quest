import Foundation

struct ChatMessage: Codable, Identifiable, Sendable {
    let id: UUID
    let role: ChatRole
    let content: String
    var suggestedResponses: [String]?

    init(role: ChatRole, content: String, suggestedResponses: [String]? = nil) {
        self.id = UUID()
        self.role = role
        self.content = content
        self.suggestedResponses = suggestedResponses
    }

    enum CodingKeys: String, CodingKey {
        case role, content, suggestedResponses
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.role = try container.decode(ChatRole.self, forKey: .role)
        self.content = try container.decode(String.self, forKey: .content)
        self.suggestedResponses = try container.decodeIfPresent([String].self, forKey: .suggestedResponses)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(role, forKey: .role)
        try container.encode(content, forKey: .content)
    }
}

enum ChatRole: String, Codable, Sendable {
    case user, assistant
}

struct ChatResponse: Codable, Sendable {
    let message: String
    let suggestedResponses: [String]
    let readyToGenerate: Bool
}

struct GeneratedTask: Codable, Sendable {
    let title: String
    let description: String
    let difficulty: Difficulty
}

struct GeneratedQuest: Codable, Sendable {
    let name: String
    let description: String
    let planSummary: String?
    let tasks: [GeneratedTask]

    enum CodingKeys: String, CodingKey {
        case name, description, tasks
        case planSummary = "plan_summary"
    }
}

struct GeneratedEpic: Codable, Sendable {
    let name: String
    let description: String
    let planSummary: String?
    let quests: [GeneratedQuest]

    enum CodingKeys: String, CodingKey {
        case name, description, quests
        case planSummary = "plan_summary"
    }
}

struct GenerateQuestResponse: Codable, Sendable {
    let quest: GeneratedQuest
}

struct GenerateEpicResponse: Codable, Sendable {
    let epic: GeneratedEpic
}

struct TaskChatResponse: Codable, Sendable {
    let message: String
}

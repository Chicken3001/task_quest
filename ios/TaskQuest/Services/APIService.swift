import Foundation

enum APIService {
    static func chatWithPlanner(messages: [ChatMessage], mode: String, includePersonalInfo: Bool = false) async throws -> ChatResponse {
        let token = try await AuthService.shared.getAccessToken()

        struct RequestBody: Encodable {
            let messages: [[String: String]]
            let mode: String
            let includePersonalInfo: Bool
        }

        let body = RequestBody(
            messages: messages.map { ["role": $0.role.rawValue, "content": $0.content] },
            mode: mode,
            includePersonalInfo: includePersonalInfo
        )

        var request = URLRequest(url: URL(string: "\(Config.apiBaseURL)/api/quests/chat")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            let errorBody = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError.serverError(errorBody?["error"] ?? "Request failed")
        }

        return try JSONDecoder().decode(ChatResponse.self, from: data)
    }

    static func generatePlan(messages: [ChatMessage], mode: String, includePersonalInfo: Bool = false) async throws -> (quest: GeneratedQuest?, epic: GeneratedEpic?) {
        let token = try await AuthService.shared.getAccessToken()

        struct RequestBody: Encodable {
            let messages: [[String: String]]
            let mode: String
            let includePersonalInfo: Bool
        }

        let body = RequestBody(
            messages: messages.map { ["role": $0.role.rawValue, "content": $0.content] },
            mode: mode,
            includePersonalInfo: includePersonalInfo
        )

        var request = URLRequest(url: URL(string: "\(Config.apiBaseURL)/api/quests/generate")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            let errorBody = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError.serverError(errorBody?["error"] ?? "Failed to generate plan")
        }

        if mode == "quest" {
            let result = try JSONDecoder().decode(GenerateQuestResponse.self, from: data)
            return (quest: result.quest, epic: nil)
        } else {
            let result = try JSONDecoder().decode(GenerateEpicResponse.self, from: data)
            return (quest: nil, epic: result.epic)
        }
    }

    static func taskChat(messages: [ChatMessage], context: TaskChatContext) async throws -> String {
        let token = try await AuthService.shared.getAccessToken()

        struct RequestBody: Encodable {
            let messages: [[String: String]]
            let context: TaskChatContext
        }

        let body = RequestBody(
            messages: messages.map { ["role": $0.role.rawValue, "content": $0.content] },
            context: context
        )

        var request = URLRequest(url: URL(string: "\(Config.apiBaseURL)/api/quests/task-chat")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            let errorBody = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError.serverError(errorBody?["error"] ?? "Failed to get response")
        }

        let result = try JSONDecoder().decode(TaskChatResponse.self, from: data)
        return result.message
    }

    static func researchTask(taskId: String, context: TaskChatContext) async throws -> ResearchResponse {
        let token = try await AuthService.shared.getAccessToken()

        struct RequestBody: Encodable {
            let taskId: String
            let context: TaskChatContext
        }

        let body = RequestBody(taskId: taskId, context: context)

        var request = URLRequest(url: URL(string: "\(Config.apiBaseURL)/api/quests/research")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)
        request.timeoutInterval = 60

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            let errorBody = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError.serverError(errorBody?["error"] ?? "Research failed")
        }

        return try JSONDecoder().decode(ResearchResponse.self, from: data)
    }

    static func getAISettings() async throws -> AISettingsResponse {
        let token = try await AuthService.shared.getAccessToken()

        var request = URLRequest(url: URL(string: "\(Config.apiBaseURL)/api/ai-settings")!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            let errorBody = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError.serverError(errorBody?["error"] ?? "Failed to load AI settings")
        }

        return try JSONDecoder().decode(AISettingsResponse.self, from: data)
    }

    static func updateAPIKey(_ key: String?) async throws {
        let token = try await AuthService.shared.getAccessToken()

        struct RequestBody: Encodable {
            let geminiApiKey: String?
        }

        var request = URLRequest(url: URL(string: "\(Config.apiBaseURL)/api/ai-settings")!)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(RequestBody(geminiApiKey: key))

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            let errorBody = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError.serverError(errorBody?["error"] ?? "Failed to update API key")
        }
    }
}

struct AISettingsResponse: Codable, Sendable {
    let hasApiKey: Bool
    let dailyUsage: Int
    let dailyLimit: Int
    let researchCredits: Int?
}

struct ResearchResponse: Codable, Sendable {
    let result: String
    let creditsRemaining: Int
}

struct TaskChatContext: Encodable, Sendable {
    let taskTitle: String
    let taskDescription: String?
    let difficulty: String
    let questName: String?
    let questDescription: String?
    let planSummary: String?
}

enum APIError: LocalizedError {
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .serverError(let message): message
        }
    }
}

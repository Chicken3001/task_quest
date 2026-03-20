import Foundation
import Observation

@MainActor
@Observable
final class QuestPlannerViewModel {
    enum PlannerState {
        case chatting
        case generating
        case preview
    }

    var state: PlannerState = .chatting
    var mode: String = "quest" // "quest" or "epic"
    var messages: [ChatMessage] = []
    var isTyping = false
    var readyToGenerate = false
    var generatedQuest: GeneratedQuest?
    var generatedEpic: GeneratedEpic?
    var errorMessage: String?
    var includePersonalInfo = false
    var hasPersonalInfo = false

    func checkPersonalInfo() async {
        hasPersonalInfo = DataService.shared.profile?.personalInfo != nil
            && !(DataService.shared.profile?.personalInfo?.isEmpty ?? true)
    }

    func startConversation() async {
        guard messages.isEmpty else { return }
        isTyping = true

        do {
            let response = try await APIService.chatWithPlanner(
                messages: [ChatMessage(role: .user, content: "Hello")],
                mode: mode,
                includePersonalInfo: includePersonalInfo
            )
            messages.append(ChatMessage(
                role: .assistant,
                content: response.message,
                suggestedResponses: response.suggestedResponses
            ))
            readyToGenerate = response.readyToGenerate
        } catch {
            errorMessage = error.localizedDescription
        }

        isTyping = false
    }

    func sendMessage(_ content: String) async {
        messages.append(ChatMessage(role: .user, content: content))
        isTyping = true
        errorMessage = nil

        do {
            let response = try await APIService.chatWithPlanner(messages: messages, mode: mode, includePersonalInfo: includePersonalInfo)
            messages.append(ChatMessage(
                role: .assistant,
                content: response.message,
                suggestedResponses: response.suggestedResponses
            ))
            readyToGenerate = response.readyToGenerate
        } catch {
            errorMessage = error.localizedDescription
        }

        isTyping = false
    }

    func generatePlan() async {
        state = .generating
        errorMessage = nil

        do {
            let result = try await APIService.generatePlan(messages: messages, mode: mode, includePersonalInfo: includePersonalInfo)
            generatedQuest = result.quest
            generatedEpic = result.epic
            state = .preview
        } catch {
            errorMessage = error.localizedDescription
            state = .chatting
        }
    }

    func createPlan() async throws {
        if let quest = generatedQuest {
            try await DataService.shared.createQuestWithTasks(quest)
        } else if let epic = generatedEpic {
            try await DataService.shared.createEpicWithQuestsAndTasks(epic)
        }
    }

    func reset() {
        state = .chatting
        messages = []
        isTyping = false
        readyToGenerate = false
        generatedQuest = nil
        generatedEpic = nil
        errorMessage = nil
        includePersonalInfo = false
    }
}

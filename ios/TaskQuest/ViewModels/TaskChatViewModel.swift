import Foundation
import Observation

@MainActor
@Observable
final class TaskChatViewModel {
    var messages: [ChatMessage] = []
    var isTyping = false
    var errorMessage: String?
    var notes: String = ""
    var isSavingNotes = false

    let task: TaskItem
    let quest: Quest?
    let planSummary: String?

    init(task: TaskItem, quest: Quest?, planSummary: String?) {
        self.task = task
        self.quest = quest
        self.planSummary = planSummary
        self.notes = task.notes ?? ""
    }

    private var context: TaskChatContext {
        TaskChatContext(
            taskTitle: task.title,
            taskDescription: task.description,
            difficulty: task.difficulty.rawValue,
            questName: quest?.name,
            questDescription: quest?.description,
            planSummary: planSummary
        )
    }

    func sendMessage(_ content: String) async {
        messages.append(ChatMessage(role: .user, content: content))
        isTyping = true
        errorMessage = nil

        do {
            let response = try await APIService.taskChat(messages: messages, context: context)
            messages.append(ChatMessage(role: .assistant, content: response))
        } catch {
            errorMessage = error.localizedDescription
        }

        isTyping = false
    }

    func saveNotes() async {
        isSavingNotes = true
        do {
            try await DataService.shared.updateTaskNotes(task.id, notes: notes)
        } catch {
            errorMessage = error.localizedDescription
        }
        isSavingNotes = false
    }

    func summarizeAndSave() async {
        guard !messages.isEmpty else { return }

        // Build a summary request
        let summaryContent = "Please summarize our conversation into concise notes I can save for reference."
        await sendMessage(summaryContent)

        if let lastAssistant = messages.last(where: { $0.role == .assistant }) {
            notes = lastAssistant.content
            await saveNotes()
        }
    }
}

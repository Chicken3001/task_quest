import Foundation
import UIKit
import Observation

@MainActor
@Observable
final class DashboardViewModel {
    var dataService = DataService.shared
    var showAddTask = false
    var showQuestPlanner = false
    var toastMessage: String?
    var expandedEpicIds: Set<String> = []
    var expandedQuestIds: Set<String> = []

    func load() async {
        await dataService.fetchAll()
        autoExpandMostRecent()
    }

    func refresh() async {
        await dataService.fetchAll()
    }

    func completeTask(_ taskId: String) async {
        do {
            let result = try await dataService.completeTask(taskId)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()

            if result.epicCompleted {
                toastMessage = "Epic completed!"
            } else if result.questCompleted {
                toastMessage = "Quest completed!"
            } else if result.leveledUp {
                toastMessage = "Level up! You're now level \(result.newLevel)!"
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            }
        } catch {
            toastMessage = "Error: \(error.localizedDescription)"
        }
    }

    func deleteTask(_ taskId: String) async {
        do {
            try await dataService.deleteTask(taskId)
        } catch {
            toastMessage = "Error: \(error.localizedDescription)"
        }
    }

    func deleteQuest(_ questId: String) async {
        do {
            try await dataService.deleteQuest(questId)
        } catch {
            toastMessage = "Error: \(error.localizedDescription)"
        }
    }

    func deleteEpic(_ epicId: String) async {
        do {
            try await dataService.deleteEpic(epicId)
        } catch {
            toastMessage = "Error: \(error.localizedDescription)"
        }
    }

    private func autoExpandMostRecent() {
        // Expand all active epics
        for epic in dataService.epics where epic.status == .active {
            expandedEpicIds.insert(epic.id)
        }
        // Expand all quests that have active tasks
        for task in dataService.activeTasks {
            if let questId = task.questId {
                expandedQuestIds.insert(questId)
            }
        }
    }
}

import Foundation
import Supabase

@Observable
final class DataService: @unchecked Sendable {
    static let shared = DataService()

    var profile: Profile?
    var epics: [Epic] = []
    var quests: [Quest] = []
    var tasks: [TaskItem] = []
    var isLoading = false

    private let client = SupabaseService.client

    private init() {}

    // MARK: - Fetch

    @MainActor
    func fetchAll() async {
        guard let userId = AuthService.shared.currentUserId else { return }
        isLoading = true

        do {
            let p: Profile = try await client.from("task_quest_profiles")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            profile = p
        } catch {
            print("Profile fetch error: \(error)")
        }

        do {
            let e: [Epic] = try await client.from("task_quest_epics")
                .select()
                .eq("user_id", value: userId)
                .order("created_at", ascending: false)
                .execute()
                .value
            epics = e
        } catch {
            print("Epics fetch error: \(error)")
            epics = []
        }

        do {
            let q: [Quest] = try await client.from("task_quest_quests")
                .select()
                .eq("user_id", value: userId)
                .order("position")
                .order("created_at")
                .execute()
                .value
            quests = q
        } catch {
            print("Quests fetch error: \(error)")
            quests = []
        }

        do {
            let t: [TaskItem] = try await client.from("task_quest_tasks")
                .select()
                .eq("user_id", value: userId)
                .order("position")
                .order("created_at")
                .execute()
                .value
            tasks = t
        } catch {
            print("Tasks fetch error: \(error)")
            tasks = []
        }
        isLoading = false
    }

    // MARK: - Computed

    var standaloneQuests: [Quest] {
        quests.filter { $0.epicId == nil }
    }

    var standaloneTasks: [TaskItem] {
        tasks.filter { $0.questId == nil }
    }

    var standaloneActiveTasks: [TaskItem] {
        standaloneTasks.filter { $0.status == .active }
    }

    var standaloneCompletedTasks: [TaskItem] {
        standaloneTasks.filter { $0.status == .completed }
    }

    var activeTasks: [TaskItem] {
        tasks.filter { $0.status == .active }
    }

    var completedTasks: [TaskItem] {
        tasks.filter { $0.status == .completed }
    }

    func questsForEpic(_ epicId: String) -> [Quest] {
        quests.filter { $0.epicId == epicId }
    }

    func tasksForQuest(_ questId: String) -> [TaskItem] {
        tasks.filter { $0.questId == questId }
    }

    func activeTasksForQuest(_ questId: String) -> [TaskItem] {
        tasksForQuest(questId).filter { $0.status == .active }
    }

    func completedTasksForQuest(_ questId: String) -> [TaskItem] {
        tasksForQuest(questId).filter { $0.status == .completed }
    }

    // MARK: - Mutations

    func addTask(title: String, description: String?, difficulty: Difficulty, questId: String?) async throws {
        guard let userId = AuthService.shared.currentUserId else { throw AuthError.notAuthenticated }

        let xpReward = XP.rewards[difficulty] ?? 10

        struct NewTask: Encodable {
            let user_id: String
            let title: String
            let description: String?
            let difficulty: Difficulty
            let xp_reward: Int
            let quest_id: String?
        }

        let newTask = NewTask(
            user_id: userId,
            title: title,
            description: description,
            difficulty: difficulty,
            xp_reward: xpReward,
            quest_id: questId
        )

        try await client.from("task_quest_tasks")
            .insert(newTask)
            .execute()

        await fetchAll()
    }

    struct CompleteResult {
        var leveledUp = false
        var newLevel = 0
        var questCompleted = false
        var epicCompleted = false
    }

    func completeTask(_ taskId: String) async throws -> CompleteResult {
        guard let userId = AuthService.shared.currentUserId else { throw AuthError.notAuthenticated }

        // Get the task
        guard let task = tasks.first(where: { $0.id == taskId && $0.status == .active }) else {
            throw NSError(domain: "TaskQuest", code: 404, userInfo: [NSLocalizedDescriptionKey: "Task not found"])
        }

        // Optimistic UI update
        await MainActor.run {
            if let idx = tasks.firstIndex(where: { $0.id == taskId }) {
                tasks[idx].status = .completed
                tasks[idx].completedAt = ISO8601DateFormatter().string(from: Date())
            }
        }

        // Mark task completed in DB
        try await client.from("task_quest_tasks")
            .update(["status": "completed", "completed_at": ISO8601DateFormatter().string(from: Date())])
            .eq("id", value: taskId)
            .execute()

        // Get current profile
        guard let profile = self.profile else {
            throw NSError(domain: "TaskQuest", code: 404, userInfo: [NSLocalizedDescriptionKey: "Profile not found"])
        }

        // Calculate new XP and level
        let newXp = profile.xp + task.xpReward
        let newLevel = XP.getLevel(xp: newXp)

        // Calculate streak
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let today = dateFormatter.string(from: Date())
        let yesterday = dateFormatter.string(from: Date(timeIntervalSinceNow: -86400))
        let lastDate = profile.lastCompletedDate

        var newStreak = profile.currentStreak
        if lastDate == today {
            // Already completed today
        } else if lastDate == yesterday {
            newStreak += 1
        } else {
            newStreak = 1
        }

        let newLongestStreak = max(newStreak, profile.longestStreak)

        struct ProfileUpdate: Encodable {
            let xp: Int
            let level: Int
            let current_streak: Int
            let longest_streak: Int
            let last_completed_date: String
        }

        try await client.from("task_quest_profiles")
            .update(ProfileUpdate(
                xp: newXp,
                level: newLevel,
                current_streak: newStreak,
                longest_streak: newLongestStreak,
                last_completed_date: today
            ))
            .eq("id", value: userId)
            .execute()

        // Cascade completion
        var result = CompleteResult(leveledUp: newLevel > profile.level, newLevel: newLevel)

        if let questId = task.questId {
            // Refresh tasks to get current state
            let questTasks: [TaskItem] = (try? await client.from("task_quest_tasks")
                .select()
                .eq("quest_id", value: questId)
                .eq("user_id", value: userId)
                .execute()
                .value) ?? []

            if questTasks.allSatisfy({ $0.status == .completed }) {
                result.questCompleted = true
                try await client.from("task_quest_quests")
                    .update(["status": "completed"])
                    .eq("id", value: questId)
                    .execute()

                // Check epic completion
                let quest: Quest? = try? await client.from("task_quest_quests")
                    .select()
                    .eq("id", value: questId)
                    .single()
                    .execute()
                    .value

                if let epicId = quest?.epicId {
                    let epicQuests: [Quest] = (try? await client.from("task_quest_quests")
                        .select()
                        .eq("epic_id", value: epicId)
                        .eq("user_id", value: userId)
                        .execute()
                        .value) ?? []

                    if epicQuests.allSatisfy({ $0.status == .completed }) {
                        result.epicCompleted = true
                        try await client.from("task_quest_epics")
                            .update(["status": "completed"])
                            .eq("id", value: epicId)
                            .execute()
                    }
                }
            }
        }

        await fetchAll()
        return result
    }

    func deleteTask(_ taskId: String) async throws {
        guard let userId = AuthService.shared.currentUserId else { throw AuthError.notAuthenticated }

        // Optimistic removal
        await MainActor.run {
            tasks.removeAll { $0.id == taskId }
        }

        try await client.from("task_quest_tasks")
            .delete()
            .eq("id", value: taskId)
            .eq("user_id", value: userId)
            .execute()

        await fetchAll()
    }

    func deleteQuest(_ questId: String) async throws {
        guard let userId = AuthService.shared.currentUserId else { throw AuthError.notAuthenticated }

        try await client.from("task_quest_quests")
            .delete()
            .eq("id", value: questId)
            .eq("user_id", value: userId)
            .execute()

        await fetchAll()
    }

    func deleteEpic(_ epicId: String) async throws {
        guard let userId = AuthService.shared.currentUserId else { throw AuthError.notAuthenticated }

        try await client.from("task_quest_epics")
            .delete()
            .eq("id", value: epicId)
            .eq("user_id", value: userId)
            .execute()

        await fetchAll()
    }

    func updateTaskNotes(_ taskId: String, notes: String) async throws {
        guard let userId = AuthService.shared.currentUserId else { throw AuthError.notAuthenticated }

        try await client.from("task_quest_tasks")
            .update(["notes": notes])
            .eq("id", value: taskId)
            .eq("user_id", value: userId)
            .execute()

        await fetchAll()
    }

    func createQuestWithTasks(_ quest: GeneratedQuest) async throws {
        guard let userId = AuthService.shared.currentUserId else { throw AuthError.notAuthenticated }

        struct NewQuest: Encodable {
            let user_id: String
            let epic_id: String?
            let name: String
            let description: String?
            let plan_summary: String?
        }

        let questRow: Quest = try await client.from("task_quest_quests")
            .insert(NewQuest(
                user_id: userId,
                epic_id: nil,
                name: quest.name,
                description: quest.description,
                plan_summary: quest.planSummary
            ))
            .select()
            .single()
            .execute()
            .value

        struct NewTaskRow: Encodable {
            let user_id: String
            let quest_id: String
            let title: String
            let description: String?
            let difficulty: Difficulty
            let xp_reward: Int
            let position: Int
        }

        let taskRows = quest.tasks.enumerated().map { (i, t) in
            NewTaskRow(
                user_id: userId,
                quest_id: questRow.id,
                title: t.title,
                description: t.description,
                difficulty: t.difficulty,
                xp_reward: XP.rewards[t.difficulty] ?? 10,
                position: i
            )
        }

        try await client.from("task_quest_tasks")
            .insert(taskRows)
            .execute()

        await fetchAll()
    }

    func createEpicWithQuestsAndTasks(_ epic: GeneratedEpic) async throws {
        guard let userId = AuthService.shared.currentUserId else { throw AuthError.notAuthenticated }

        struct NewEpic: Encodable {
            let user_id: String
            let name: String
            let description: String?
            let plan_summary: String?
        }

        let epicRow: Epic = try await client.from("task_quest_epics")
            .insert(NewEpic(
                user_id: userId,
                name: epic.name,
                description: epic.description,
                plan_summary: epic.planSummary
            ))
            .select()
            .single()
            .execute()
            .value

        struct NewQuest: Encodable {
            let user_id: String
            let epic_id: String
            let name: String
            let description: String?
            let position: Int
        }

        struct NewTaskRow: Encodable {
            let user_id: String
            let quest_id: String
            let title: String
            let description: String?
            let difficulty: Difficulty
            let xp_reward: Int
            let position: Int
        }

        for (qi, quest) in epic.quests.enumerated() {
            let questRow: Quest = try await client.from("task_quest_quests")
                .insert(NewQuest(
                    user_id: userId,
                    epic_id: epicRow.id,
                    name: quest.name,
                    description: quest.description,
                    position: qi
                ))
                .select()
                .single()
                .execute()
                .value

            let taskRows = quest.tasks.enumerated().map { (ti, t) in
                NewTaskRow(
                    user_id: userId,
                    quest_id: questRow.id,
                    title: t.title,
                    description: t.description,
                    difficulty: t.difficulty,
                    xp_reward: XP.rewards[t.difficulty] ?? 10,
                    position: ti
                )
            }

            try await client.from("task_quest_tasks")
                .insert(taskRows)
                .execute()
        }

        await fetchAll()
    }

    func updatePersonalInfo(_ text: String?) async throws {
        guard let userId = AuthService.shared.currentUserId else { throw AuthError.notAuthenticated }

        struct Update: Encodable {
            let personal_info: String?
        }

        try await client.from("task_quest_profiles")
            .update(Update(personal_info: text))
            .eq("id", value: userId)
            .execute()

        await fetchAll()
    }

    func updateUsername(_ username: String) async throws {
        guard let userId = AuthService.shared.currentUserId else { throw AuthError.notAuthenticated }

        // Check if taken
        let existing: [Profile] = try await client.from("task_quest_profiles")
            .select("id")
            .eq("username", value: username)
            .neq("id", value: userId)
            .execute()
            .value

        if !existing.isEmpty {
            throw AuthError.usernameTaken
        }

        try await client.from("task_quest_profiles")
            .update(["username": username])
            .eq("id", value: userId)
            .execute()

        await fetchAll()
    }
}

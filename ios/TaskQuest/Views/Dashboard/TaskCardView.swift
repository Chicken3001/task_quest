import SwiftUI

struct TaskCardView: View {
    let task: TaskItem
    let viewModel: DashboardViewModel
    @State private var showTaskChat = false
    @State private var showDeleteConfirm = false

    private var isCompleted: Bool { task.status == .completed }

    var body: some View {
        HStack(spacing: 12) {
            // Complete button
            Button {
                if !isCompleted {
                    Task { await viewModel.completeTask(task.id) }
                }
            } label: {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isCompleted ? Color.easyGreen : Color.violet400)
            }
            .disabled(isCompleted)

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isCompleted ? Color.violet400 : Color.white)
                    .strikethrough(isCompleted)

                if let description = task.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(Color.violet400)
                        .lineLimit(2)
                }

                HStack(spacing: 8) {
                    DifficultyBadge(difficulty: task.difficulty)

                    Text("+\(task.xpReward) XP")
                        .font(.caption2.bold())
                        .foregroundStyle(Color.violet400)

                    if let time = XP.timeEstimates[task.difficulty] {
                        Text(time)
                            .font(.caption2)
                            .foregroundStyle(Color.violet400.opacity(0.7))
                    }
                }
            }

            Spacer()

            // Actions
            HStack(spacing: 4) {
                Button {
                    showTaskChat = true
                } label: {
                    let hasNotes = task.notes != nil && !task.notes!.isEmpty
                    Image(systemName: "bubble.left.fill")
                        .font(.caption)
                        .foregroundStyle(hasNotes ? Color.easyGreen : Color.violet400)
                        .padding(8)
                        .background(hasNotes ? Color.easyGreen.opacity(0.15) : Color.white.opacity(0.05))
                        .clipShape(Circle())
                }

                Button {
                    showDeleteConfirm = true
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundStyle(.red.opacity(0.7))
                        .padding(8)
                        .background(Color.white.opacity(0.05))
                        .clipShape(Circle())
                }
            }
        }
        .padding(16)
        .background(Color.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
        .confirmationDialog("Delete Task", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                Task { await viewModel.deleteTask(task.id) }
            }
        } message: {
            Text("Are you sure you want to delete \"\(task.title)\"?")
        }
        .sheet(isPresented: $showTaskChat) {
            let quest = task.questId.flatMap { qid in viewModel.dataService.quests.first { $0.id == qid } }
            let planSummary = quest?.planSummary ?? quest?.epicId.flatMap { eid in
                viewModel.dataService.epics.first { $0.id == eid }?.planSummary
            }
            TaskChatSheet(task: task, quest: quest, planSummary: planSummary ?? nil)
        }
    }
}

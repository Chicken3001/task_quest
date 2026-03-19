import SwiftUI

struct QuestSectionView: View {
    let quest: Quest
    let viewModel: DashboardViewModel
    var indented: Bool = false
    @State private var showDeleteConfirm = false
    @State private var showPlanSummary = false

    private var isExpanded: Bool {
        viewModel.expandedQuestIds.contains(quest.id)
    }

    private var questTasks: [TaskItem] {
        viewModel.dataService.tasksForQuest(quest.id)
    }

    private var activeTasks: [TaskItem] {
        questTasks.filter { $0.status == .active }
    }

    private var completedCount: Int {
        questTasks.filter { $0.status == .completed }.count
    }

    private var progress: Double {
        questTasks.isEmpty ? 0 : Double(completedCount) / Double(questTasks.count)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Quest header
            Button {
                withAnimation(.spring(response: 0.3)) {
                    if isExpanded {
                        viewModel.expandedQuestIds.remove(quest.id)
                    } else {
                        viewModel.expandedQuestIds.insert(quest.id)
                    }
                }
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.caption2.bold())
                        .foregroundStyle(Color.violet400)
                        .frame(width: 14)

                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(quest.name)
                                .font(.subheadline.bold())
                                .foregroundStyle(quest.status == .completed ? Color.violet400 : Color.white)

                            if quest.status == .completed {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.caption2)
                                    .foregroundStyle(Color.easyGreen)
                            }
                        }

                        Text("\(completedCount)/\(questTasks.count) tasks")
                            .font(.caption2)
                            .foregroundStyle(Color.violet400)

                        ProgressBarView(progress: progress, gradient: [.easyGreen, .teal], height: 4)
                    }

                    Spacer()

                    HStack(spacing: 4) {
                        if quest.planSummary != nil {
                            Button {
                                showPlanSummary = true
                            } label: {
                                Image(systemName: "info.circle")
                                    .font(.caption2)
                                    .foregroundStyle(Color.violet400)
                                    .padding(4)
                            }
                        }

                        if !indented {
                            Button {
                                showDeleteConfirm = true
                            } label: {
                                Image(systemName: "trash")
                                    .font(.caption2)
                                    .foregroundStyle(.red.opacity(0.7))
                                    .padding(4)
                            }
                        }
                    }
                }
                .padding(12)
            }
            .buttonStyle(.plain)

            // Tasks
            if isExpanded {
                VStack(spacing: 6) {
                    ForEach(questTasks) { task in
                        TaskCardView(task: task, viewModel: viewModel)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 10)
            }
        }
        .background(indented ? Color.white.opacity(0.02) : Color.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.cardBorder.opacity(0.5), lineWidth: 1)
        )
        .confirmationDialog("Delete Quest", isPresented: $showDeleteConfirm) {
            Button("Delete Quest & All Tasks", role: .destructive) {
                Task { await viewModel.deleteQuest(quest.id) }
            }
        } message: {
            Text("This will delete \"\(quest.name)\" and all its tasks.")
        }
        .alert("Plan Summary", isPresented: $showPlanSummary) {
            Button("OK") {}
        } message: {
            Text(quest.planSummary ?? "")
        }
    }
}

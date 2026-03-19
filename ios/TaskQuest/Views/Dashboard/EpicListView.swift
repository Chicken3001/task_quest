import SwiftUI

struct EpicListView: View {
    let viewModel: DashboardViewModel

    var body: some View {
        VStack(spacing: 12) {
            ForEach(viewModel.dataService.epics) { epic in
                EpicSectionView(epic: epic, viewModel: viewModel)
            }
        }
    }
}

struct EpicSectionView: View {
    let epic: Epic
    let viewModel: DashboardViewModel
    @State private var showDeleteConfirm = false
    @State private var showPlanSummary = false

    private var isExpanded: Bool {
        viewModel.expandedEpicIds.contains(epic.id)
    }

    private var epicQuests: [Quest] {
        viewModel.dataService.questsForEpic(epic.id)
    }

    private var epicTasks: [TaskItem] {
        epicQuests.flatMap { viewModel.dataService.tasksForQuest($0.id) }
    }

    private var completedCount: Int {
        epicTasks.filter { $0.status == .completed }.count
    }

    private var totalCount: Int {
        epicTasks.count
    }

    private var progress: Double {
        totalCount > 0 ? Double(completedCount) / Double(totalCount) : 0
    }

    var body: some View {
        VStack(spacing: 0) {
            // Epic header
            Button {
                withAnimation(.spring(response: 0.3)) {
                    if isExpanded {
                        viewModel.expandedEpicIds.remove(epic.id)
                    } else {
                        viewModel.expandedEpicIds.insert(epic.id)
                    }
                }
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.caption.bold())
                        .foregroundStyle(Color.violet400)
                        .frame(width: 16)

                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(epic.name)
                                .font(.headline.bold())
                                .foregroundStyle(epic.status == .completed ? Color.violet400 : Color.white)

                            if epic.status == .completed {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.caption)
                                    .foregroundStyle(Color.easyGreen)
                            }
                        }

                        HStack(spacing: 8) {
                            Text("\(completedCount)/\(totalCount) tasks")
                                .font(.caption)
                                .foregroundStyle(Color.violet400)

                            Text("\(epicQuests.count) quests")
                                .font(.caption)
                                .foregroundStyle(Color.violet400.opacity(0.7))
                        }

                        ProgressBarView(progress: progress, height: 6)
                    }

                    Spacer()

                    // Actions
                    HStack(spacing: 4) {
                        if epic.planSummary != nil {
                            Button {
                                showPlanSummary = true
                            } label: {
                                Image(systemName: "info.circle")
                                    .font(.caption)
                                    .foregroundStyle(Color.violet400)
                                    .padding(6)
                            }
                        }

                        Button {
                            showDeleteConfirm = true
                        } label: {
                            Image(systemName: "trash")
                                .font(.caption)
                                .foregroundStyle(.red.opacity(0.7))
                                .padding(6)
                        }
                    }
                }
                .padding(16)
            }
            .buttonStyle(.plain)

            // Expanded content
            if isExpanded {
                VStack(spacing: 8) {
                    ForEach(epicQuests) { quest in
                        QuestSectionView(quest: quest, viewModel: viewModel, indented: true)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 12)
            }
        }
        .background(Color.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
        .confirmationDialog("Delete Epic", isPresented: $showDeleteConfirm) {
            Button("Delete Epic & All Quests/Tasks", role: .destructive) {
                Task { await viewModel.deleteEpic(epic.id) }
            }
        } message: {
            Text("This will delete \"\(epic.name)\" and all its quests and tasks.")
        }
        .alert("Plan Summary", isPresented: $showPlanSummary) {
            Button("OK") {}
        } message: {
            Text(epic.planSummary ?? "")
        }
    }
}

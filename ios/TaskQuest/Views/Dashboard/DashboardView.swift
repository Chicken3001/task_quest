import SwiftUI

struct DashboardView: View {
    @State private var viewModel = DashboardViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if viewModel.dataService.isLoading && viewModel.dataService.profile == nil {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else {
                        StatsBar(profile: viewModel.dataService.profile)

                        // Action buttons
                        HStack(spacing: 12) {
                            Button {
                                viewModel.showAddTask = true
                            } label: {
                                Label("Add Task", systemImage: "plus.circle.fill")
                                    .font(.subheadline.bold())
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                                    .background(Color.violet600)
                                    .clipShape(Capsule())
                            }

                            Button {
                                viewModel.showQuestPlanner = true
                            } label: {
                                Label("Quest Planner", systemImage: "wand.and.stars")
                                    .font(.subheadline.bold())
                                    .foregroundStyle(Color.violet300)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                                    .background(Color.white.opacity(0.1))
                                    .clipShape(Capsule())
                                    .overlay(Capsule().stroke(Color.cardBorder, lineWidth: 1))
                            }

                            Spacer()
                        }

                        // Epics
                        if !viewModel.dataService.epics.isEmpty {
                            SectionHeader(title: "Epics", count: viewModel.dataService.epics.count)
                            EpicListView(viewModel: viewModel)
                        }

                        // Standalone Quests
                        if !viewModel.dataService.standaloneQuests.isEmpty {
                            SectionHeader(title: "Quests", count: viewModel.dataService.standaloneQuests.count)
                            StandaloneQuestListView(viewModel: viewModel)
                        }

                        // Standalone Active Tasks
                        SectionHeader(title: "Active Tasks", count: viewModel.dataService.standaloneActiveTasks.count)
                        if viewModel.dataService.standaloneActiveTasks.isEmpty
                            && viewModel.dataService.epics.isEmpty
                            && viewModel.dataService.standaloneQuests.isEmpty {
                            EmptyStateView(message: "No active tasks. Add one above or use the Quest Planner!")
                        } else {
                            ForEach(viewModel.dataService.standaloneActiveTasks) { task in
                                TaskCardView(task: task, viewModel: viewModel)
                            }
                        }

                        // Standalone Completed Tasks
                        if !viewModel.dataService.standaloneCompletedTasks.isEmpty {
                            SectionHeader(title: "Completed", count: viewModel.dataService.standaloneCompletedTasks.count)
                            ForEach(viewModel.dataService.standaloneCompletedTasks) { task in
                                TaskCardView(task: task, viewModel: viewModel)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
            .background(Color.background)
            .navigationTitle("Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.load()
            }
            .sheet(isPresented: $viewModel.showAddTask) {
                AddTaskSheet(viewModel: viewModel)
            }
            .sheet(isPresented: $viewModel.showQuestPlanner) {
                QuestPlannerSheet(onCreated: {
                    viewModel.showQuestPlanner = false
                    Task { await viewModel.refresh() }
                })
            }
            .toast(message: $viewModel.toastMessage)
        }
    }
}

struct SectionHeader: View {
    let title: String
    let count: Int

    var body: some View {
        HStack {
            Text("\(title) (\(count))")
                .font(.headline.bold())
                .foregroundStyle(.white)
            Spacer()
        }
    }
}

struct EmptyStateView: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.subheadline)
            .foregroundStyle(Color.violet400)
            .frame(maxWidth: .infinity)
            .padding(32)
            .background(Color.cardBg.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(Color.cardBorder, style: StrokeStyle(lineWidth: 1, dash: [8, 4]))
            )
    }
}

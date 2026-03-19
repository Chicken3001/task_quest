import SwiftUI

struct AddTaskSheet: View {
    let viewModel: DashboardViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var description = ""
    @State private var difficulty: Difficulty = .medium
    @State private var selectedQuestId: String?
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Title
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Title")
                            .font(.caption.bold())
                            .foregroundStyle(Color.violet400)
                        TextField("What needs to be done?", text: $title)
                            .textFieldStyle(QuestTextFieldStyle())
                    }

                    // Description
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Description (optional)")
                            .font(.caption.bold())
                            .foregroundStyle(Color.violet400)
                        TextField("Add details...", text: $description, axis: .vertical)
                            .textFieldStyle(QuestTextFieldStyle())
                            .lineLimit(3...6)
                    }

                    // Difficulty
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Difficulty")
                            .font(.caption.bold())
                            .foregroundStyle(Color.violet400)

                        HStack(spacing: 8) {
                            ForEach(Difficulty.allCases, id: \.self) { diff in
                                Button {
                                    difficulty = diff
                                } label: {
                                    VStack(spacing: 4) {
                                        Text(diff.rawValue.capitalized)
                                            .font(.caption.bold())
                                        Text("+\(XP.rewards[diff] ?? 0) XP")
                                            .font(.caption2)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(difficulty == diff ? XP.color(for: diff).opacity(0.2) : Color.white.opacity(0.05))
                                    .foregroundStyle(difficulty == diff ? XP.color(for: diff) : .violet400)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10)
                                            .stroke(difficulty == diff ? XP.color(for: diff).opacity(0.5) : Color.cardBorder, lineWidth: 1)
                                    )
                                }
                            }
                        }
                    }

                    // Quest picker
                    if !viewModel.dataService.quests.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Add to Quest (optional)")
                                .font(.caption.bold())
                                .foregroundStyle(Color.violet400)

                            Picker("Quest", selection: $selectedQuestId) {
                                Text("Standalone task").tag(nil as String?)
                                ForEach(viewModel.dataService.quests.filter { $0.status == .active }) { quest in
                                    Text(quest.name).tag(quest.id as String?)
                                }
                            }
                            .pickerStyle(.menu)
                            .tint(Color.violet400)
                        }
                    }

                    if let error = errorMessage {
                        Text(error)
                            .font(.caption.bold())
                            .foregroundStyle(.red)
                    }
                }
                .padding(20)
            }
            .background(Color.background)
            .navigationTitle("Add Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Color.violet400)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await submit() }
                    } label: {
                        if isSubmitting {
                            ProgressView().tint(.white)
                        } else {
                            Text("Add")
                                .bold()
                        }
                    }
                    .disabled(title.isEmpty || isSubmitting)
                    .foregroundStyle(.white)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func submit() async {
        isSubmitting = true
        errorMessage = nil
        do {
            try await viewModel.dataService.addTask(
                title: title,
                description: description.isEmpty ? nil : description,
                difficulty: difficulty,
                questId: selectedQuestId
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}

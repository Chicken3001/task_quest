import SwiftUI

struct TaskChatSheet: View {
    let task: TaskItem
    let quest: Quest?
    let planSummary: String?

    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: TaskChatViewModel
    @State private var inputText = ""
    @State private var selectedTab = 0

    init(task: TaskItem, quest: Quest?, planSummary: String?) {
        self.task = task
        self.quest = quest
        self.planSummary = planSummary
        self._viewModel = State(initialValue: TaskChatViewModel(task: task, quest: quest, planSummary: planSummary))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Task header
                VStack(alignment: .leading, spacing: 4) {
                    Text(task.title)
                        .font(.headline.bold())
                        .foregroundStyle(.white)

                    HStack(spacing: 8) {
                        DifficultyBadge(difficulty: task.difficulty)
                        if let questName = quest?.name {
                            Text(questName)
                                .font(.caption)
                                .foregroundStyle(Color.violet400)
                        }
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.cardBg)

                // Tab selector
                Picker("Tab", selection: $selectedTab) {
                    Text("Chat").tag(0)
                    Text("Notes").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)

                if selectedTab == 0 {
                    chatTab
                        .task { await viewModel.loadCredits() }
                } else {
                    notesTab
                }
            }
            .background(Color.background)
            .navigationTitle("Task Assistant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Color.violet400)
                }
            }
        }
    }

    // MARK: - Chat Tab

    private var chatTab: some View {
        VStack(spacing: 0) {
            // Research section
            VStack(spacing: 6) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Research")
                            .font(.caption.bold())
                            .foregroundStyle(Color.orange)
                        Text("AI searches the web and writes a detailed guide")
                            .font(.caption2)
                            .foregroundStyle(Color.orange.opacity(0.7))
                    }
                    Spacer()
                    if let credits = viewModel.researchCredits {
                        Text("\(credits) left")
                            .font(.caption2)
                            .foregroundStyle(Color.orange.opacity(0.7))
                    }
                    Button {
                        Task {
                            await viewModel.researchTask()
                            if viewModel.researchError == nil {
                                selectedTab = 1
                            }
                        }
                    } label: {
                        Text(viewModel.isResearching ? "Researching..." : "Research")
                            .font(.caption.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(
                                LinearGradient(colors: [Color.orange, Color.orange.opacity(0.8)], startPoint: .leading, endPoint: .trailing)
                            )
                            .clipShape(Capsule())
                    }
                    .disabled(viewModel.isResearching || viewModel.researchCredits == 0)
                }

                if let error = viewModel.researchError {
                    Text(error)
                        .font(.caption2)
                        .foregroundStyle(.red)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.cardBg)

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if viewModel.messages.isEmpty {
                            Text("Ask anything about this task — approach, requirements, or how to break it down further.")
                                .font(.subheadline)
                                .foregroundStyle(Color.violet400)
                                .multilineTextAlignment(.center)
                                .padding(32)
                        }

                        ForEach(viewModel.messages) { message in
                            ChatBubbleView(message: message)
                                .id(message.id)
                        }

                        if viewModel.isTyping {
                            TypingIndicator()
                                .id("typing")
                        }

                        if let error = viewModel.errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .padding(10)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.red.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding(16)
                }
                .onChange(of: viewModel.messages.count) { _, _ in
                    withAnimation {
                        if let lastId = viewModel.messages.last?.id {
                            proxy.scrollTo(lastId, anchor: .bottom)
                        }
                    }
                }
            }

            // Summarize button
            if viewModel.messages.count >= 2 {
                Button {
                    Task { await viewModel.summarizeAndSave() }
                } label: {
                    Label("Save as Notes", systemImage: "doc.text")
                        .font(.caption.bold())
                        .foregroundStyle(Color.violet300)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.08))
                        .clipShape(Capsule())
                }
                .padding(.bottom, 4)
            }

            // Input bar
            HStack(spacing: 10) {
                TextField("Ask about this task...", text: $inputText)
                    .textFieldStyle(QuestTextFieldStyle())
                    .submitLabel(.send)
                    .onSubmit { sendMessage() }

                Button {
                    sendMessage()
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Color.violet500)
                }
                .disabled(inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isTyping)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.cardBg)
        }
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        inputText = ""
        Task { await viewModel.sendMessage(text) }
    }

    // MARK: - Notes Tab

    private var notesTab: some View {
        NotesSection(viewModel: viewModel)
    }
}

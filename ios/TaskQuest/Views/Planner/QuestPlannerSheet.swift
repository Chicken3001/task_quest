import SwiftUI

struct QuestPlannerSheet: View {
    var onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = QuestPlannerViewModel()
    @State private var inputText = ""
    @State private var isCreating = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Mode picker
                Picker("Mode", selection: $viewModel.mode) {
                    Text("Quest").tag("quest")
                    Text("Epic").tag("epic")
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .onChange(of: viewModel.mode) { _, _ in
                    viewModel.reset()
                    Task { await viewModel.startConversation() }
                }

                switch viewModel.state {
                case .chatting:
                    chatView
                case .generating:
                    generatingView
                case .preview:
                    previewView
                }
            }
            .background(Color.background)
            .navigationTitle("Quest Planner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Color.violet400)
                }
            }
            .task {
                await viewModel.checkPersonalInfo()
                await viewModel.startConversation()
            }
        }
    }

    // MARK: - Chat View

    private var chatView: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.messages) { message in
                            ChatBubbleView(message: message)
                                .id(message.id)
                        }

                        if viewModel.isTyping {
                            TypingIndicator()
                                .id("typing")
                        }

                        if let error = viewModel.errorMessage {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(error)
                                    .font(.caption)
                                    .foregroundStyle(.red)
                                if error.contains("limit reached") {
                                    Button {
                                        dismiss()
                                    } label: {
                                        Text("Go to Settings")
                                            .font(.caption.bold())
                                            .foregroundStyle(Color.violet400)
                                            .underline()
                                    }
                                }
                            }
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        // Suggested responses
                        if let lastMessage = viewModel.messages.last,
                           lastMessage.role == .assistant,
                           let suggestions = lastMessage.suggestedResponses,
                           !suggestions.isEmpty {
                            SuggestedResponsesView(suggestions: suggestions) { response in
                                Task { await viewModel.sendMessage(response) }
                            }
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

            // Personal info checkbox
            HStack(spacing: 8) {
                Button {
                    if viewModel.hasPersonalInfo {
                        viewModel.includePersonalInfo.toggle()
                    }
                } label: {
                    Image(systemName: viewModel.includePersonalInfo ? "checkmark.square.fill" : "square")
                        .foregroundStyle(viewModel.hasPersonalInfo ? Color.violet500 : Color.violet500.opacity(0.3))
                        .font(.title3)
                }
                .disabled(!viewModel.hasPersonalInfo)

                Text("Include my personal info")
                    .font(.subheadline)
                    .foregroundStyle(viewModel.hasPersonalInfo ? Color.violet300 : Color.violet400.opacity(0.5))

                if !viewModel.hasPersonalInfo {
                    Button {
                        dismiss()
                    } label: {
                        Text("Add in Account")
                            .font(.caption.bold())
                            .foregroundStyle(Color.violet400)
                            .underline()
                    }
                }

                Spacer()

                Menu {
                    Text(viewModel.hasPersonalInfo
                         ? "Sends your personal info (skills, preferences, goals) as context for better AI planning. Edit in Account Settings."
                         : "Add personal info in Account Settings to enable this.")
                } label: {
                    Image(systemName: "questionmark.circle")
                        .font(.subheadline)
                        .foregroundStyle(viewModel.hasPersonalInfo ? Color.violet400 : Color.violet400.opacity(0.4))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)

            // Generate button
            if viewModel.readyToGenerate {
                Button {
                    Task { await viewModel.generatePlan() }
                } label: {
                    Label("Generate Plan", systemImage: "wand.and.stars")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            LinearGradient(colors: [.violet600, .indigo600], startPoint: .leading, endPoint: .trailing)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .shadow(color: .violet500.opacity(0.3), radius: 8)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 4)
            }

            // Input bar
            chatInputBar
        }
    }

    private var chatInputBar: some View {
        HStack(spacing: 10) {
            TextField("Type a message...", text: $inputText)
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

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        inputText = ""
        Task { await viewModel.sendMessage(text) }
    }

    // MARK: - Generating View

    private var generatingView: some View {
        VStack(spacing: 20) {
            Spacer()
            ProgressView()
                .scaleEffect(1.5)
                .tint(Color.violet500)
            Text("Generating your plan...")
                .font(.headline)
                .foregroundStyle(Color.violet300)

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Preview View

    private var previewView: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let epic = viewModel.generatedEpic {
                        PlanPreviewView(epic: epic)
                    } else if let quest = viewModel.generatedQuest {
                        PlanPreviewView(quest: quest)
                    }
                }
                .padding(16)
            }

            // Create button
            HStack(spacing: 12) {
                Button {
                    viewModel.reset()
                    Task { await viewModel.startConversation() }
                } label: {
                    Text("Start Over")
                        .font(.subheadline.bold())
                        .foregroundStyle(Color.violet400)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.white.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }

                Button {
                    Task {
                        isCreating = true
                        do {
                            try await viewModel.createPlan()
                            onCreated()
                        } catch {
                            viewModel.errorMessage = error.localizedDescription
                        }
                        isCreating = false
                    }
                } label: {
                    Group {
                        if isCreating {
                            ProgressView().tint(.white)
                        } else {
                            Label("Create", systemImage: "checkmark.circle.fill")
                        }
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(colors: [.easyGreen, .teal], startPoint: .leading, endPoint: .trailing)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(isCreating)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.cardBg)
        }
    }
}

struct TypingIndicator: View {
    @State private var animating = false

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<3) { i in
                Circle()
                    .fill(Color.violet500)
                    .frame(width: 8, height: 8)
                    .scaleEffect(animating ? 1.0 : 0.6)
                    .opacity(animating ? 1.0 : 0.3)
                    .animation(
                        .easeInOut(duration: 0.6).repeatForever().delay(Double(i) * 0.2),
                        value: animating
                    )
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .frame(maxWidth: .infinity, alignment: .leading)
        .onAppear { animating = true }
    }
}

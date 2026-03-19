import SwiftUI

struct NotesSection: View {
    @Bindable var viewModel: TaskChatViewModel

    var body: some View {
        VStack(spacing: 16) {
            TextEditor(text: $viewModel.notes)
            .scrollContentBackground(.hidden)
            .foregroundStyle(.white)
            .font(.subheadline)
            .padding(12)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.cardBorder, lineWidth: 1)
            )
            .frame(maxHeight: .infinity)

            Button {
                Task { await viewModel.saveNotes() }
            } label: {
                Group {
                    if viewModel.isSavingNotes {
                        ProgressView().tint(.white)
                    } else {
                        Label("Save Notes", systemImage: "checkmark.circle")
                    }
                }
                .font(.subheadline.bold())
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.violet600)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(viewModel.isSavingNotes)

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .padding(16)
    }
}

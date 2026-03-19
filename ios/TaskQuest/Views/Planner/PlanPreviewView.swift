import SwiftUI

struct PlanPreviewView: View {
    var epic: GeneratedEpic?
    var quest: GeneratedQuest?

    var body: some View {
        if let epic {
            epicPreview(epic)
        } else if let quest {
            questPreview(quest)
        }
    }

    @ViewBuilder
    private func epicPreview(_ epic: GeneratedEpic) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(epic.name)
                    .font(.title2.bold())
                    .foregroundStyle(Color.white)

                if !epic.description.isEmpty {
                    Text(epic.description)
                        .font(.subheadline)
                        .foregroundStyle(Color.violet400)
                }
            }

            if let summary = epic.planSummary {
                Text(summary)
                    .font(.caption)
                    .foregroundStyle(Color.violet300)
                    .padding(12)
                    .background(Color.violet500.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            ForEach(Array(epic.quests.enumerated()), id: \.offset) { _, quest in
                questPreview(quest)
            }
        }
    }

    @ViewBuilder
    private func questPreview(_ quest: GeneratedQuest) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(quest.name)
                .font(.headline.bold())
                .foregroundStyle(Color.white)

            if !quest.description.isEmpty {
                Text(quest.description)
                    .font(.caption)
                    .foregroundStyle(Color.violet400)
            }

            VStack(spacing: 6) {
                ForEach(Array(quest.tasks.enumerated()), id: \.offset) { _, task in
                    HStack(spacing: 10) {
                        Image(systemName: "circle")
                            .font(.caption2)
                            .foregroundStyle(Color.violet400)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(task.title)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Color.white)

                            if !task.description.isEmpty {
                                Text(task.description)
                                    .font(.caption2)
                                    .foregroundStyle(Color.violet400)
                                    .lineLimit(2)
                            }
                        }

                        Spacer()

                        DifficultyBadge(difficulty: task.difficulty)
                    }
                    .padding(10)
                    .background(Color.white.opacity(0.03))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .cardStyle()
    }
}

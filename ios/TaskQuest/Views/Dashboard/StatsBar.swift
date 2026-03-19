import SwiftUI

struct StatsBar: View {
    let profile: Profile?

    var body: some View {
        let p = profile ?? Profile(id: "", username: "", xp: 0, level: 1, currentStreak: 0, longestStreak: 0, lastCompletedDate: nil, createdAt: "")
        let levelInfo = XP.getLevelProgress(xp: p.xp)

        HStack(spacing: 12) {
            // Level & XP
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Level")
                            .font(.caption.bold())
                            .foregroundStyle(Color.violet400)
                        Text("\(levelInfo.level)")
                            .font(.title.bold())
                            .foregroundStyle(.white)
                    }
                    Spacer()
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(LinearGradient(colors: [.violet600, .indigo600], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 44, height: 44)
                            .shadow(color: .violet500.opacity(0.25), radius: 6)
                        Image(systemName: "shield.fill")
                            .font(.title3)
                            .foregroundStyle(.white)
                    }
                }

                VStack(spacing: 4) {
                    HStack {
                        Text("\(p.xp) XP")
                        Spacer()
                        Text("\(levelInfo.nextLevelXp) XP")
                    }
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(Color.violet400)

                    ProgressBarView(progress: levelInfo.progress, height: 8)
                }
            }
            .cardStyle()

            // Streak + Tasks
            VStack(spacing: 12) {
                // Streak
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Streak")
                            .font(.caption.bold())
                            .foregroundStyle(Color.violet400)
                        HStack(alignment: .firstTextBaseline, spacing: 2) {
                            Text("\(p.currentStreak)")
                                .font(.title2.bold())
                                .foregroundStyle(.white)
                            Text("days")
                                .font(.caption)
                                .foregroundStyle(Color.violet400)
                        }
                    }
                    Spacer()
                    Image(systemName: "flame.fill")
                        .font(.title2)
                        .foregroundStyle(.orange)
                }
                .cardStyle()

                // Tasks count
                let activeCount = DataService.shared.activeTasks.count
                let doneCount = DataService.shared.completedTasks.count
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(doneCount) done")
                            .font(.caption.bold())
                            .foregroundStyle(.white)
                        Text("\(activeCount) active")
                            .font(.caption2)
                            .foregroundStyle(Color.violet400)
                    }
                    Spacer()
                    Image(systemName: "checklist")
                        .font(.title2)
                        .foregroundStyle(Color.violet400)
                }
                .cardStyle()
            }
        }
    }
}

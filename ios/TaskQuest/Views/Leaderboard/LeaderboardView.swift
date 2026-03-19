import SwiftUI

struct LeaderboardEntry: Codable, Identifiable {
    let id: String
    let username: String
    let xp: Int
    let level: Int
    let currentStreak: Int

    enum CodingKeys: String, CodingKey {
        case id, username, xp, level
        case currentStreak = "current_streak"
    }
}

struct LeaderboardView: View {
    @State private var entries: [LeaderboardEntry] = []
    @State private var isLoading = true
    @State private var currentUserId = AuthService.shared.currentUserId

    var body: some View {
        NavigationStack {
            ScrollView {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if entries.isEmpty {
                    EmptyStateView(message: "No adventurers yet. Be the first!")
                        .padding(16)
                } else {
                    VStack(spacing: 0) {
                        // Header
                        HStack {
                            Text("Rank").frame(width: 50, alignment: .leading)
                            Text("Adventurer").frame(maxWidth: .infinity, alignment: .leading)
                            Text("Lvl").frame(width: 40, alignment: .trailing)
                            Text("XP").frame(width: 60, alignment: .trailing)
                            Text("Streak").frame(width: 55, alignment: .trailing)
                        }
                        .font(.caption.bold())
                        .foregroundStyle(Color.violet400)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)

                        Divider().background(Color.cardBorder)

                        ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                            let rank = index + 1
                            let isMe = entry.id == currentUserId

                            HStack {
                                Group {
                                    if rank == 1 { Image(systemName: "trophy.fill").foregroundStyle(.yellow) }
                                    else if rank == 2 { Image(systemName: "trophy.fill").foregroundStyle(.gray) }
                                    else if rank == 3 { Image(systemName: "trophy.fill").foregroundStyle(.brown) }
                                    else { Text("#\(rank)").foregroundStyle(Color.violet400) }
                                }
                                .font(.subheadline.bold())
                                .frame(width: 50, alignment: .leading)

                                HStack(spacing: 4) {
                                    Text(entry.username)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(.white)
                                    if isMe {
                                        Text("(you)")
                                            .font(.caption2)
                                            .foregroundStyle(Color.violet400)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)

                                Text("\(entry.level)")
                                    .font(.subheadline.bold())
                                    .foregroundStyle(Color.violet300)
                                    .frame(width: 40, alignment: .trailing)

                                Text(entry.xp.formatted())
                                    .font(.subheadline.bold())
                                    .foregroundStyle(Color.indigo500)
                                    .frame(width: 60, alignment: .trailing)

                                HStack(spacing: 2) {
                                    if entry.currentStreak > 0 {
                                        Image(systemName: "flame.fill")
                                            .font(.caption2)
                                            .foregroundStyle(.orange)
                                    }
                                    Text("\(entry.currentStreak)d")
                                        .font(.subheadline.bold())
                                        .foregroundStyle(.orange)
                                }
                                .frame(width: 55, alignment: .trailing)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(isMe ? Color.violet500.opacity(0.1) : .clear)

                            if index < entries.count - 1 {
                                Divider().background(Color.cardBorder)
                            }
                        }
                    }
                    .background(Color.cardBg)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.cardBorder, lineWidth: 1)
                    )
                    .padding(16)
                }
            }
            .background(Color.background)
            .navigationTitle("Leaderboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .refreshable { await fetchLeaderboard() }
            .task { await fetchLeaderboard() }
        }
    }

    private func fetchLeaderboard() async {
        isLoading = true
        let result: [LeaderboardEntry]? = try? await SupabaseService.client
            .from("task_quest_profiles")
            .select("id, username, xp, level, current_streak")
            .not("username", operator: .is, value: "null")
            .order("xp", ascending: false)
            .limit(50)
            .execute()
            .value
        entries = result ?? []
        isLoading = false
    }
}

import SwiftUI

struct ContentView: View {
    @State private var authService = AuthService.shared

    var body: some View {
        Group {
            if authService.isLoading {
                ProgressView("Loading...")
                    .foregroundStyle(Color.violet300)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.background)
            } else if authService.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authService.isAuthenticated)
        .animation(.easeInOut(duration: 0.3), value: authService.isLoading)
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            Tab("Dashboard", systemImage: "list.bullet.clipboard") {
                DashboardView()
            }
            Tab("Leaderboard", systemImage: "trophy") {
                LeaderboardView()
            }
            Tab("Account", systemImage: "person.circle") {
                AccountView()
            }
        }
        .tint(.accent)
    }
}

import Foundation
import Supabase
import Observation

@Observable
final class AuthService: @unchecked Sendable {
    static let shared = AuthService()

    var isAuthenticated = false
    var isLoading = true
    var currentUserId: String?
    var errorMessage: String?

    private let client = SupabaseService.client

    private init() {
        Task { await listenForAuthChanges() }
    }

    private func listenForAuthChanges() async {
        for await (event, session) in client.auth.authStateChanges {
            await MainActor.run {
                switch event {
                case .initialSession:
                    if let session, !session.isExpired {
                        self.isAuthenticated = true
                        self.currentUserId = session.user.id.uuidString
                    } else {
                        self.isAuthenticated = false
                        self.currentUserId = nil
                    }
                    self.isLoading = false
                case .signedIn:
                    self.isAuthenticated = true
                    self.currentUserId = session?.user.id.uuidString
                case .signedOut:
                    self.isAuthenticated = false
                    self.currentUserId = nil
                default:
                    break
                }
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        errorMessage = nil
        try await client.auth.signIn(email: email, password: password)
    }

    func signUp(email: String, password: String, username: String) async throws {
        errorMessage = nil

        // Check if username is taken
        let existing: [Profile] = try await client.from("task_quest_profiles")
            .select("id")
            .eq("username", value: username)
            .execute()
            .value

        if !existing.isEmpty {
            throw AuthError.usernameTaken
        }

        let response = try await client.auth.signUp(email: email, password: password)

        // Insert profile
        let userId = response.user.id
        try await client.from("task_quest_profiles")
            .upsert(["id": userId.uuidString, "username": username], onConflict: "id")
            .execute()
    }

    func signOut() async throws {
        try await client.auth.signOut()
    }

    func getAccessToken() async throws -> String {
        let session = try await client.auth.session
        return session.accessToken
    }
}

enum AuthError: LocalizedError {
    case usernameTaken
    case notAuthenticated

    var errorDescription: String? {
        switch self {
        case .usernameTaken: "Username is already taken"
        case .notAuthenticated: "Not authenticated"
        }
    }
}

import Foundation
import Observation

@MainActor
@Observable
final class AuthViewModel {
    var email = ""
    var password = ""
    var username = ""
    var isSignUp = false
    var isLoading = false
    var errorMessage: String?

    func signIn() async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Email and password are required"
            return
        }
        isLoading = true
        errorMessage = nil
        do {
            try await AuthService.shared.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signUp() async {
        guard !email.isEmpty, !password.isEmpty, !username.isEmpty else {
            errorMessage = "All fields are required"
            return
        }
        guard username.count >= 3, username.count <= 20 else {
            errorMessage = "Username must be 3-20 characters"
            return
        }
        guard password.count >= 6 else {
            errorMessage = "Password must be at least 6 characters"
            return
        }
        isLoading = true
        errorMessage = nil
        do {
            try await AuthService.shared.signUp(email: email, password: password, username: username)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

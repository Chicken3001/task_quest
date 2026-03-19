import SwiftUI

struct AccountView: View {
    @State private var username = ""
    @State private var email = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = true
    @State private var savingUsername = false
    @State private var savingPassword = false
    @State private var usernameMessage: (type: String, text: String)?
    @State private var passwordMessage: (type: String, text: String)?

    var body: some View {
        NavigationStack {
            ScrollView {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else {
                    VStack(spacing: 20) {
                        // Profile section
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Profile")
                                .font(.headline.bold())
                                .foregroundStyle(.white)

                            VStack(alignment: .leading, spacing: 6) {
                                Text("Email")
                                    .font(.caption.bold())
                                    .foregroundStyle(Color.violet400)
                                Text(email)
                                    .font(.subheadline)
                                    .foregroundStyle(Color.violet300)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 12)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color.white.opacity(0.05))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                Text("Username")
                                    .font(.caption.bold())
                                    .foregroundStyle(Color.violet400)
                                TextField("Username", text: $username)
                                    .textFieldStyle(QuestTextFieldStyle())
                                    .autocorrectionDisabled()
                                    .textInputAutocapitalization(.never)
                            }

                            if let msg = usernameMessage {
                                Text(msg.text)
                                    .font(.caption.bold())
                                    .foregroundStyle(msg.type == "success" ? .green : .red)
                            }

                            Button {
                                Task { await updateUsername() }
                            } label: {
                                if savingUsername {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Update Username")
                                }
                            }
                            .font(.subheadline.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .background(Color.violet600)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .disabled(savingUsername)
                        }
                        .cardStyle()

                        // Password section
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Change Password")
                                .font(.headline.bold())
                                .foregroundStyle(.white)

                            VStack(alignment: .leading, spacing: 6) {
                                Text("New Password")
                                    .font(.caption.bold())
                                    .foregroundStyle(Color.violet400)
                                SecureField("At least 6 characters", text: $newPassword)
                                    .textFieldStyle(QuestTextFieldStyle())
                                    .textContentType(.newPassword)
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                Text("Confirm Password")
                                    .font(.caption.bold())
                                    .foregroundStyle(Color.violet400)
                                SecureField("Re-enter password", text: $confirmPassword)
                                    .textFieldStyle(QuestTextFieldStyle())
                                    .textContentType(.newPassword)
                            }

                            if let msg = passwordMessage {
                                Text(msg.text)
                                    .font(.caption.bold())
                                    .foregroundStyle(msg.type == "success" ? .green : .red)
                            }

                            Button {
                                Task { await updatePassword() }
                            } label: {
                                if savingPassword {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Update Password")
                                }
                            }
                            .font(.subheadline.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .background(Color.violet600)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .disabled(savingPassword)
                        }
                        .cardStyle()

                        // Sign out
                        Button {
                            Task { try? await AuthService.shared.signOut() }
                        } label: {
                            Text("Sign Out")
                                .font(.subheadline.bold())
                                .foregroundStyle(.red)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color.red.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Color.red.opacity(0.3), lineWidth: 1)
                                )
                        }
                    }
                    .padding(16)
                }
            }
            .background(Color.background)
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .task { await loadProfile() }
        }
    }

    private func loadProfile() async {
        let profile = DataService.shared.profile ?? {
            Task { await DataService.shared.fetchAll() }
            return DataService.shared.profile
        }()
        username = profile?.username ?? ""
        if let session = try? await SupabaseService.client.auth.session {
            email = session.user.email ?? ""
        }
        isLoading = false
    }

    private func updateUsername() async {
        guard username.count >= 3, username.count <= 20 else {
            usernameMessage = ("error", "Username must be 3-20 characters")
            return
        }
        savingUsername = true
        usernameMessage = nil
        do {
            try await DataService.shared.updateUsername(username)
            usernameMessage = ("success", "Username updated")
        } catch {
            usernameMessage = ("error", error.localizedDescription)
        }
        savingUsername = false
    }

    private func updatePassword() async {
        guard newPassword.count >= 6 else {
            passwordMessage = ("error", "Password must be at least 6 characters")
            return
        }
        guard newPassword == confirmPassword else {
            passwordMessage = ("error", "Passwords do not match")
            return
        }
        savingPassword = true
        passwordMessage = nil
        do {
            try await SupabaseService.client.auth.update(user: .init(password: newPassword))
            passwordMessage = ("success", "Password updated")
            newPassword = ""
            confirmPassword = ""
        } catch {
            passwordMessage = ("error", error.localizedDescription)
        }
        savingPassword = false
    }
}

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
    @State private var hasApiKey = false
    @State private var dailyUsage = 0
    @State private var dailyLimit = 15
    @State private var researchCredits = 3
    @State private var personalInfo = ""
    @State private var savingPersonalInfo = false
    @State private var personalInfoMessage: (type: String, text: String)?
    @State private var apiKeyInput = ""
    @State private var savingApiKey = false
    @State private var apiKeyMessage: (type: String, text: String)?

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

                        // Personal Info section
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Personal Info")
                                .font(.headline.bold())
                                .foregroundStyle(.white)

                            Text("Describe your skills, preferences, and goals. The AI planner can use this to tailor quests to your background.")
                                .font(.caption)
                                .foregroundStyle(Color.violet400)

                            VStack(alignment: .leading, spacing: 6) {
                                TextField("e.g. I'm a beginner web developer learning React...", text: $personalInfo, axis: .vertical)
                                    .textFieldStyle(QuestTextFieldStyle())
                                    .lineLimit(3...8)
                            }

                            if let msg = personalInfoMessage {
                                Text(msg.text)
                                    .font(.caption.bold())
                                    .foregroundStyle(msg.type == "success" ? .green : .red)
                            }

                            Button {
                                Task { await savePersonalInfo() }
                            } label: {
                                if savingPersonalInfo {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Save Personal Info")
                                }
                            }
                            .font(.subheadline.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .background(Color.violet600)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .disabled(savingPersonalInfo)
                        }
                        .cardStyle()

                        // AI Settings section
                        VStack(alignment: .leading, spacing: 16) {
                            Text("AI Settings")
                                .font(.headline.bold())
                                .foregroundStyle(.white)

                            // Usage display
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Daily Usage")
                                    .font(.caption.bold())
                                    .foregroundStyle(Color.violet400)
                                if hasApiKey {
                                    Text("Unlimited (using your key)")
                                        .font(.subheadline.bold())
                                        .foregroundStyle(.green)
                                } else {
                                    Text("\(dailyUsage) / \(dailyLimit) requests today")
                                        .font(.subheadline)
                                        .foregroundStyle(Color.violet300)
                                    GeometryReader { geo in
                                        ZStack(alignment: .leading) {
                                            RoundedRectangle(cornerRadius: 4)
                                                .fill(Color.white.opacity(0.1))
                                                .frame(height: 8)
                                            RoundedRectangle(cornerRadius: 4)
                                                .fill(Color.violet500)
                                                .frame(width: geo.size.width * min(CGFloat(dailyUsage) / CGFloat(max(dailyLimit, 1)), 1.0), height: 8)
                                        }
                                    }
                                    .frame(height: 8)
                                }
                            }

                            // Research credits
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Research Credits")
                                    .font(.caption.bold())
                                    .foregroundStyle(Color.violet400)
                                HStack(spacing: 6) {
                                    Text("\(researchCredits) remaining")
                                        .font(.subheadline.bold())
                                        .foregroundStyle(.orange)
                                    Text("Web-powered deep research")
                                        .font(.caption2)
                                        .foregroundStyle(Color.violet400.opacity(0.7))
                                }
                            }

                            // API Key management
                            if hasApiKey {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("API key saved")
                                        .font(.subheadline.bold())
                                        .foregroundStyle(.green)
                                    Button {
                                        Task { await removeApiKey() }
                                    } label: {
                                        if savingApiKey {
                                            ProgressView().tint(.red)
                                        } else {
                                            Text("Remove Key")
                                        }
                                    }
                                    .font(.subheadline.bold())
                                    .foregroundStyle(.red)
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 12)
                                    .background(Color.red.opacity(0.1))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.red.opacity(0.3), lineWidth: 1)
                                    )
                                    .disabled(savingApiKey)
                                }
                            } else {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Gemini API Key")
                                        .font(.caption.bold())
                                        .foregroundStyle(Color.violet400)
                                    SecureField("Paste your API key", text: $apiKeyInput)
                                        .textFieldStyle(QuestTextFieldStyle())
                                        .autocorrectionDisabled()
                                        .textInputAutocapitalization(.never)
                                }

                                Button {
                                    Task { await saveApiKey() }
                                } label: {
                                    if savingApiKey {
                                        ProgressView().tint(.white)
                                    } else {
                                        Text("Save Key")
                                    }
                                }
                                .font(.subheadline.bold())
                                .foregroundStyle(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 12)
                                .background(apiKeyInput.trimmingCharacters(in: .whitespaces).isEmpty ? Color.violet600.opacity(0.5) : Color.violet600)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .disabled(savingApiKey || apiKeyInput.trimmingCharacters(in: .whitespaces).isEmpty)
                            }

                            if let msg = apiKeyMessage {
                                Text(msg.text)
                                    .font(.caption.bold())
                                    .foregroundStyle(msg.type == "success" ? .green : .red)
                            }

                            Link("Get a free API key from Google AI Studio",
                                 destination: URL(string: "https://aistudio.google.com/apikey")!)
                                .font(.caption)
                                .foregroundStyle(Color.violet400)
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
            .task {
                await loadProfile()
                await loadAISettings()
            }
        }
    }

    private func loadAISettings() async {
        do {
            let settings = try await APIService.getAISettings()
            hasApiKey = settings.hasApiKey
            dailyUsage = settings.dailyUsage
            dailyLimit = settings.dailyLimit
            researchCredits = settings.researchCredits ?? 3
        } catch { /* ignore */ }
    }

    private func saveApiKey() async {
        let key = apiKeyInput.trimmingCharacters(in: .whitespaces)
        guard !key.isEmpty else { return }
        savingApiKey = true
        apiKeyMessage = nil
        do {
            try await APIService.updateAPIKey(key)
            hasApiKey = true
            apiKeyInput = ""
            apiKeyMessage = ("success", "API key saved and validated")
        } catch {
            apiKeyMessage = ("error", error.localizedDescription)
        }
        savingApiKey = false
    }

    private func removeApiKey() async {
        savingApiKey = true
        apiKeyMessage = nil
        do {
            try await APIService.updateAPIKey(nil)
            hasApiKey = false
            apiKeyMessage = ("success", "API key removed")
        } catch {
            apiKeyMessage = ("error", error.localizedDescription)
        }
        savingApiKey = false
    }

    private func loadProfile() async {
        let profile = DataService.shared.profile ?? {
            Task { await DataService.shared.fetchAll() }
            return DataService.shared.profile
        }()
        username = profile?.username ?? ""
        personalInfo = profile?.personalInfo ?? ""
        if let session = try? await SupabaseService.client.auth.session {
            email = session.user.email ?? ""
        }
        isLoading = false
    }

    private func savePersonalInfo() async {
        savingPersonalInfo = true
        personalInfoMessage = nil
        do {
            try await DataService.shared.updatePersonalInfo(personalInfo.isEmpty ? nil : personalInfo)
            personalInfoMessage = ("success", "Personal info saved")
        } catch {
            personalInfoMessage = ("error", error.localizedDescription)
        }
        savingPersonalInfo = false
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

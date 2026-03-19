import SwiftUI

struct LoginView: View {
    @State private var viewModel = AuthViewModel()

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Logo
            VStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(
                            LinearGradient(
                                colors: [.violet600, .purple, .indigo600],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 80, height: 80)
                        .shadow(color: .violet500.opacity(0.4), radius: 15)

                    Image(systemName: "shield.checkered")
                        .font(.system(size: 30))
                        .foregroundStyle(.white)
                }

                Text("Task Quest")
                    .font(.system(size: 30, weight: .black))
                    .foregroundStyle(.white)
            }
            .padding(.bottom, 32)

            // Form card
            VStack(spacing: 16) {
                Text(viewModel.isSignUp ? "Create Account" : "Welcome Back")
                    .font(.title2.bold())
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text(viewModel.isSignUp ? "Start your quest adventure" : "Continue your quest")
                    .font(.subheadline)
                    .foregroundStyle(Color.violet400)
                    .frame(maxWidth: .infinity, alignment: .leading)

                VStack(spacing: 12) {
                    if viewModel.isSignUp {
                        TextField("Username", text: $viewModel.username)
                            .textFieldStyle(QuestTextFieldStyle())
                            .textContentType(.username)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                    }

                    TextField("Email", text: $viewModel.email)
                        .textFieldStyle(QuestTextFieldStyle())
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)

                    SecureField("Password", text: $viewModel.password)
                        .textFieldStyle(QuestTextFieldStyle())
                        .textContentType(viewModel.isSignUp ? .newPassword : .password)
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.red)
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    Task {
                        if viewModel.isSignUp {
                            await viewModel.signUp()
                        } else {
                            await viewModel.signIn()
                        }
                    }
                } label: {
                    Group {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text(viewModel.isSignUp ? "Create Account" : "Sign In")
                                .font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(
                            colors: [.violet600, .indigo600],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .shadow(color: .violet500.opacity(0.25), radius: 8)
                }
                .disabled(viewModel.isLoading)

                Button {
                    withAnimation {
                        viewModel.isSignUp.toggle()
                        viewModel.errorMessage = nil
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(viewModel.isSignUp ? "Already have an account?" : "Need an account?")
                            .foregroundStyle(Color.violet400)
                        Text(viewModel.isSignUp ? "Sign In" : "Sign Up")
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.violet300)
                    }
                    .font(.subheadline)
                }
            }
            .cardStyle()
            .padding(.horizontal, 24)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.background)
    }
}

struct QuestTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<_Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.white.opacity(0.05))
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.cardBorder, lineWidth: 1)
            )
    }
}

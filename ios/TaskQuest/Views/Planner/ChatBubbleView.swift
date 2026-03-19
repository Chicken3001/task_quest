import SwiftUI

struct ChatBubbleView: View {
    let message: ChatMessage

    private var isUser: Bool { message.role == .user }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 60) }

            Text(message.content)
                .font(.subheadline)
                .foregroundStyle(isUser ? .white : .foreground)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    isUser
                        ? AnyShapeStyle(LinearGradient(colors: [.violet600, .indigo600], startPoint: .topLeading, endPoint: .bottomTrailing))
                        : AnyShapeStyle(Color.cardBg)
                )
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(
                    !isUser
                        ? RoundedRectangle(cornerRadius: 16).stroke(Color.cardBorder, lineWidth: 1)
                        : nil
                )

            if !isUser { Spacer(minLength: 60) }
        }
    }
}

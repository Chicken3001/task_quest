import SwiftUI

extension Color {
    static let background = Color(red: 15/255, green: 10/255, blue: 30/255)
    static let cardBg = Color(red: 26/255, green: 19/255, blue: 51/255)
    static let cardBorder = Color(red: 45/255, green: 34/255, blue: 85/255)
    static let accent = Color(red: 139/255, green: 92/255, blue: 246/255)
    static let accentGlow = Color(red: 139/255, green: 92/255, blue: 246/255).opacity(0.3)
    static let gold = Color(red: 251/255, green: 191/255, blue: 36/255)
    static let xpBar = Color(red: 34/255, green: 197/255, blue: 94/255)

    // Violet shades
    static let violet300 = Color(red: 196/255, green: 181/255, blue: 253/255)
    static let violet400 = Color(red: 167/255, green: 139/255, blue: 250/255)
    static let violet500 = Color(red: 139/255, green: 92/255, blue: 246/255)
    static let violet600 = Color(red: 124/255, green: 58/255, blue: 237/255)

    // Indigo
    static let indigo500 = Color(red: 99/255, green: 102/255, blue: 241/255)
    static let indigo600 = Color(red: 79/255, green: 70/255, blue: 229/255)

    // Difficulty colors
    static let easyGreen = Color(red: 16/255, green: 185/255, blue: 129/255)
    static let mediumYellow = Color(red: 245/255, green: 158/255, blue: 11/255)
    static let hardOrange = Color(red: 249/255, green: 115/255, blue: 22/255)
    static let epicRed = Color(red: 239/255, green: 68/255, blue: 68/255)

    // Other
    static let foreground = Color(red: 226/255, green: 224/255, blue: 255/255)
}

extension ShapeStyle where Self == Color {
    static var cardBackground: Color { .cardBg }
}

struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(20)
            .background(Color.cardBg)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.cardBorder, lineWidth: 1)
            )
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}

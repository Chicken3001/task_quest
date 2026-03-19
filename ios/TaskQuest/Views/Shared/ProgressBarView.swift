import SwiftUI

struct ProgressBarView: View {
    let progress: Double
    var gradient: [Color] = [.violet500, .indigo500]
    var height: CGFloat = 10

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(Color.white.opacity(0.1))

                RoundedRectangle(cornerRadius: height / 2)
                    .fill(LinearGradient(colors: gradient, startPoint: .leading, endPoint: .trailing))
                    .frame(width: max(0, geo.size.width * min(progress, 1.0)))
                    .animation(.spring(response: 0.5, dampingFraction: 0.7), value: progress)
            }
        }
        .frame(height: height)
    }
}

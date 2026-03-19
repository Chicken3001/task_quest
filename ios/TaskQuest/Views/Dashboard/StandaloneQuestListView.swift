import SwiftUI

struct StandaloneQuestListView: View {
    let viewModel: DashboardViewModel

    var body: some View {
        VStack(spacing: 12) {
            ForEach(viewModel.dataService.standaloneQuests) { quest in
                QuestSectionView(quest: quest, viewModel: viewModel, indented: false)
            }
        }
    }
}

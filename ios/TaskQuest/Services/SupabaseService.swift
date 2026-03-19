import Foundation
import Supabase

/// UserDefaults-based session storage (Keychain requires code signing)
struct UserDefaultsAuthStorage: AuthLocalStorage, Sendable {
    func store(key: String, value: Data) throws {
        UserDefaults.standard.set(value, forKey: key)
    }

    func retrieve(key: String) throws -> Data? {
        UserDefaults.standard.data(forKey: key)
    }

    func remove(key: String) throws {
        UserDefaults.standard.removeObject(forKey: key)
    }
}

enum SupabaseService {
    static let client = SupabaseClient(
        supabaseURL: Config.supabaseURL,
        supabaseKey: Config.supabaseAnonKey,
        options: SupabaseClientOptions(
            auth: .init(
                storage: UserDefaultsAuthStorage(),
                emitLocalSessionAsInitialSession: true
            )
        )
    )
}

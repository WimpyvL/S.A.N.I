import Foundation

public enum SANILocationMode: String, Codable, Sendable, CaseIterable {
    case off
    case whileUsing
    case always
}

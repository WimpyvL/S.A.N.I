import SANIKit
import SANIProtocol
import Foundation

// Prefer the SANIKit wrapper to keep gateway request payloads consistent.
typealias AnyCodable = SANIKit.AnyCodable
typealias InstanceIdentity = SANIKit.InstanceIdentity

extension AnyCodable {
    var stringValue: String? { self.value as? String }
    var boolValue: Bool? { self.value as? Bool }
    var intValue: Int? { self.value as? Int }
    var doubleValue: Double? { self.value as? Double }
    var dictionaryValue: [String: AnyCodable]? { self.value as? [String: AnyCodable] }
    var arrayValue: [AnyCodable]? { self.value as? [AnyCodable] }

    var foundationValue: Any {
        switch self.value {
        case let dict as [String: AnyCodable]:
            dict.mapValues { $0.foundationValue }
        case let array as [AnyCodable]:
            array.map(\.foundationValue)
        default:
            self.value
        }
    }
}

extension SANIProtocol.AnyCodable {
    var stringValue: String? { self.value as? String }
    var boolValue: Bool? { self.value as? Bool }
    var intValue: Int? { self.value as? Int }
    var doubleValue: Double? { self.value as? Double }
    var dictionaryValue: [String: SANIProtocol.AnyCodable]? { self.value as? [String: SANIProtocol.AnyCodable] }
    var arrayValue: [SANIProtocol.AnyCodable]? { self.value as? [SANIProtocol.AnyCodable] }

    var foundationValue: Any {
        switch self.value {
        case let dict as [String: SANIProtocol.AnyCodable]:
            dict.mapValues { $0.foundationValue }
        case let array as [SANIProtocol.AnyCodable]:
            array.map(\.foundationValue)
        default:
            self.value
        }
    }
}

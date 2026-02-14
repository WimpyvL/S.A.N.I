// swift-tools-version: 6.2
// Package manifest for the SANI macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "SANI",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "SANIIPC", targets: ["SANIIPC"]),
        .library(name: "SANIDiscovery", targets: ["SANIDiscovery"]),
        .executable(name: "SANI", targets: ["SANI"]),
        .executable(name: "sani-mac", targets: ["SANIMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/SANIKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "SANIIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "SANIDiscovery",
            dependencies: [
                .product(name: "SANIKit", package: "SANIKit"),
            ],
            path: "Sources/SANIDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "SANI",
            dependencies: [
                "SANIIPC",
                "SANIDiscovery",
                .product(name: "SANIKit", package: "SANIKit"),
                .product(name: "SANIChatUI", package: "SANIKit"),
                .product(name: "SANIProtocol", package: "SANIKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/SANI.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "SANIMacCLI",
            dependencies: [
                "SANIDiscovery",
                .product(name: "SANIKit", package: "SANIKit"),
                .product(name: "SANIProtocol", package: "SANIKit"),
            ],
            path: "Sources/SANIMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "SANIIPCTests",
            dependencies: [
                "SANIIPC",
                "SANI",
                "SANIDiscovery",
                .product(name: "SANIProtocol", package: "SANIKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])

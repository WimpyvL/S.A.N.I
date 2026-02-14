import Foundation
import Testing
@testable import SANI

@Suite(.serialized)
struct SANIConfigFileTests {
    @Test
    func configPathRespectsEnvOverride() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("sani-config-\(UUID().uuidString)")
            .appendingPathComponent("sani.json")
            .path

        await TestIsolation.withEnvValues(["SANI_CONFIG_PATH": override]) {
            #expect(SANIConfigFile.url().path == override)
        }
    }

    @MainActor
    @Test
    func remoteGatewayPortParsesAndMatchesHost() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("sani-config-\(UUID().uuidString)")
            .appendingPathComponent("sani.json")
            .path

        await TestIsolation.withEnvValues(["SANI_CONFIG_PATH": override]) {
            SANIConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "ws://gateway.ts.net:19999",
                    ],
                ],
            ])
            #expect(SANIConfigFile.remoteGatewayPort() == 19999)
            #expect(SANIConfigFile.remoteGatewayPort(matchingHost: "gateway.ts.net") == 19999)
            #expect(SANIConfigFile.remoteGatewayPort(matchingHost: "gateway") == 19999)
            #expect(SANIConfigFile.remoteGatewayPort(matchingHost: "other.ts.net") == nil)
        }
    }

    @MainActor
    @Test
    func setRemoteGatewayUrlPreservesScheme() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("sani-config-\(UUID().uuidString)")
            .appendingPathComponent("sani.json")
            .path

        await TestIsolation.withEnvValues(["SANI_CONFIG_PATH": override]) {
            SANIConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "wss://old-host:111",
                    ],
                ],
            ])
            SANIConfigFile.setRemoteGatewayUrl(host: "new-host", port: 2222)
            let root = SANIConfigFile.loadDict()
            let url = ((root["gateway"] as? [String: Any])?["remote"] as? [String: Any])?["url"] as? String
            #expect(url == "wss://new-host:2222")
        }
    }

    @Test
    func stateDirOverrideSetsConfigPath() async {
        let dir = FileManager().temporaryDirectory
            .appendingPathComponent("sani-state-\(UUID().uuidString)", isDirectory: true)
            .path

        await TestIsolation.withEnvValues([
            "SANI_CONFIG_PATH": nil,
            "SANI_STATE_DIR": dir,
        ]) {
            #expect(SANIConfigFile.stateDirURL().path == dir)
            #expect(SANIConfigFile.url().path == "\(dir)/sani.json")
        }
    }
}

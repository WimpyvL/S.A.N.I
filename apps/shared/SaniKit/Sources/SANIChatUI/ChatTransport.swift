import Foundation

public enum SANIChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(SANIChatEventPayload)
    case agent(SANIAgentEventPayload)
    case seqGap
}

public protocol SANIChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> SANIChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [SANIChatAttachmentPayload]) async throws -> SANIChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> SANIChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<SANIChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension SANIChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "SANIChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> SANIChatSessionsListResponse {
        throw NSError(
            domain: "SANIChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}

package ai.sani.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class SANIProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", SANICanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", SANICanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", SANICanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", SANICanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", SANICanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", SANICanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", SANICanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", SANICanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", SANICapability.Canvas.rawValue)
    assertEquals("camera", SANICapability.Camera.rawValue)
    assertEquals("screen", SANICapability.Screen.rawValue)
    assertEquals("voiceWake", SANICapability.VoiceWake.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", SANIScreenCommand.Record.rawValue)
  }
}

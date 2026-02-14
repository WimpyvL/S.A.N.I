import type { SANIPluginApi } from "sani/plugin-sdk";
import { emptyPluginConfigSchema } from "sani/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: SANIPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;

import type { SANIPluginApi } from "../../src/plugins/types.js";
import { createLlmTaskTool } from "./src/llm-task-tool.js";

export default function register(api: SANIPluginApi) {
  api.registerTool(createLlmTaskTool(api), { optional: true });
}

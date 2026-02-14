import { loadConfig } from "../config/config.js";
import { getAgentLocalStatuses as getStatusAllAgentLocalStatuses } from "./status-all/agents.js";

export async function getAgentLocalStatuses() {
  const cfg = loadConfig();
  return await getStatusAllAgentLocalStatuses(cfg);
}

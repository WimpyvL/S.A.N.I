#!/usr/bin/env node

import module from "node:module";

// https://nodejs.org/api/module.html#module-compile-cache
if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
    try {
        module.enableCompileCache();
    } catch {
        // Ignore errors
    }
}

// Only print the warning once, even across process respawns.
if (!process.env.SANI_DEPRECATION_WARNED) {
    console.warn("\x1b[33m%s\x1b[0m", "DEPRECATION NOTICE: 'openclaw' command is deprecated. Please use 'sani' instead.");
    process.env.SANI_DEPRECATION_WARNED = "1";
}

await import("./dist/entry.js");

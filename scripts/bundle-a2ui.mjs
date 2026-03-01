import { createHash } from "node:crypto";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const HASH_FILE = path.join(ROOT_DIR, "src/canvas-host/a2ui/.bundle.hash");
const OUTPUT_FILE = path.join(ROOT_DIR, "src/canvas-host/a2ui/a2ui.bundle.js");
const A2UI_RENDERER_DIR = path.join(ROOT_DIR, "vendor/a2ui/renderers/lit");
const A2UI_APP_DIR = path.join(ROOT_DIR, "apps/shared/SaniKit/Tools/CanvasA2UI");

async function walk(entryPath, files) {
    if (!existsSync(entryPath)) return;
    const st = await fs.stat(entryPath);
    if (st.isDirectory()) {
        const entries = await fs.readdir(entryPath);
        for (const entry of entries) {
            await walk(path.join(entryPath, entry), files);
        }
        return;
    }
    files.push(entryPath);
}

function normalize(p) {
    return p.split(path.sep).join("/");
}

async function run() {
    if (!existsSync(A2UI_RENDERER_DIR) || !existsSync(A2UI_APP_DIR)) {
        console.log("A2UI sources missing; keeping prebuilt bundle.");
        return;
    }

    const INPUT_PATHS = [
        path.join(ROOT_DIR, "package.json"),
        path.join(ROOT_DIR, "pnpm-lock.yaml"),
        A2UI_RENDERER_DIR,
        A2UI_APP_DIR,
    ];

    const files = [];
    for (const input of INPUT_PATHS) {
        await walk(input, files);
    }

    files.sort((a, b) => normalize(a).localeCompare(normalize(b)));

    const hash = createHash("sha256");
    for (const filePath of files) {
        const rel = normalize(path.relative(ROOT_DIR, filePath));
        hash.update(rel);
        hash.update("\0");
        hash.update(await fs.readFile(filePath));
        hash.update("\0");
    }

    const current_hash = hash.digest("hex");

    if (existsSync(HASH_FILE) && existsSync(OUTPUT_FILE)) {
        const previous_hash = await fs.readFile(HASH_FILE, "utf-8");
        if (previous_hash.trim() === current_hash) {
            console.log("A2UI bundle up to date; skipping.");
            return;
        }
    }

    console.log("Building A2UI bundle...");

    // Run tsc
    const tscResult = spawnSync("pnpm", ["-s", "exec", "tsc", "-p", path.join(A2UI_RENDERER_DIR, "tsconfig.json")], {
        stdio: "inherit",
        shell: true,
    });

    if (tscResult.status !== 0) {
        process.exit(tscResult.status || 1);
    }

    // Run rolldown
    const rolldownResult = spawnSync("rolldown", ["-c", path.join(A2UI_APP_DIR, "rolldown.config.mjs")], {
        stdio: "inherit",
        shell: true,
    });

    if (rolldownResult.status !== 0) {
        process.exit(rolldownResult.status || 1);
    }

    await fs.writeFile(HASH_FILE, current_hash);
    console.log("A2UI bundle updated.");
}

run().catch((err) => {
    console.error("A2UI bundling failed:", err);
    process.exit(1);
});

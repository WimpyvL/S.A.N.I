import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.';

function walk(dir) {
    if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('dist')) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath);
        } else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.md') || fullPath.endsWith('.json') || fullPath.endsWith('.mjs') || fullPath.endsWith('.js'))) {
            if (entry.name === 'pnpm-lock.yaml') continue;

            let content = fs.readFileSync(fullPath, 'utf-8');
            let changed = false;

            // Env vars
            if (content.includes('SANI_')) {
                content = content.replace(/SANI_/g, 'SANI_');
                changed = true;
            }

            // Scoped packages
            if (content.includes('@sani/')) {
                content = content.replace(/@sani\//g, '@sani/');
                changed = true;
            }

            // Commands and lower case mentions
            if (content.includes('sani')) {
                content = content.replace(/sani/g, 'sani');
                changed = true;
            }

            // Title case / Proper case mentions
            if (content.includes('SANI')) {
                content = content.replace(/SANI/g, 'SANI');
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

walk(root);

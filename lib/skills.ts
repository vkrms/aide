import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = join(process.cwd(), 'skills');

export function loadSkills(): string {
    if (!existsSync(SKILLS_DIR)) return '';

    const files = readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.md')).sort();

    if (files.length === 0) return '';

    const sections = files.map((file) => {
        const content = readFileSync(join(SKILLS_DIR, file), 'utf-8');
        return content.trim();
    });

    return '\n\n' + sections.join('\n\n');
}

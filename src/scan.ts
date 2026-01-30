import { readdir, readFile } from 'fs/promises';
import path from 'path';
import ignore from 'ignore';


async function getAllFiles(currentPath: string): Promise<string[]> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
            const subfiles = await getAllFiles(fullPath);
            files.push(...subfiles);
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }

    return files;
}


export async function getFilteredFiles(rootPath: string) {
    const gitignorePath = path.join(rootPath, '.gitignore');
    let ig = ignore();

    try {
        const gitignoreContent = await readFile(gitignorePath, 'utf-8');
        ig = ignore().add(gitignoreContent);
    } catch {
        console.log('No .gitignore found');
    }

    const allFiles = await getAllFiles(rootPath);

    const filteredFiles = allFiles.filter(file => {
        const relativePath = path.relative(rootPath, file);
        return !ig.ignores(relativePath);
    });

    return filteredFiles;
}

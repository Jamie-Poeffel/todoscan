import { vol } from 'memfs';

jest.mock('fs/promises', () => {
    const memfs = require('memfs');
    return memfs.vol.promises;
});

import { getFilteredFiles } from '../../src/scan';

const normalizePath = (p: string) => p.replace(/\\/g, '/');
const normalizePaths = (paths: string[]) => paths.map(normalizePath);

describe('getFilteredFiles', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
        vol.reset();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        vol.reset();
        consoleLogSpy.mockRestore();
    });

    it('should return all files when no .gitignore exists', async () => {
        vol.fromJSON({
            '/test-project/file1.ts': 'content',
            '/test-project/file2.js': 'content',
            '/test-project/subdir/file3.ts': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(normalized).toHaveLength(3);
        expect(normalized).toContain('/test-project/file1.ts');
        expect(normalized).toContain('/test-project/file2.js');
        expect(normalized).toContain('/test-project/subdir/file3.ts');
    });

    it('should filter files based on .gitignore patterns', async () => {
        vol.fromJSON({
            '/test-project/.gitignore': 'node_modules/\n*.log\n',
            '/test-project/file1.ts': 'content',
            '/test-project/file2.log': 'content',
            '/test-project/node_modules/package.json': 'content',
            '/test-project/src/index.ts': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(normalized).toHaveLength(3);
        expect(normalized).toContain('/test-project/.gitignore');
        expect(normalized).toContain('/test-project/file1.ts');
        expect(normalized).toContain('/test-project/src/index.ts');
        expect(normalized).not.toContain('/test-project/file2.log');
        expect(normalized).not.toContain('/test-project/node_modules/package.json');
    });

    it('should handle empty directory', async () => {
        vol.fromJSON({
            '/test-project/.gitkeep': '',
        });

        vol.unlinkSync('/test-project/.gitkeep');

        const files = await getFilteredFiles('/test-project');

        expect(files).toHaveLength(0);
    });

    it('should handle nested directories', async () => {
        vol.fromJSON({
            '/test-project/.gitignore': 'build/',
            '/test-project/src/utils/helper.ts': 'content',
            '/test-project/src/components/Button.tsx': 'content',
            '/test-project/build/bundle.js': 'content',
            '/test-project/build/nested/file.js': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(normalized).toContain('/test-project/src/utils/helper.ts');
        expect(normalized).toContain('/test-project/src/components/Button.tsx');
        expect(normalized).not.toContain('/test-project/build/bundle.js');
        expect(normalized).not.toContain('/test-project/build/nested/file.js');
    });

    it('should handle complex .gitignore patterns', async () => {
        vol.fromJSON({
            '/test-project/.gitignore': `
# Dependencies
node_modules/
*.log

# Build outputs
dist/
build/

# IDE
.vscode/
.idea/

# Specific files
config.local.ts
!important.log
`,
            '/test-project/src/index.ts': 'content',
            '/test-project/node_modules/lib.js': 'content',
            '/test-project/debug.log': 'content',
            '/test-project/dist/bundle.js': 'content',
            '/test-project/.vscode/settings.json': 'content',
            '/test-project/config.local.ts': 'content',
            '/test-project/important.log': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(normalized).toContain('/test-project/src/index.ts');
        expect(normalized).toContain('/test-project/important.log');
        expect(normalized).not.toContain('/test-project/node_modules/lib.js');
        expect(normalized).not.toContain('/test-project/debug.log');
        expect(normalized).not.toContain('/test-project/dist/bundle.js');
        expect(normalized).not.toContain('/test-project/.vscode/settings.json');
        expect(normalized).not.toContain('/test-project/config.local.ts');
    });

    it('should handle wildcard patterns', async () => {
        vol.fromJSON({
            '/test-project/.gitignore': '*.test.ts\ntemp-*',
            '/test-project/index.ts': 'content',
            '/test-project/utils.test.ts': 'content',
            '/test-project/helper.test.ts': 'content',
            '/test-project/temp-file.txt': 'content',
            '/test-project/temp-data.json': 'content',
            '/test-project/data.json': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(normalized).toContain('/test-project/index.ts');
        expect(normalized).toContain('/test-project/data.json');
        expect(normalized).not.toContain('/test-project/utils.test.ts');
        expect(normalized).not.toContain('/test-project/helper.test.ts');
        expect(normalized).not.toContain('/test-project/temp-file.txt');
        expect(normalized).not.toContain('/test-project/temp-data.json');
    });

    it('should handle directory-only patterns', async () => {
        vol.fromJSON({
            '/test-project/.gitignore': 'cache/',
            '/test-project/src/index.ts': 'content',
            '/test-project/cache/data.json': 'content',
            '/test-project/cache/nested/file.txt': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(normalized).toContain('/test-project/src/index.ts');
        expect(normalized).not.toContain('/test-project/cache/data.json');
        expect(normalized).not.toContain('/test-project/cache/nested/file.txt');
    });

    it('should handle empty .gitignore file', async () => {
        vol.fromJSON({
            '/test-project/.gitignore': '',
            '/test-project/file1.ts': 'content',
            '/test-project/file2.js': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(normalized).toHaveLength(3);
        expect(normalized).toContain('/test-project/file1.ts');
        expect(normalized).toContain('/test-project/file2.js');
    });

    it('should handle .gitignore with only comments and whitespace', async () => {
        vol.fromJSON({
            '/test-project/.gitignore': `
# This is a comment

  # Another comment
  
`,
            '/test-project/file1.ts': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(normalized).toContain('/test-project/file1.ts');
    });

    it('should return absolute paths', async () => {
        vol.fromJSON({
            '/test-project/file.ts': 'content',
            '/test-project/subdir/nested.ts': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        normalized.forEach(file => {
            expect(file).toMatch(/^\/test-project\//);
        });
    });

    it('should handle paths with special characters', async () => {
        vol.fromJSON({
            '/test-project/.gitignore': '*.tmp',
            '/test-project/file-name.ts': 'content',
            '/test-project/file_name.js': 'content',
            '/test-project/file.tmp': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(normalized).toContain('/test-project/file-name.ts');
        expect(normalized).toContain('/test-project/file_name.js');
        expect(normalized).not.toContain('/test-project/file.tmp');
    });

    it('should handle root-relative patterns', async () => {
        vol.fromJSON({
            '/test-project/.gitignore': '/dist',
            '/test-project/dist/bundle.js': 'content',
            '/test-project/src/dist/other.js': 'content',
            '/test-project/src/index.ts': 'content',
        });

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(normalized).toContain('/test-project/src/index.ts');
        expect(normalized).toContain('/test-project/src/dist/other.js');
        expect(normalized).not.toContain('/test-project/dist/bundle.js');
    });

    it('should handle large number of files efficiently', async () => {
        const fileStructure: Record<string, string> = {
            '/test-project/.gitignore': '*.log',
        };

        for (let i = 0; i < 100; i++) {
            fileStructure[`/test-project/file${i}.ts`] = 'content';
            if (i % 10 === 0) {
                fileStructure[`/test-project/debug${i}.log`] = 'content';
            }
        }

        vol.fromJSON(fileStructure);

        const files = await getFilteredFiles('/test-project');
        const normalized = normalizePaths(files);

        expect(files.length).toBe(101);
        expect(normalized.filter(f => f.endsWith('.log'))).toHaveLength(0);
        expect(normalized.filter(f => f.endsWith('.ts'))).toHaveLength(100);
    });
});
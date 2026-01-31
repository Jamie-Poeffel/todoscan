import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

export class ProjectConfig {
    private readonly FILE_NAME = '.todoscan_project.json';
    private readonly LOCATION: string;

    public projectId: string = '';

    constructor(cwd: string) {
        this.LOCATION = join(cwd, this.FILE_NAME);

        if (existsSync(this.LOCATION)) {
            this.projectId = JSON.parse(readFileSync(this.LOCATION, 'utf-8')).projectId;
        }
    }

    public save(projectId: string) {
        this.projectId = projectId;
        writeFileSync(this.LOCATION, JSON.stringify({ projectId }, null, 2), {
            encoding: 'utf-8',
            mode: 0o600
        });

        this.addToGitignore();
    }

    private addToGitignore() {
        const gitignorePath = join(process.cwd(), '.gitignore');
        let gitignoreContent = '';

        if (existsSync(gitignorePath)) {
            gitignoreContent = readFileSync(gitignorePath, 'utf-8');
        }

        if (!gitignoreContent.split('\n').includes(this.FILE_NAME)) {
            appendFileSync(gitignorePath, `\n${this.FILE_NAME}\n`, { encoding: 'utf-8' });
            console.log(`Added ${this.FILE_NAME} to .gitignore`);
        }
    }
}

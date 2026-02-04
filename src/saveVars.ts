import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import os from 'os';
import prompts from 'prompts';
import chalk from 'chalk';

export class SaveVars {
    private readonly FILE_NAME = '.todoscan_secrets.json';
    private readonly LOCATION: string;

    private static instance: SaveVars | null = null;

    public API_TOKEN_TASKIST: string = "";
    public API_TOKEN_GITLAB: string = "";
    public API_TOKEN_GITHUB: string = "";
    public readonly API_URL_GITLAB: string = "";
    public IS_GIT_INIT: boolean = (this.API_TOKEN_GITLAB == "" && this.API_TOKEN_GITHUB == "");

    private secrets: Record<string, string> = {};

    private constructor() {
        this.LOCATION = join(os.homedir(), this.FILE_NAME);
        this.loadFile();
        this.API_TOKEN_TASKIST = this.secrets['api-token-taskist'] ?? "";
        this.API_TOKEN_GITLAB = this.secrets['api-token-gitlab'] ?? "";
        this.IS_GIT_INIT = Boolean(this.secrets['git-init']) ?? false;

        if (!this.secrets['api-url-gitlab']) {
            this.secrets['api-url-gitlab'] = "https://gitlab.com/api/v4";
        }
    }

    public static async getInstance(): Promise<SaveVars> {
        if (!this.instance) {
            this.instance = new SaveVars();
            while (!this.instance.API_TOKEN_TASKIST) {
                try {
                    await this.instance.promptForToken();
                } catch (err) {
                    console.log('Token is required to continue.');
                }
            }
        }
        return this.instance;
    }


    private setIS_GIT_INIT(value: boolean) {
        this.IS_GIT_INIT = value
        this.secrets["git-init"] = String(value)
        this.saveFile();
    }

    public setGitlabToken(value: string) {
        this.setIS_GIT_INIT(true);
        this.API_TOKEN_GITLAB = value
        this.secrets["api-token-gitlab"] = value
        this.saveFile();
    }

    public setGithubToken(value: string) {
        this.setIS_GIT_INIT(true);
        this.API_TOKEN_GITHUB = value
        this.secrets["api-token-github"] = value
        this.saveFile();
    }

    public resetState() {
        this.setIS_GIT_INIT(false);
        this.saveFile();
    }

    private loadFile() {
        if (existsSync(this.LOCATION)) {
            try {
                const content = readFileSync(this.LOCATION, 'utf-8');
                this.secrets = JSON.parse(content);
            } catch (error) {
                console.error('Failed to read secrets file:', error);
                this.secrets = {};
            }
        }
    }

    private async promptForToken(): Promise<void> {
        console.log(
            "You need a Todoist API token to use this CLI.\n" +
            "If you don't have one, you can create it here:\n" +
            chalk.gray.bold.underline("https://app.todoist.com/app/settings/integrations/developer\n")
        );

        const response = await prompts({
            type: 'password',
            name: 'value',
            message: 'Enter your Todoist API token:',
            validate: value =>
                value.length > 10 ? true : 'Token should be atleast 10 characters long'
        });

        if (!response.value) {
            throw new Error('No token provided. Login cancelled.');
        }

        this.secrets['api-token-taskist'] = response.value;
        this.API_TOKEN_TASKIST = response.value;
        this.saveFile();
        console.log(chalk.green('√') + ' Token saved successfully!');
    }

    public async load(varName: string, promptIfMissing: boolean = true): Promise<string> {
        if (this.secrets[varName]) return this.secrets[varName];

        if (promptIfMissing) {
            const response = await prompts({
                type: 'text',
                name: 'value',
                message: `Enter value for ${varName}:`
            });

            if (!response.value) throw new Error(`No value provided for ${varName}`);

            this.secrets[varName] = response.value;
            this.saveFile();
            return response.value;
        }

        return '';
    }


    private saveFile() {
        try {
            writeFileSync(this.LOCATION, JSON.stringify(this.secrets, null, 2), {
                encoding: 'utf-8',
                mode: 0o600
            });
        } catch (error) {
            console.error('Failed to save secrets file:', error);
        }
    }
}

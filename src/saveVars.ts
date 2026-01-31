import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import os from 'os';
import prompts from 'prompts';
import chalk from 'chalk';
import { TodoistApi } from '@doist/todoist-api-typescript';
import { api } from './tasks';
import { title } from 'process';

export class SaveVars {
    private readonly FILE_NAME = '.todoscan_secrets.json';
    private readonly LOCATION: string;

    private static instance: SaveVars | null = null;

    public API_TOKEN_TASKIST: string = "";

    private secrets: Record<string, string> = {};

    private constructor() {
        this.LOCATION = join(os.homedir(), this.FILE_NAME);
        this.loadFile();
        this.API_TOKEN_TASKIST = this.secrets['api-token-taskist'] ?? "";
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

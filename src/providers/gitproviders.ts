import { IGitProvider } from "@/types/gitprovider";
import chalk from "chalk";
import prompts from "prompts";
import { SaveVars } from "../saveVars";

export class Gitlab implements IGitProvider {
    private projectId: string = "";

    printTokenMessage() {
        const url = 'https://gitlab.com/-/user_settings/personal_access_tokens';

        console.log(
            `You need a GITLAB Access token to use this functionality.\n` +
            "If you don't have one, you can create it here:\n" +
            chalk.gray.bold.underline(`${url}\n`)
        );
    }

    async prompt() {
        const response = await prompts({
            type: 'password',
            name: 'value',
            message: `Enter your GITLAB Access token:`,
            validate: value =>
                value.startsWith('glpat-') ? true : 'Token must start with glpat- to be a Gitlab access token'
        });

        return response;
    }

    async setVarToken(token: string) {
        const vars = await SaveVars.getInstance();
        vars.setGitlabToken(token);
    }

    setProject(projectId: string) {
        this.projectId = projectId;
    }

    async getIssues(): Promise<any> {
        const vars = await SaveVars.getInstance();
        const baseUrl = 'https://gitlab.com/api/v4';
        const token = vars.API_TOKEN_GITLAB;
        const id = this.projectId;

        try {
            const response = await fetch(
                `${baseUrl}/projects/${id}/issues`,
                {
                    headers: {
                        'PRIVATE-TOKEN': token
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`GitLab API error: ${response.statusText}`);
            }

            const issues = await response.json();
            return issues;
        } catch (error) {
            console.error('Failed to fetch GitLab issues:', error);
            throw error;
        }
    }
}

export class Github implements IGitProvider {
    private owner: string = "";
    private repo: string = "";

    printTokenMessage() {
        const url = 'https://github.com/settings/personal-access-tokens'

        console.log(
            `You need a GITHUB Access token to use this functionality.\n` +
            "If you don't have one, you can create it here:\n" +
            chalk.gray.bold.underline(`${url}\n`)
        );
    }

    async prompt() {
        const response = await prompts({
            type: 'password',
            name: 'value',
            message: `Enter your GITHUB Access token:`,
            validate: value =>
                value.startsWith('github_pat_') ? true : 'Token must start with github_pat_ to be a Github access token'
        });

        return response;
    }

    async setVarToken(token: string) {
        const vars = await SaveVars.getInstance();
        vars.setGithubToken(token);
    }

    async fetchRepos(): Promise<any> {
        const vars = await SaveVars.getInstance();
        const baseUrl = 'https://api.github.com';
        const token = vars.API_TOKEN_GITHUB;

        try {
            const response = await fetch(
                `${baseUrl}/user/repos`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.statusText}`);
            }

            const repos = await response.json();
            return repos;
        } catch (error) {
            console.error('Failed to fetch GitHub repos:', error);
            throw error;
        }
    }

    async getIssues(): Promise<any> {
        const vars = await SaveVars.getInstance();
        const baseUrl = 'https://api.github.com/issues';
        const token = await vars.load("api-token-github", false)
            ;

        try {
            const response = await fetch(
                baseUrl,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json'
                    }
                }
            );

            if (!response.ok) {
                const message = await response.json();
                throw new Error(`GitHub API error: ${message.message}`);
            }

            const issues = await response.json();
            return issues;
        } catch (error) {
            console.error('Failed to fetch GitHub issues:', error);
            throw error;
        }
    }
}
import { IGitProvider } from "@/types/gitprovider";
import chalk from "chalk";
import prompts from "prompts";
import { SaveVars } from "../saveVars";

export class Gitlab implements IGitProvider {
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

}

export class Github implements IGitProvider {
    printTokenMessage() {
        const url = 'https://github.com/settings/tokens'


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
                value.startsWith('ghp_') ? true : 'Token must start with ghp_ to be a Github access token'
        });

        return response;
    }

    async setVarToken(token: string) {
        const vars = await SaveVars.getInstance();
        vars.setGithubToken(token);
    }
}

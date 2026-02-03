import chalk from "chalk";
import { SaveVars } from "./saveVars";
import prompts from "prompts";

export async function connectToGitlab() {
    const vars = await SaveVars.getInstance();


    if (!vars.API_TOKEN_GITLAB) {
        await getGitlabToken(vars);
    }

}

async function getGitlabToken(vars: SaveVars) {
    console.log(
        "You need a Gitlab Access token to use this functionality.\n" +
        "If you don't have one, you can create it here:\n" +
        chalk.gray.bold.underline("https://gitlab.com/-/user_settings/personal_access_tokens\n")
    );

    const response = await prompts({
        type: 'password',
        name: 'value',
        message: 'Enter your Gitlab Access token:',
        validate: value =>
            value.startsWith('glpat-') ? true : 'Token must start with glpat- to be a Gitlab access token'
    });

    if (!response.value) {
        return;
    }

    vars.setGitlabToken(response.value);
}

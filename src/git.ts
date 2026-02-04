import { SaveVars } from "./saveVars";
import { IGitProvider } from "@/types/gitprovider";
import { Github, Gitlab } from "./providers/gitproviders";

export async function connectToGitlab() {
    const vars = await SaveVars.getInstance();
    const gitlab = new Gitlab();

    if (!vars.API_TOKEN_GITLAB) {
        await getToken(gitlab);
    }

    return gitlab;
}

export async function connectToGithub() {
    const vars = await SaveVars.getInstance();
    const github = new Github();

    if (!vars.API_TOKEN_GITHUB) {
        await getToken(github);
    }

    return github;
}

async function getToken(provider: IGitProvider) {
    provider.printTokenMessage();

    const response = await provider.prompt();

    if (!response.value) {
        return;
    }

    provider.setVarToken(response.value);
}
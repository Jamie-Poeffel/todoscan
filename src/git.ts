import { SaveVars } from "./saveVars";
import { IGitProvider } from "@/types/gitprovider";
import { Github, Gitlab } from "./providers/gitproviders";

export async function connectToGitlab() {
    const vars = await SaveVars.getInstance();
    if (!vars.API_TOKEN_GITLAB) {
        await getToken(new Gitlab());
    }
}

export async function connectToGithub() {
    const vars = await SaveVars.getInstance();
    if (!vars.API_TOKEN_GITHUB) {
        await getToken(new Github());
    }
}

async function getToken(provider: IGitProvider) {
    provider.printTokenMessage();

    const response = await provider.prompt();

    if (!response.value) {
        return;
    }

    provider.setVarToken(response.value);
}
import { config, DotenvConfigOptions } from 'dotenv';

export class Environment {
    private static instance: Environment | undefined;

    public readonly API_TOKEN_TASKIST: string;

    private constructor(options?: DotenvConfigOptions) {
        config(options);

        const apiTokenTaskist = process.env.API_TOKEN_TASKIST;

        if (!apiTokenTaskist) {
            throw new Error("API_TOKEN_TASKIST is not set in environment variables");
        }

        this.API_TOKEN_TASKIST = apiTokenTaskist;
    }

    public static getInstance(options?: DotenvConfigOptions): Environment {
        if (!Environment.instance) {
            try {
                Environment.instance = new Environment(options);
            } catch (e: any) {
                throw new Error(e.message);
            }
        }


        return Environment.instance;
    }

    public static destroyInstance() {
        Environment.instance = undefined;
    }
}

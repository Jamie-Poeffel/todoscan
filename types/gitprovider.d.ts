export interface IGitProvider {
    printTokenMessage(): void;
    prompt(): Promise<{ value: string }>;
    setVarToken(token: string): Promise<void>;
}
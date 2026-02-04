export interface IGitProvider {
    printTokenMessage(): void;
    prompt(): Promise<{ value: string }>;
}
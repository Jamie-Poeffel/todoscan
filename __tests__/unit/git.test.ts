import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { connectToGitlab } from '@/src/git';
import prompts from 'prompts';
import { SaveVars } from '@/src/saveVars';

jest.mock('prompts');
jest.mock('../../src/saveVars', () => ({
    SaveVars: {
        getInstance: jest.fn(),
    },
    setIS_GIT_INIT: jest.fn(),
    setAPI_TOKEN_GITLAB: jest.fn(),
}));
jest.mock('chalk', () => ({
    default: {
        gray: {
            bold: {
                underline: (str: string) => str,
            }
        },
        green: (str: string) => str,
    },
    gray: {
        bold: {
            underline: (str: string) => str,
        }
    },
    green: (str: string) => str,
}));

const mockPrompts = prompts as jest.MockedFunction<typeof prompts>;

describe('connectToGit', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        const mockSaveVarsInstance = {
            API_TOKEN_GITLAB: undefined,
            setGitlabToken: jest.fn(),
        } as any;

        jest.mocked(SaveVars.getInstance).mockResolvedValue(mockSaveVarsInstance);

        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('connectToGitlab', () => {
        it('should prompt for token if not found in secrets file', async () => {
            const mockToken = 'glpat-token-789012';

            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            const instance = await SaveVars.getInstance();
            await connectToGitlab();

            expect(mockPrompts).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'password',
                    name: 'value',
                    message: 'Enter your GITLAB Access token:'
                })
            );
            expect(instance.setGitlabToken).toHaveBeenCalledWith(mockToken);
        });

        it('should not prompt for token if found in secrets file', async () => {
            const mockToken = 'glpat-token-213445';

            const mockSaveVarsInstanceWithToken = {
                API_TOKEN_GITLAB: mockToken,
                setGitlabToken: jest.fn(),
            } as any;

            jest.mocked(SaveVars.getInstance).mockResolvedValue(mockSaveVarsInstanceWithToken);

            await connectToGitlab();

            expect(mockPrompts).not.toHaveBeenCalled();
            expect(mockSaveVarsInstanceWithToken.setGitlabToken).not.toHaveBeenCalled();
        });
    });
});
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import os from 'os';
import prompts from 'prompts';
import chalk from 'chalk';
import { SaveVars } from '../../src/saveVars';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('os');
jest.mock('prompts');
jest.mock('chalk', () => ({
    default: {
        gray: {
            bold: {
                underline: (str: string) => str,
            },
        },
        green: (str: string) => str,
    },
    gray: {
        bold: {
            underline: (str: string) => str,
        },
    },
    green: (str: string) => str,
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockJoin = join as jest.MockedFunction<typeof join>;
const mockHomedir = os.homedir as jest.MockedFunction<typeof os.homedir>;
const mockPrompts = prompts as jest.MockedFunction<typeof prompts>;

describe('SaveVars', () => {
    let consoleLogSpy: ReturnType<typeof jest.spyOn>;
    let consoleErrorSpy: ReturnType<typeof jest.spyOn>;
    const mockHomeDir = '/home/testuser';
    const secretsFileName = '.todoscan_secrets.json';
    const secretsFilePath = '/home/testuser/.todoscan_secrets.json';

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset the singleton instance
        (SaveVars as any).instance = null;

        // Mock os.homedir
        mockHomedir.mockReturnValue(mockHomeDir);

        // Mock path.join
        mockJoin.mockImplementation((...paths: string[]) => paths.join('/'));

        // Spy on console methods
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(jest.fn());
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.restoreAllMocks();
    });

    describe('getInstance', () => {
        it('should create a new instance if none exists', async () => {
            const mockToken = 'valid-token-123456';
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({ 'api-token-taskist': mockToken })
            );

            const instance = await SaveVars.getInstance();

            expect(instance).toBeInstanceOf(SaveVars);
            expect(instance.API_TOKEN_TASKIST).toBe(mockToken);
        });

        it('should return the same instance on subsequent calls (singleton)', async () => {
            const mockToken = 'valid-token-123456';
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(
                JSON.stringify({ 'api-token-taskist': mockToken })
            );

            const instance1 = await SaveVars.getInstance();
            const instance2 = await SaveVars.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should prompt for token if not found in secrets file', async () => {
            const mockToken = 'new-token-789012';
            mockExistsSync.mockReturnValue(false);
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            const instance = await SaveVars.getInstance();

            expect(mockPrompts).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'password',
                    name: 'value',
                    message: 'Enter your Todoist API token:',
                })
            );
            expect(instance.API_TOKEN_TASKIST).toBe(mockToken);
            expect(mockWriteFileSync).toHaveBeenCalled();
        });

        it('should retry prompting if token is not provided initially', async () => {
            const mockToken = 'retry-token-456789';
            mockExistsSync.mockReturnValue(false);

            // First attempt: no value provided
            mockPrompts.mockResolvedValueOnce({ value: '' });
            // Second attempt: valid token provided
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            const instance = await SaveVars.getInstance();

            expect(mockPrompts).toHaveBeenCalledTimes(2);
            expect(consoleLogSpy).toHaveBeenCalledWith('Token is required to continue.');
            expect(instance.API_TOKEN_TASKIST).toBe(mockToken);
        });

        it('should handle empty secrets file', async () => {
            const mockToken = 'new-token-empty-file';
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue('{}');
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            const instance = await SaveVars.getInstance();

            expect(instance.API_TOKEN_TASKIST).toBe(mockToken);
        });
    });

    describe('constructor and loadFile', () => {
        it('should load secrets from existing file', async () => {
            const mockSecrets = {
                'api-token-taskist': 'existing-token',
                'other-secret': 'other-value',
            };
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockSecrets));

            const instance = await SaveVars.getInstance();

            expect(mockReadFileSync).toHaveBeenCalledWith(secretsFilePath, 'utf-8');
            expect(instance.API_TOKEN_TASKIST).toBe('existing-token');
        });

        it('should handle missing secrets file', async () => {
            const mockToken = 'new-token';
            mockExistsSync.mockReturnValue(false);
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            const instance = await SaveVars.getInstance();

            expect(mockReadFileSync).not.toHaveBeenCalled();
            expect(instance.API_TOKEN_TASKIST).toBe(mockToken);
        });

        it('should handle corrupted secrets file', async () => {
            const mockToken = 'recovery-token';
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue('invalid json {');
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            const instance = await SaveVars.getInstance();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to read secrets file:',
                expect.any(Error)
            );
            expect(instance.API_TOKEN_TASKIST).toBe(mockToken);
        });

        it('should set API_TOKEN_TASKIST to empty string if not in secrets', async () => {
            const mockToken = 'prompted-token';
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ 'some-other-key': 'value' }));
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            const instance = await SaveVars.getInstance();

            expect(instance.API_TOKEN_TASKIST).toBe(mockToken);
        });
    });

    describe('promptForToken', () => {
        it('should display instructions and prompt for token', async () => {
            mockExistsSync.mockReturnValue(false);
            const mockToken = 'user-entered-token';
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            await SaveVars.getInstance();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('You need a Todoist API token')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('https://app.todoist.com/app/settings/integrations/developer')
            );
            expect(mockPrompts).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'password',
                    name: 'value',
                    message: 'Enter your Todoist API token:',
                })
            );
        });

        it('should validate token length', async () => {
            mockExistsSync.mockReturnValue(false);
            mockPrompts.mockResolvedValueOnce({ value: 'valid-token-12345' });

            await SaveVars.getInstance();

            const promptCall = mockPrompts.mock.calls[0][0] as any;
            expect(promptCall.validate).toBeDefined();
            expect(promptCall.validate('short')).toBe('Token should be atleast 10 characters long');
            expect(promptCall.validate('valid-token-long')).toBe(true);
        });

        it('should save token after successful prompt', async () => {
            mockExistsSync.mockReturnValue(false);
            const mockToken = 'saved-token-123456';
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            await SaveVars.getInstance();

            expect(mockWriteFileSync).toHaveBeenCalledWith(
                secretsFilePath,
                expect.stringContaining(mockToken),
                expect.objectContaining({
                    encoding: 'utf-8',
                    mode: 0o600,
                })
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Token saved successfully!')
            );
        });

        it('should throw error if no token is provided', async () => {
            mockExistsSync.mockReturnValue(false);
            mockPrompts.mockResolvedValueOnce({ value: '' });
            mockPrompts.mockResolvedValueOnce({ value: 'valid-token' });

            await SaveVars.getInstance();

            expect(consoleLogSpy).toHaveBeenCalledWith('Token is required to continue.');
        });
    });

    describe('load', () => {
        it('should return existing secret value', async () => {
            const mockSecrets = {
                'api-token-taskist': 'token123',
                'existing-var': 'existing-value',
            };
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockSecrets));

            const instance = await SaveVars.getInstance();
            const value = await instance.load('existing-var');

            expect(value).toBe('existing-value');
            expect(mockPrompts).not.toHaveBeenCalled();
        });

        it('should prompt for missing value when promptIfMissing is true', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ 'api-token-taskist': 'token' }));

            const instance = await SaveVars.getInstance();

            const newValue = 'new-secret-value';
            mockPrompts.mockResolvedValueOnce({ value: newValue });

            const value = await instance.load('new-var');

            expect(mockPrompts).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'text',
                    name: 'value',
                    message: 'Enter value for new-var:',
                })
            );
            expect(value).toBe(newValue);
            expect(mockWriteFileSync).toHaveBeenCalled();
        });

        it('should return empty string for missing value when promptIfMissing is false', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ 'api-token-taskist': 'token' }));

            const instance = await SaveVars.getInstance();
            const value = await instance.load('missing-var', false);

            expect(value).toBe('');
            expect(mockPrompts).not.toHaveBeenCalled();
        });

        it('should throw error if no value provided in prompt', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ 'api-token-taskist': 'token' }));

            const instance = await SaveVars.getInstance();
            mockPrompts.mockResolvedValueOnce({ value: '' });

            await expect(instance.load('new-var')).rejects.toThrow(
                'No value provided for new-var'
            );
        });

        it('should save new value to file', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ 'api-token-taskist': 'token' }));

            const instance = await SaveVars.getInstance();
            mockPrompts.mockResolvedValueOnce({ value: 'new-value' });

            await instance.load('new-var');

            const savedContent = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
            expect(savedContent['new-var']).toBe('new-value');
            expect(savedContent['api-token-taskist']).toBe('token');
        });
    });

    describe('saveFile', () => {
        it('should save secrets with correct file permissions', async () => {
            mockExistsSync.mockReturnValue(false);
            const mockToken = 'token-for-save-test';
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            await SaveVars.getInstance();

            expect(mockWriteFileSync).toHaveBeenCalledWith(
                secretsFilePath,
                expect.any(String),
                expect.objectContaining({
                    encoding: 'utf-8',
                    mode: 0o600,
                })
            );
        });

        it('should format JSON with proper indentation', async () => {
            mockExistsSync.mockReturnValue(false);
            const mockToken = 'formatted-token';
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            await SaveVars.getInstance();

            const savedContent = mockWriteFileSync.mock.calls[0][1] as string;
            const parsed = JSON.parse(savedContent);

            expect(savedContent).toContain('\n');
            expect(parsed['api-token-taskist']).toBe(mockToken);
        });

        it('should handle write errors gracefully', async () => {
            mockExistsSync.mockReturnValue(false);
            mockPrompts.mockResolvedValueOnce({ value: 'token' });

            const writeError = new Error('Permission denied');
            mockWriteFileSync.mockImplementationOnce(() => {
                throw writeError;
            });

            await SaveVars.getInstance();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to save secrets file:',
                writeError
            );
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete workflow: create, prompt, save, load', async () => {
            // Initial creation with prompt
            mockExistsSync.mockReturnValue(false);
            const mockToken = 'integration-token';
            mockPrompts.mockResolvedValueOnce({ value: mockToken });

            const instance = await SaveVars.getInstance();
            expect(instance.API_TOKEN_TASKIST).toBe(mockToken);

            // Load additional variable
            mockPrompts.mockResolvedValueOnce({ value: 'custom-value' });
            const customVar = await instance.load('custom-var');
            expect(customVar).toBe('custom-value');

            // Verify all data was saved
            const lastSaveCall = mockWriteFileSync.mock.calls[mockWriteFileSync.mock.calls.length - 1];
            const savedData = JSON.parse(lastSaveCall[1] as string);
            expect(savedData['api-token-taskist']).toBe(mockToken);
            expect(savedData['custom-var']).toBe('custom-value');
        });

        it('should maintain singleton across multiple operations', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ 'api-token-taskist': 'token' }));

            const instance1 = await SaveVars.getInstance();
            mockPrompts.mockResolvedValueOnce({ value: 'value1' });
            await instance1.load('var1');

            const instance2 = await SaveVars.getInstance();
            const var1Value = await instance2.load('var1', false);

            expect(instance1).toBe(instance2);
            expect(var1Value).toBe('value1');
        });
    });
});
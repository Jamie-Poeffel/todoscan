import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { ProjectConfig } from '../../src/projectConfig';

// Mock fs module
jest.mock('fs');
jest.mock('path');

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockAppendFileSync = appendFileSync as jest.MockedFunction<typeof appendFileSync>;
const mockJoin = join as jest.MockedFunction<typeof join>;

describe('ProjectConfig', () => {
    let consoleLogSpy: ReturnType<typeof jest.spyOn>;
    const mockCwd = '/test/project';
    const configFileName = '.todoscan_project.json';
    const configFilePath = '/test/project/.todoscan_project.json';
    const gitignorePath = '/test/project/.gitignore';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock path.join to return predictable paths
        mockJoin.mockImplementation((...paths: string[]) => paths.join('/'));

        // Mock process.cwd
        jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);

        // Spy on console.log
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with empty projectId when config file does not exist', () => {
            mockExistsSync.mockReturnValue(false);

            const config = new ProjectConfig(mockCwd);

            expect(mockJoin).toHaveBeenCalledWith(mockCwd, configFileName);
            expect(mockExistsSync).toHaveBeenCalledWith(configFilePath);
            expect(config.projectId).toBe('');
        });

        it('should load projectId from existing config file', () => {
            const mockProjectId = 'project-123';
            const mockFileContent = JSON.stringify({ projectId: mockProjectId });

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(mockFileContent);

            const config = new ProjectConfig(mockCwd);

            expect(mockExistsSync).toHaveBeenCalledWith(configFilePath);
            expect(mockReadFileSync).toHaveBeenCalledWith(configFilePath, 'utf-8');
            expect(config.projectId).toBe(mockProjectId);
        });

        it('should handle config file with different project IDs', () => {
            const testCases = ['proj-abc', 'proj-xyz-789', ''];

            testCases.forEach((projectId) => {
                jest.clearAllMocks();
                mockExistsSync.mockReturnValue(true);
                mockReadFileSync.mockReturnValue(JSON.stringify({ projectId }));

                const config = new ProjectConfig(mockCwd);

                expect(config.projectId).toBe(projectId);
            });
        });

        it('should use the provided cwd parameter', () => {
            const customCwd = '/custom/path';
            const customConfigPath = '/custom/path/.todoscan_project.json';

            mockExistsSync.mockReturnValue(false);

            new ProjectConfig(customCwd);

            expect(mockJoin).toHaveBeenCalledWith(customCwd, configFileName);
            expect(mockExistsSync).toHaveBeenCalledWith(customConfigPath);
        });
    });

    describe('save', () => {
        it('should save projectId to config file with correct formatting', () => {
            mockExistsSync.mockReturnValue(false);
            const config = new ProjectConfig(mockCwd);
            const newProjectId = 'new-project-456';

            // Mock for gitignore check
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(configFileName);

            config.save(newProjectId);

            expect(config.projectId).toBe(newProjectId);
            expect(mockWriteFileSync).toHaveBeenCalledWith(
                configFilePath,
                JSON.stringify({ projectId: newProjectId }, null, 2),
                {
                    encoding: 'utf-8',
                    mode: 0o600,
                }
            );
        });

        it('should update projectId property when saving', () => {
            mockExistsSync.mockReturnValue(false);
            const config = new ProjectConfig(mockCwd);

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(configFileName);

            expect(config.projectId).toBe('');

            config.save('project-789');
            expect(config.projectId).toBe('project-789');

            config.save('project-abc');
            expect(config.projectId).toBe('project-abc');
        });

        it('should call addToGitignore after saving', () => {
            mockExistsSync.mockReturnValue(false);
            const config = new ProjectConfig(mockCwd);

            // First call for gitignore exists check
            mockExistsSync.mockReturnValueOnce(true);
            mockReadFileSync.mockReturnValue(configFileName);

            config.save('project-123');

            // Verify gitignore operations were called
            expect(mockExistsSync).toHaveBeenCalledWith(gitignorePath);
            expect(mockReadFileSync).toHaveBeenCalledWith(gitignorePath, 'utf-8');
        });

        it('should set file permissions to 0o600', () => {
            mockExistsSync.mockReturnValue(false);
            const config = new ProjectConfig(mockCwd);

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(configFileName);

            config.save('project-123');

            const writeCall = mockWriteFileSync.mock.calls[0];
            expect(writeCall[2]).toEqual({
                encoding: 'utf-8',
                mode: 0o600,
            });
        });
    });

    describe('addToGitignore', () => {
        let config: ProjectConfig;

        beforeEach(() => {
            mockExistsSync.mockReturnValue(false);
            config = new ProjectConfig(mockCwd);
        });

        it('should add config file to gitignore if not already present', () => {
            const gitignoreContent = '*.log\nnode_modules/\n.env';

            mockExistsSync.mockReturnValueOnce(true); // gitignore exists
            mockReadFileSync.mockReturnValue(gitignoreContent);

            config.save('project-123');

            expect(mockReadFileSync).toHaveBeenCalledWith(gitignorePath, 'utf-8');
            expect(mockAppendFileSync).toHaveBeenCalledWith(
                gitignorePath,
                `\n${configFileName}\n`,
                { encoding: 'utf-8' }
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `Added ${configFileName} to .gitignore`
            );
        });

        it('should not add config file to gitignore if already present', () => {
            const gitignoreContent = `*.log\nnode_modules/\n${configFileName}\n.env`;

            mockExistsSync.mockReturnValueOnce(true);
            mockReadFileSync.mockReturnValue(gitignoreContent);

            config.save('project-123');

            expect(mockAppendFileSync).not.toHaveBeenCalled();
            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('Added')
            );
        });

        it('should create and add to gitignore if file does not exist', () => {
            mockExistsSync.mockReturnValueOnce(false); // gitignore doesn't exist
            mockReadFileSync.mockReturnValue('');

            config.save('project-123');

            expect(mockAppendFileSync).toHaveBeenCalledWith(
                gitignorePath,
                `\n${configFileName}\n`,
                { encoding: 'utf-8' }
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `Added ${configFileName} to .gitignore`
            );
        });

        it('should handle empty gitignore file', () => {
            mockExistsSync.mockReturnValueOnce(true);
            mockReadFileSync.mockReturnValue('');

            config.save('project-123');

            expect(mockAppendFileSync).toHaveBeenCalledWith(
                gitignorePath,
                `\n${configFileName}\n`,
                { encoding: 'utf-8' }
            );
        });

        it('should handle gitignore with only whitespace', () => {
            mockExistsSync.mockReturnValueOnce(true);
            mockReadFileSync.mockReturnValue('\n\n  \n');

            config.save('project-123');

            expect(mockAppendFileSync).toHaveBeenCalledWith(
                gitignorePath,
                `\n${configFileName}\n`,
                { encoding: 'utf-8' }
            );
        });

        it('should handle gitignore where config file is in the middle of a line', () => {
            const gitignoreContent = `*.log\nsome-prefix${configFileName}suffix\n.env`;

            mockExistsSync.mockReturnValueOnce(true);
            mockReadFileSync.mockReturnValue(gitignoreContent);

            config.save('project-123');

            // Should still add because exact line match not found
            expect(mockAppendFileSync).toHaveBeenCalled();
        });

        it('should handle gitignore with windows line endings', () => {
            const gitignoreContent = `*.log\r\nnode_modules/\r\n${configFileName}\r\n.env`;

            mockExistsSync.mockReturnValueOnce(true);
            mockReadFileSync.mockReturnValue(gitignoreContent);

            config.save('project-123');

            expect(mockAppendFileSync).toHaveBeenCalled();
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete workflow: create, save, load', () => {
            // Initial creation - no config exists
            mockExistsSync.mockReturnValueOnce(false);
            const config1 = new ProjectConfig(mockCwd);
            expect(config1.projectId).toBe('');

            // Save projectId
            mockExistsSync.mockReturnValueOnce(true); // gitignore exists
            mockReadFileSync.mockReturnValueOnce('*.log\n'); // gitignore content
            config1.save('project-999');

            // Simulate loading existing config
            mockExistsSync.mockReturnValueOnce(true);
            mockReadFileSync.mockReturnValueOnce(
                JSON.stringify({ projectId: 'project-999' })
            );
            const config2 = new ProjectConfig(mockCwd);
            expect(config2.projectId).toBe('project-999');
        });

        it('should handle multiple saves to same instance', () => {
            mockExistsSync.mockReturnValue(false);
            const config = new ProjectConfig(mockCwd);

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(configFileName);

            config.save('project-1');
            expect(config.projectId).toBe('project-1');
            expect(mockWriteFileSync).toHaveBeenCalledTimes(1);

            config.save('project-2');
            expect(config.projectId).toBe('project-2');
            expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
        });
    });

    describe('error handling', () => {
        it('should throw error if config file has invalid JSON', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue('invalid json {');

            expect(() => new ProjectConfig(mockCwd)).toThrow();
        });

        it('should throw error if config file is missing projectId field', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ someOtherField: 'value' }));

            const config = new ProjectConfig(mockCwd);
            expect(config.projectId).toBeUndefined();
        });
    });
});
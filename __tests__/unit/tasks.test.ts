import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TodoistApi } from '@doist/todoist-api-typescript';
import { api, resetApi, getTasks, addTask } from '../../src/tasks';
import { SaveVars } from '../../src/saveVars';
import chalk from 'chalk';

// Mock dependencies
jest.mock('@doist/todoist-api-typescript');
jest.mock('../../src/saveVars');
jest.mock('chalk', () => ({
    green: jest.fn((str) => str),
}));

describe('Todoist API Module', () => {
    let mockApi: jest.Mocked<TodoistApi>;
    let mockSaveVarsInstance: jest.Mocked<SaveVars>;
    let consoleLogSpy: ReturnType<typeof jest.spyOn>;
    let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
        // Reset the api singleton before each test
        resetApi();

        // Create mock TodoistApi instance
        mockApi = {
            getTasks: jest.fn(),
            addTask: jest.fn(),
        } as any;

        // Mock TodoistApi constructor
        (TodoistApi as jest.MockedClass<typeof TodoistApi>).mockImplementation(() => mockApi);

        // Mock SaveVars
        mockSaveVarsInstance = {
            API_TOKEN_TASKIST: 'test-api-token',
        } as any;
        (SaveVars.getInstance as jest.MockedFunction<typeof SaveVars.getInstance>).mockResolvedValue(
            mockSaveVarsInstance
        );

        // Spy on console methods
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(jest.fn());
    });

    afterEach(() => {
        jest.clearAllMocks();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('resetApi', () => {
        it('should reset the api instance to null', () => {
            resetApi();
            expect(api).toBeNull();
        });
    });

    describe('getTasks', () => {
        const projectId = 'project-123';
        const mockTasks = [
            { id: '1', content: 'Task 1', projectId },
            { id: '2', content: 'Task 2', projectId },
        ];

        it('should fetch tasks for a project successfully', async () => {
            mockApi.getTasks.mockResolvedValue({ results: mockTasks } as any);

            const result = await getTasks(projectId);

            expect(SaveVars.getInstance).toHaveBeenCalledTimes(1);
            expect(TodoistApi).toHaveBeenCalledWith('test-api-token');
            expect(mockApi.getTasks).toHaveBeenCalledWith({ projectId });
            expect(result).toEqual(mockTasks);
        });

        it('should reuse the same api instance on subsequent calls', async () => {
            mockApi.getTasks.mockResolvedValue({ results: mockTasks } as any);

            await getTasks(projectId);
            await getTasks(projectId);

            expect(SaveVars.getInstance).toHaveBeenCalledTimes(1);
            expect(TodoistApi).toHaveBeenCalledTimes(1);
        });

        it('should throw an error if API token is missing', async () => {
            mockSaveVarsInstance.API_TOKEN_TASKIST = '';

            await expect(getTasks(projectId)).rejects.toThrow(
                'API token missing after initialization'
            );
        });

        it('should handle and rethrow errors from the API', async () => {
            const apiError = new Error('API request failed');
            mockApi.getTasks.mockRejectedValue(apiError);

            await expect(getTasks(projectId)).rejects.toThrow('API request failed');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching tasks:', apiError);
        });
    });

    describe('addTask', () => {
        const projectId = 'project-123';
        const content = 'New task';
        const labels = ['urgent', 'work'];
        const mockTask = {
            id: 'task-1',
            content,
            projectId,
            labels,
        };

        it('should add a task successfully', async () => {
            mockApi.addTask.mockResolvedValue(mockTask as any);

            const result = await addTask(projectId, content, labels);

            expect(SaveVars.getInstance).toHaveBeenCalledTimes(1);
            expect(TodoistApi).toHaveBeenCalledWith('test-api-token');
            expect(mockApi.addTask).toHaveBeenCalledWith({ projectId, content, labels });
            expect(result).toEqual(mockTask);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Task added successfully')
            );
        });

        it('should log task details when debug is true', async () => {
            mockApi.addTask.mockResolvedValue(mockTask as any);

            await addTask(projectId, content, labels, true);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                'Task added:',
                content,
                'Labels:',
                labels
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Task added successfully')
            );
        });

        it('should not log task details when debug is false', async () => {
            mockApi.addTask.mockResolvedValue(mockTask as any);

            await addTask(projectId, content, labels, false);

            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                'Task added:',
                expect.anything(),
                'Labels:',
                expect.anything()
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Task added successfully')
            );
        });

        it('should use debug=false as default', async () => {
            mockApi.addTask.mockResolvedValue(mockTask as any);

            await addTask(projectId, content, labels);

            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                'Task added:',
                expect.anything(),
                'Labels:',
                expect.anything()
            );
        });

        it('should handle and rethrow errors from the API', async () => {
            const apiError = new Error('Failed to add task');
            mockApi.addTask.mockRejectedValue(apiError);

            await expect(addTask(projectId, content, labels)).rejects.toThrow(
                'Failed to add task'
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding task:', apiError);
        });

        it('should handle empty labels array', async () => {
            const taskWithoutLabels = { ...mockTask, labels: [] };
            mockApi.addTask.mockResolvedValue(taskWithoutLabels as any);

            const result = await addTask(projectId, content, []);

            expect(mockApi.addTask).toHaveBeenCalledWith({
                projectId,
                content,
                labels: [],
            });
            expect(result).toEqual(taskWithoutLabels);
        });
    });

    describe('API initialization', () => {
        it('should initialize API only once for multiple function calls', async () => {
            const projectId = 'project-123';
            mockApi.getTasks.mockResolvedValue({ results: [] } as any);
            mockApi.addTask.mockResolvedValue({} as any);

            await getTasks(projectId);
            await addTask(projectId, 'test', []);
            await getTasks(projectId);

            expect(SaveVars.getInstance).toHaveBeenCalledTimes(1);
            expect(TodoistApi).toHaveBeenCalledTimes(1);
        });

        it('should reinitialize API after reset', async () => {
            const projectId = 'project-123';
            mockApi.getTasks.mockResolvedValue({ results: [] } as any);

            await getTasks(projectId);
            resetApi();
            await getTasks(projectId);

            expect(SaveVars.getInstance).toHaveBeenCalledTimes(2);
            expect(TodoistApi).toHaveBeenCalledTimes(2);
        });
    });
});
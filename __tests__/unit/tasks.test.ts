import { TodoistApi } from '@doist/todoist-api-typescript';
import { Environment } from '../../src/env';

const mockGetTasks = jest.fn();
const mockAddTask = jest.fn();

jest.mock('@doist/todoist-api-typescript', () => {
    return {
        TodoistApi: jest.fn().mockImplementation(() => ({
            getTasks: mockGetTasks,
            addTask: mockAddTask,
        })),
    };
});

jest.mock('../../src/env', () => ({
    Environment: {
        getInstance: jest.fn(() => ({
            API_TOKEN_TASKIST: 'test-token-123',
        })),
    },
}));

import { getTasks, addTask } from '../../src/tasks';

describe('Todoist API functions', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('getTasks', () => {
        it('should fetch tasks and log their content and labels', async () => {
            const mockTasks = {
                results: [
                    { content: 'Task 1', labels: ['urgent', 'work'] },
                    { content: 'Task 2', labels: ['personal'] },
                    { content: 'Task 3', labels: [] },
                ],
            };

            mockGetTasks.mockResolvedValue(mockTasks);

            await getTasks('project-123');

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockGetTasks).toHaveBeenCalledWith({ projectId: 'project-123' });
            expect(consoleLogSpy).toHaveBeenCalledTimes(3);
            expect(consoleLogSpy).toHaveBeenNthCalledWith(1, 0, 'Task 1', ['urgent', 'work']);
            expect(consoleLogSpy).toHaveBeenNthCalledWith(2, 1, 'Task 2', ['personal']);
            expect(consoleLogSpy).toHaveBeenNthCalledWith(3, 2, 'Task 3', []);
        });

        it('should handle empty task list', async () => {
            const mockTasks = { results: [] };

            mockGetTasks.mockResolvedValue(mockTasks);

            await getTasks('project-123');

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockGetTasks).toHaveBeenCalledWith({ projectId: 'project-123' });
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should log error when getTasks fails', async () => {
            const error = new Error('API Error');
            mockGetTasks.mockRejectedValue(error);

            await getTasks('project-123');

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockGetTasks).toHaveBeenCalledWith({ projectId: 'project-123' });
            expect(consoleLogSpy).toHaveBeenCalledWith(error);
        });

        it('should handle different project IDs', async () => {
            const mockTasks = { results: [{ content: 'Task', labels: [] }] };
            mockGetTasks.mockResolvedValue(mockTasks);

            await getTasks('project-456');

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockGetTasks).toHaveBeenCalledWith({ projectId: 'project-456' });
        });
    });

    describe('addTask', () => {
        it('should add a task successfully without debug', async () => {
            const mockTask = {
                id: 'task-1',
                content: 'New task',
                labels: ['work', 'urgent'],
                projectId: 'project-123',
            };

            mockAddTask.mockResolvedValue(mockTask);

            const result = await addTask('project-123', 'New task', ['work', 'urgent']);

            expect(mockAddTask).toHaveBeenCalledWith({
                projectId: 'project-123',
                content: 'New task',
                labels: ['work', 'urgent'],
            });
            expect(result).toEqual(mockTask);
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should add a task successfully with debug enabled', async () => {
            const mockTask = {
                id: 'task-1',
                content: 'New task',
                labels: ['work'],
                projectId: 'project-123',
            };

            mockAddTask.mockResolvedValue(mockTask);

            const result = await addTask('project-123', 'New task', ['work'], true);

            expect(mockAddTask).toHaveBeenCalledWith({
                projectId: 'project-123',
                content: 'New task',
                labels: ['work'],
            });
            expect(result).toEqual(mockTask);
            expect(consoleLogSpy).toHaveBeenCalledWith('Task added:', 'New task', 'Labels:', ['work']);
        });

        it('should add a task with empty labels', async () => {
            const mockTask = {
                id: 'task-2',
                content: 'Task without labels',
                labels: [],
                projectId: 'project-123',
            };

            mockAddTask.mockResolvedValue(mockTask);

            const result = await addTask('project-123', 'Task without labels', []);

            expect(mockAddTask).toHaveBeenCalledWith({
                projectId: 'project-123',
                content: 'Task without labels',
                labels: [],
            });
            expect(result).toEqual(mockTask);
        });

        it('should handle error and log it', async () => {
            const error = new Error('Failed to add task');
            mockAddTask.mockRejectedValue(error);

            await expect(addTask('project-123', 'New task', ['work'])).rejects.toThrow('Failed to add task');

            expect(mockAddTask).toHaveBeenCalledWith({
                projectId: 'project-123',
                content: 'New task',
                labels: ['work'],
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding task:', error);
        });

        it('should handle network errors', async () => {
            const error = new Error('Network error');
            mockAddTask.mockRejectedValue(error);

            await expect(addTask('project-123', 'Task', [])).rejects.toThrow('Network error');

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding task:', error);
        });

        it('should handle different project IDs', async () => {
            const mockTask = {
                id: 'task-3',
                content: 'Task',
                labels: [],
                projectId: 'project-456',
            };

            mockAddTask.mockResolvedValue(mockTask);

            await addTask('project-456', 'Task', []);

            expect(mockAddTask).toHaveBeenCalledWith({
                projectId: 'project-456',
                content: 'Task',
                labels: [],
            });
        });

        it('should handle multiple labels', async () => {
            const mockTask = {
                id: 'task-4',
                content: 'Multi-label task',
                labels: ['urgent', 'work', 'important', 'deadline'],
                projectId: 'project-123',
            };

            mockAddTask.mockResolvedValue(mockTask);

            const result = await addTask('project-123', 'Multi-label task', ['urgent', 'work', 'important', 'deadline']);

            expect(result).toEqual(mockTask);
            expect(mockAddTask).toHaveBeenCalledWith({
                projectId: 'project-123',
                content: 'Multi-label task',
                labels: ['urgent', 'work', 'important', 'deadline'],
            });
        });
    });
});
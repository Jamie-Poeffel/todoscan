import { TodoistApi } from '@doist/todoist-api-typescript';
import { SaveVars } from './saveVars';
import chalk from 'chalk';

export let api: TodoistApi | null = null;

export function resetApi() {
    api = null;
}
/**
 * Ensure the API is initialized.
 * Returns the initialized TodoistApi instance.
 */
async function getApi(): Promise<TodoistApi> {
    if (!api) {
        const env = await SaveVars.getInstance();
        if (!env.API_TOKEN_TASKIST) {
            throw new Error('API token missing after initialization');
        }
        api = new TodoistApi(env.API_TOKEN_TASKIST);
    }
    return api;
}

/**
 * Get all tasks for a project
 */
export async function getTasks(projectId: string) {
    const api = await getApi();
    try {
        const tasks: any = await api.getTasks({ projectId });
        return tasks.results;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        throw error;
    }
}

/**
 * Add a task to a project
 */
export async function addTask(
    projectId: string,
    content: string,
    labels: string[],
    debug = false
) {
    const api = await getApi();
    try {
        const task = await api.addTask({ projectId, content, labels });
        if (debug) console.log('Task added:', task.content, 'Labels:', task.labels);
        console.log(chalk.green('√') + ' Task added successfully');
        return task;
    } catch (error) {
        console.error('Error adding task:', error);
        throw error;
    }
}

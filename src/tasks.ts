import { TodoistApi } from '@doist/todoist-api-typescript'
import { Environment } from './env';
const env = Environment.getInstance({ quiet: true });

const token = env.API_TOKEN_TASKIST;

const api = new TodoistApi(token)

export function getTasks(projectId: string) {
    api.getTasks({ projectId })
        .then((task) => task.results.map((t, _) => console.log(_, t.content, t.labels)))
        .catch((error) => console.log(error))
}

export async function addTask(projectId: string, content: string, labels: string[], debug: boolean = false) {
    try {
        const task = await api.addTask({ projectId, content, labels });
        debug && console.log('Task added:', task.content, 'Labels:', task.labels);
        return task;
    } catch (error) {
        console.error('Error adding task:', error);
        throw error;
    }
}
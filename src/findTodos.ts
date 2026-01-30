import { readFile } from "fs/promises";
import { getFilteredFiles } from "./scan";


export async function findTodos() {
    const files = await getFilteredFiles(process.cwd());
    const todos: Array<{ file: string; line: number; type: string; text: string }> = [];

    const todoRegex = /(TODO|FIXME|HACK|XXX|NOTE|BUG):\s*(.+)/;

    for (const file of files) {
        try {
            const content = await readFile(file, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                const match = line.match(todoRegex);
                if (match) {
                    todos.push({
                        file: file,
                        line: index + 1,
                        type: match[1].toUpperCase(),
                        text: match[2].trim()
                    });
                }
            });
        } catch (error) {
            // skip files that can not be read.
        }
    }

    return todos;
}




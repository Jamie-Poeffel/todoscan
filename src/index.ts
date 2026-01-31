#!/usr/bin/env node
import chalk from 'chalk';
import prompts from 'prompts';
import { addTask, getTasks } from './tasks';
import { findTodos } from './findTodos';
import { SaveVars } from './saveVars';
import { ProjectConfig } from './projectConfig';
import { TodoistApi } from '@doist/todoist-api-typescript';

const asciiArt = `
 ________               __                 
/        |             /  |                
$$$$$$$$/______    ____$$ |  ______        
   $$ | /      \\  /    $$ | /      \\       
   $$ |/$$$$$$  |/$$$$$$$ |/$$$$$$  |      
   $$ |$$ |  $$ |$$ |  $$ |$$ |  $$ |      
   $$ |$$ \\__$$ |$$ \\__$$ |$$ \\__$$ |      
   $$ |$$    $$/ $$    $$ |$$    $$/       
   $$/  $$$$$$/   $$$$$$$/  $$$$$$/        
                                                                              
`;

console.clear();
console.log(chalk.blue(asciiArt));

async function mainMenu() {
    const env = await SaveVars.getInstance();
    const projectConfig = new ProjectConfig(process.cwd());

    if (!projectConfig.projectId) {
        const api = new TodoistApi(env.API_TOKEN_TASKIST);
        const projects = await api.getProjects();
        const choice = await prompts({
            type: 'select',
            name: 'value',
            message: 'Select your project for this repo:',
            choices: projects.results.map(p => ({ title: p.name, value: p.id }))
        });
        projectConfig.save(choice.value);
    }

    const choices = [
        { title: 'Scan Todos', value: '1' },
        { title: 'List Todos', value: '2' },
    ];

    if (projectConfig.projectId) {
        choices.push({ title: 'Change Project', value: 'change_project' });
    }

    choices.push(
        { title: 'Clear', value: '3' },
        { title: 'Exit', value: '4' }
    );

    const option = await prompts({
        type: 'select',
        name: 'choice',
        message: 'Select Options (use arrowkeys to change, enter to confirm)',
        choices,
        hint: '- Arrow keys to change. Return to submit',
        instructions: false
    });

    if (option.choice === 'change_project') {
        const api = new TodoistApi(env.API_TOKEN_TASKIST);
        const projects = await api.getProjects();
        const choice = await prompts({
            type: 'select',
            name: 'value',
            message: 'Select your project for this repo:',
            choices: projects.results.map(p => ({ title: p.name, value: p.id }))
        });
        projectConfig.save(choice.value);
    }


    switch (option.choice) {
        case '1': {

            const todos = await findTodos();

            todos.forEach(todo => {
                console.log(`( ) ${todo.text}`);
            });

            const option = await prompts({
                type: 'select',
                name: 'addToTaskist',
                message: 'Want to add these to Taskist? ',
                choices: [
                    { title: 'True', value: true },
                    { title: 'False', value: false },
                ],
                instructions: false
            })

            if (option.addToTaskist) {
                for (const todo of todos) {
                    await addTask(projectConfig.projectId, todo.text, [todo.type])
                }

            }

            break;
        }

        case '2': {


            const todos = await getTasks(projectConfig.projectId);

            todos.forEach((todo: any) => {
                console.log(`( ) ${todo.content}`);
            });
            console.log('\n\n')

            break;
        }

        case '3': {
            console.clear();
            console.log(chalk.blue(asciiArt));
            await mainMenu();
            break;
        }

        case '4':
            console.log(chalk.yellow('Goodbye!'));
            process.exit(0);
    }

    await mainMenu();
}

mainMenu();
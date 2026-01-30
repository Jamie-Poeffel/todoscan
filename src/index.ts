#!/usr/bin/env node
import chalk from 'chalk';
import prompts from 'prompts';
import { addTask } from './tasks';
import { findTodos } from './findTodos';

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
    const option = await prompts({
        type: 'select',
        name: 'choice',
        message: 'Select Options (use arrowkeys to change, enter to confirm)',
        choices: [
            { title: 'Scan Todos', value: '1' },
            { title: 'Clear', value: '2' },
            { title: 'Exit', value: '3' },
        ],
        hint: '- Arrow keys to change. Return to submit',
        instructions: false
    });

    switch (option.choice) {
        case '1': {
            const todos = await findTodos();

            todos.forEach(todo => {
                console.log(`→ ${todo.text}`);
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
                todos.forEach(todo => {
                    addTask("6frwfj63jpR3v4gR", todo.text, [todo.type])
                });
            }

            break;
        }

        case '2': {
            console.clear();
            console.log(chalk.blue(asciiArt));
            await mainMenu();
            break;
        }

        case '3':
            console.log(chalk.yellow('Goodbye!'));
            process.exit(0);
    }

    await mainMenu();
}

mainMenu();
#!/usr/bin/env node
import chalk from 'chalk';
import prompts from 'prompts';
import { addTask, completeTask, getTasks } from './tasks';
import { findTodos } from './findTodos';
import { SaveVars } from './saveVars';
import { ProjectConfig } from './projectConfig';
import { TodoistApi } from '@doist/todoist-api-typescript';
import { connectToGithub, connectToGitlab } from './git';
import { IGitProvider } from '@/types/gitprovider';
import { Github, Gitlab } from './providers/gitproviders';

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

export function refreshView() {
    console.clear();
    console.log(chalk.blue(asciiArt));
}

let PROVIDER: IGitProvider | null = null
refreshView();

async function mainMenu() {
    const vars = await SaveVars.getInstance();

    const apiGithubToken = await vars.load("api-token-github", false)
    const apiGitlabToken = await vars.load("api-token-gitlab", false)

    if (apiGithubToken != "") {
        PROVIDER = new Github();
    } else if (apiGitlabToken != "") {
        PROVIDER = new Gitlab()
    } else {
        vars.resetState();
    }
    const projectConfig = new ProjectConfig(process.cwd());

    if (!projectConfig.projectId) {
        const api = new TodoistApi(vars.API_TOKEN_TASKIST);
        const projects = await api.getProjects();

        const message = "Select your project for this repo: "
        const option = await selectMenu(projects.results.map(p => ({ title: p.name, value: p.id })), message)
        projectConfig.save(option.choice);
    }

    const choices = [
        { title: 'Scan Todos', value: 'scan_todos' },
        { title: 'List Todos', value: 'list_todos' },
    ];

    if (projectConfig.projectId) {
        choices.push({ title: 'Change Project', value: 'change_project' });
    }

    const isGitInit = await vars.load('git-init', false);
    if (!isGitInit) {
        choices.push({ title: "Connect a Git", value: "connect_to_git" });
    } else {
        if (apiGitlabToken != "") {
            choices.push({ title: "Use GitLab", value: "gitlab" });
        } else if (apiGithubToken != "") {
            choices.push({ title: "Use GitHub", value: "github" });
        }
    }

    choices.push(
        { title: 'Settings', value: 'change_settings' },
        { title: 'Clear', value: 'clear_terminal' },
        { title: 'Exit', value: 'exit_app' }
    );

    const option = await selectMenu(choices);

    if (option.choice === 'change_project') {
        const api = new TodoistApi(vars.API_TOKEN_TASKIST);
        const projects = await api.getProjects();
        const message = "Select your project for this repo: "
        const option = await selectMenu(projects.results.map(p => ({ title: p.name, value: p.id })), message)
        projectConfig.save(option.choice);
    }


    switch (option.choice) {
        case 'scan_todos': {
            await scanTodos(projectConfig);
            break;
        }
        case 'connect_to_git': {
            await connectToGit();
            break;
        }
        case 'list_todos': {
            await listTodos(projectConfig);
            break;
        }
        case 'github': {
            await githubMenu();
            break;
        }
        case 'gitlab': {
            await gitlabMenu();
            break;
        }
        case 'change_settings': {
            break;
        }
        case 'clear_terminal': {
            await clearTerminal();
            break;
        }
        case 'exit_app': {
            exitApp();
        }

    }

    await mainMenu();
}

mainMenu();



/*---------------------Functions---------------------*/

async function scanTodos(projectConfig: ProjectConfig) {
    const todos = await findTodos();

    const choices = [
        { title: 'Select All', value: 'select_all' },
        ...todos.map((todo, index) => ({
            title: todo.text,
            value: index
        }))
    ];

    const selection = await prompts({
        type: 'multiselect',
        name: 'selected',
        message: 'Select todos to add to Taskist (Space to select, Enter to confirm):',
        choices: choices,
        instructions: false
    });

    let selectedTodos: typeof todos;

    if (selection.selected.includes('select_all')) {
        selectedTodos = todos;
    } else {
        selectedTodos = selection.selected.map((index: number) => todos[index]);
    }

    if (selectedTodos.length > 0) {
        for (const todo of selectedTodos) {
            await addTask(projectConfig.projectId, todo.text, [todo.type]);
        }
        console.log(`${chalk.green('√')} Added ${selectedTodos.length} task(s) to Taskist`);
    }
}

async function connectToGit() {
    const choices = [
        { title: "Gitlab", value: 'gitlab' },
        { title: "Github", value: 'github' }
    ];
    const git_option = await selectMenu(choices);

    refreshView();

    switch (git_option.choice) {
        case 'gitlab': {
            await connectToGitlab();
            break;
        }
        case 'github': {
            await connectToGithub();
            break;
        }
    }

    refreshView();
}

async function listTodos(projectConfig: ProjectConfig) {
    const todos = await getTasks(projectConfig.projectId);


    if (!todos || todos.length === 0) {
        console.log(chalk.red('×') + ' No tasks found');
        return;
    }

    console.log(`${chalk.blue('!')} You have ${todos.length} task(s) to do`);

    const choices = todos.map((todo: any) => ({
        title: todo.content,
        value: todo.id
    }));

    const result = await prompts({
        type: 'multiselect',
        name: 'value',
        message: 'Select tasks to complete (Space to select, Enter to confirm):',
        choices: choices,
        hint: '- Arrow keys to change. Return to complete',
        instructions: false
    });

    for (const taskId of result.value) {
        await completeTask(taskId);
    }

    console.log(`${chalk.green('√')} You have completed ${result.value.length} task(s)`);
}

async function clearTerminal() {
    refreshView();
    await mainMenu();
}

function exitApp() {
    console.log(chalk.yellow('Goodbye!'));
    process.exit(0);
}

async function selectMenu(choices: Array<{ title: string, value: string }>, message: string = "Select Options (use arrowkeys to change, enter to confirm)") {
    const option = await prompts({
        type: 'select',
        name: 'choice',
        message: message,
        choices,
        hint: '- Arrow keys to change. Return to submit',
        instructions: false
    });

    return option;
}

async function githubMenu() {
    const choices = [
        { title: 'List Issues', value: 'list_issues' },
        { title: 'Change provider', value: 'change_provider' },
        { title: 'back', value: 'back' },
    ];

    const option = await selectMenu(choices);

    await gitMenuParsing(option);
}

async function gitlabMenu() {
    const choices = [
        { title: 'Change provider', value: 'change_provider' },
        { title: 'back', value: 'back' },
    ];

    const option = await selectMenu(choices);

    await gitMenuParsing(option);
}

async function gitMenuParsing(option: prompts.Answers<"choice">) {
    switch (option.choice) {
        case 'list_issues': {
            await gitListIssues();
            break;
        }
        case 'change_provider': {
            await changeProvider();
            await connectToGit();
            await clearTerminal();
            break;
        }
        case 'back': {
            await clearTerminal();
            mainMenu();
            return;
        }
    }
}

async function changeProvider() {
    const vars = await SaveVars.getInstance();

    vars.setGithubToken("");
    vars.setGitlabToken("");
}

async function gitListIssues() {
    const issues = await PROVIDER?.getIssues();

    for (const issue of issues) {
        console.log(issue.title)
    }
}

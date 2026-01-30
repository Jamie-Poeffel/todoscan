# todocli

![npm](https://img.shields.io/npm/v/todoscan)
![npm](https://img.shields.io/npm/dw/todoscan)
![npm](https://img.shields.io/npm/l/todoscan)

A simple CLI tool that scans your codebase for TODO-style comments and optionally adds them as tasks to **Todoist**.

Stop forgetting TODOs buried in your code. Turn them into real, actionable tasks.

## Features

- Scans your project for:
  - `TODO`
  - `FIXME`
  - `HACK`
  - `BUG`
  - `NOTE`
  - `XXX`
- Shows found TODOs with file and line context
- Optionally pushes them directly to **Todoist**
- Ignores unreadable files safely
- Fast, lightweight, zero config to start

## Installation

### Run with npx (recommended)

```bash
npx todoscan
```

### or install globaly

```bash
npm install -g todoscan
```

### Run

```bash
todoscan

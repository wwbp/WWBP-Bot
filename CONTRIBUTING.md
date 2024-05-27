
# Contributing to Monorepo Project

## Introduction

Thank you for considering contributing to our project! This guide provides guidelines for contributing to the project, including code style, naming conventions, and commit messages.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project, you agree to abide by its terms.

## How to Contribute

1. **Fork the repository**
2. **Clone your forked repository** to your local machine:

    ```bash
    git clone git@github.com:wwbp/WWBP-Bot.git
    cd WWBP-Bot
    ```

3. **Create a new branch** for your feature or bug fix:

    ```bash
    git checkout -b feature-or-bugfix-name
    ```

4. **Make your changes** and commit them with a meaningful commit message.
5. **Push your changes** to your forked repository:

    ```bash
    git push origin feature-or-bugfix-name
    ```

6. **Create a pull request** from your branch to the `develop` repository.

## Style Guide

### Database Table

- **Table Names**: Use `snake_case` and plural form (e.g., `users`, `tasks`, `conversations`).
- **Column Names**: Use `snake_case` and singular form (e.g., `user_id`, `task_name`, `created_at`).
- **Boolean Columns**: Use prefixes like `is_` or `has_` (e.g., `is_active`, `has_feedback`).
- **Associative Tables**: Use a combination of the two related table names separated by an underscore (e.g., `user_roles`, `module_tasks`).

### Variables and Functions

- **Naming**: Use `snake_case` for variable and function names.
- **Descriptive Names**: Clearly convey the purpose or content.
- **Boolean Variables**: Use prefixes like `is_` or `has_` (e.g., `is_authenticated`, `has_permission`).

### API Endpoints

- **Naming**: Use lowercase and hyphens (e.g., `/users`, `/tasks/create`).
- **Resource Endpoints**: Use plural nouns (e.g., `/users`, `/tasks`).
- **Action Endpoints**: Use verb-noun combinations (e.g., `/tasks/create`, `/feedback/submit`).
- **Nested Resources**: Use a hierarchical structure (e.g., `/modules/{module_id}/tasks`).

### React Components

- **Naming**: Use `PascalCase` (e.g., `UserProfile`, `TaskList`).
- **Single Entity Components**: Use singular names (e.g., `TaskDetail`).
- **Collection Components**: Use plural names (e.g., `TaskList`).

### Asynchronous Tasks and Queues

- **Naming**: Use descriptive names and `snake_case` (e.g., `process_voice_input`, `fetch_feedback_data`).

### General Naming Conventions

- **Avoid Abbreviations and Acronyms**: Unless widely known.
- **Descriptive Names**: Convey the purpose or content of the entity.
- **Consistency**: Use the same conventions throughout the codebase.
- **Prefixes/Suffixes**: Indicate the type or purpose of an entity (e.g., `is_`, `has_`, `get_`, `create_`).

### Git Commit Messages

- **Prefix Commits**: Use prefixes like `Fix:`, `Test:`, `Doc:` (e.g., `Fix: corrected validation error`).
- Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) guidelines.

## Reporting Issues

If you encounter any issues, please open an issue on GitHub with a detailed description of the problem.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

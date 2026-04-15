# Clawdhub

A CLI tool for the ClawdHub registry to search, install, update, and publish agent skills.

## Installation

```bash
npm i -g clawdhub
npm i -g undici  # May be needed as dependency
```

## Usage

```bash
# Login (opens browser or uses token)
clawdhub login

# Search for skills
clawdhub search multi-search

# Install a skill
clawdhub install <author>/<skill-name>

# Update installed skills
clawdhub update

# List installed skills
clawdhub list

# Explore latest skills
clawdhub explore

# Publish a skill
clawdhub publish <skill-folder>
```

## Environment Variables

- `CLAWDHUB_SITE`: Custom site URL
- `CLAWDHUB_REGISTRY`: Custom registry API URL
- `CLAWDHUB_WORKDIR`: Working directory

## Options

- `--workdir <dir>`: Set working directory
- `--dir <dir>`: Set skills directory (default: ./skills)
- `--no-input`: Disable prompts
- `--force`: Force operations

## Version

v0.3.0 by Peter Steinberger (@steipete)
License: MIT-0

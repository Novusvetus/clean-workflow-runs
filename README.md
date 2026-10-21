# clean-workflow-runs [![publish](https://github.com/Novusvetus/clean-workflow-runs/actions/workflows/publish.yml/badge.svg)](https://github.com/Novusvetus/clean-workflow-runs/actions/workflows/publish.yml) [![stable](https://img.shields.io/badge/stability-stable-brightgreen.svg)](https://github.com/emersion/stability-badges#stable)

Flexible and configurable GitHub Action to remove completed workflow runs.

> This project is a modernized fork of `dmvict/clean-workflow-runs`.

## Why this action

GitHub's built-in retention is global and not very granular. This action lets you clean by workflow, branch, conclusions, age, and minimum retained runs.

## Quick start

```yaml
jobs:
    cleanup:
        runs-on: ubuntu-latest
        permissions:
            actions: write
            contents: read
        steps:
            - name: Delete old workflow runs
              uses: Novusvetus/clean-workflow-runs@v1
              with:
                  token: ${{ secrets.GITHUB_TOKEN }}
                  save_period: 30
                  save_min_runs_number: 1
```

## Inputs

| Name                        | Description                                                                       | Default                    |
| --------------------------- | --------------------------------------------------------------------------------- | -------------------------- |
| `token`                     | Token used for GitHub API calls.                                                  | `${{ github.token }}`      |
| `repo`                      | Target repository in the format `{owner}/{repo}`.                                 | `${{ github.repository }}` |
| `workflow_id`               | Workflow filename or numeric workflow ID. If unset, all workflows are considered. | _all workflows_            |
| `branch`                    | Filter by branch. If unset, all branches are considered.                          | _all branches_             |
| `run_conclusions`           | Filter by run conclusions. Supports multiline or comma-separated values.          | _all conclusions_          |
| `save_period`               | Keep runs newer than this period. Number = days, or `hh:mm:ss`.                   | `90`                       |
| `save_min_runs_number`      | Minimum number of matching runs to keep.                                          | `10`                       |
| `only_closed_pull_requests` | If `true`, delete only runs whose branch has at least one closed PR.              | `false`                    |
| `dry`                       | If `true`, print what would be deleted without deleting.                          | `false`                    |

### `run_conclusions` format

Multiline:

```yaml
run_conclusions: |
    cancelled
    skipped
```

Comma-separated:

```yaml
run_conclusions: cancelled,skipped
```

### `save_period` format

Days:

```yaml
save_period: 10
```

Time:

```yaml
save_period: "36:00:00"
```

## Examples

### Full configuration

```yaml
- name: Delete workflow runs
  uses: Novusvetus/clean-workflow-runs@v1
  with:
      token: ${{ secrets.GITHUB_TOKEN }}
      repo: user/repo
      workflow_id: ci.yml
      branch: main
      run_conclusions: |
          failure
          timed_out
      save_period: 30
      save_min_runs_number: 1
      only_closed_pull_requests: true
      dry: true
```

### Default behavior

Deletes completed runs older than 90 days while keeping at least 10 matching runs.

```yaml
jobs:
    cleanup:
        runs-on: ubuntu-latest
        permissions:
            actions: write
            contents: read
        steps:
            - uses: Novusvetus/clean-workflow-runs@v1
```

### Clean skipped/cancelled quickly

```yaml
jobs:
    cleanup:
        runs-on: ubuntu-latest
        permissions:
            actions: write
            contents: read
        steps:
            - uses: Novusvetus/clean-workflow-runs@v1
              with:
                  token: ${{ secrets.GITHUB_TOKEN }}
                  run_conclusions: |
                      cancelled
                      skipped
                  save_period: "06:00:00"
                  save_min_runs_number: 0
```

### Clean specific branches via matrix

```yaml
jobs:
    cleanup:
        strategy:
            matrix:
                branch: [dev, staging]
        runs-on: ubuntu-latest
        permissions:
            actions: write
            contents: read
        steps:
            - uses: Novusvetus/clean-workflow-runs@v1
              with:
                  token: ${{ secrets.GITHUB_TOKEN }}
                  branch: ${{ matrix.branch }}
                  run_conclusions: failure
                  save_period: 10
```

### Clean across repositories

For cross-repository cleanup, `GITHUB_TOKEN` may not have access. Use a PAT with sufficient repository and actions permissions.

```yaml
jobs:
    cleanup:
        strategy:
            matrix:
                repository: [user/repo-dev, user/repo-prod]
        runs-on: ubuntu-latest
        permissions:
            actions: write
            contents: read
        steps:
            - uses: Novusvetus/clean-workflow-runs@v1
              with:
                  token: ${{ secrets.CROSS_REPO_TOKEN }}
                  repo: ${{ matrix.repository }}
                  save_period: 120
```

## Required permissions

The token used by this action must be able to delete workflow runs:

- `actions: write`
- `contents: read`

## API usage and rate limits

This action can use many API calls:

- At least 1 request per 100 runs to list runs
- Plus 1 request per deleted run

Example: 3000 runs to delete ≈ `3000/100 + 3000 = 3030` requests.

See also: [GitHub REST API rate limits](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting).

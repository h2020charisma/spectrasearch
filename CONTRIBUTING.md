## Introduction

TBA

## Best practices

- **Do not commit to `main` directly**. Please use [feature branches](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow) and [pull requests](https://help.github.com/articles/about-pull-requests/). Only urgent fixes that are small enough may be directly merged to `main` without a pull request.

- **Rebase regularly**. If your feature branch has conflicts with `main`, you will be asked to rebase it before merging. Getting into the habit of [rebasing](https://git-scm.com/docs/git-rebase) your feature branches on a regular basis while still working on them will save you from the hassle of dealing with massive and probably hard-to-deal-with conflicts later.

- **Avoid merge commits when pulling**. If you made local commits on a branch, but there have also been new commits to it on GitHub, you will not be able to pull the branch cleanly (i.e., fast-forward it). By default, Git will try to incorporate the remote commits to your local branch with a merge commit. Do **not** do this. Either use `git pull --rebase` or run the following to change the default:

For the current repo only:
```sh
git config pull.rebase true
```

For all Git repos on this system:
```sh
git config --global pull.rebase true
```

## Tool requirements

TBA

## Start developing

TBA

## Running the formatters & linters

TBA

## Running the tests

TBA

## Using specific Node.js versions

TBA

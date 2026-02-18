# GitHub Runners Internals
 
GitHub self-hosted runners are systems you manage to execute GitHub Actions workflows, offering more control over hardware and software compared to GitHub-hosted ones. Behind the scenes, they connect outbound to GitHub services via a listener process that polls for jobs using long-polling over HTTPS. [youtube](https://www.youtube.com/watch?v=GHc-IvPRnMI)

## Core Components
The runner application consists of a **listener** and a **worker**. The listener handles registration, session setup, job polling, and acquisition, while the worker executes the actual job steps. It's built on a C# codebase forked from Azure Pipelines Agent, now migrated to GitHub's Broker API (e.g., `broker.actions.githubusercontent.com`). [sysdig](https://www.sysdig.com/blog/how-threat-actors-are-using-self-hosted-github-actions-runners-as-backdoors)

## Registration Process
You download the runner, generate a token from GitHub, and run `./config.sh` with parameters like `--url`, `--token`, and optional `--ephemeral` for single-use runners. This registers the runner (assigned an AgentId and PoolId) and fetches config including ServerUrlV2 for the Broker API and an RSA key for JWT/OAuth tokens. [depot](https://depot.dev/blog/github-actions-runner-architecture-part-1-the-listener)

## Job Polling Flow
1. Listener creates a session via POST to `/sessions`, providing agent details (id, name, version). [sysdig](https://www.sysdig.com/blog/how-threat-actors-are-using-self-hosted-github-actions-runners-as-backdoors)
2. Long-polls `/message` endpoint (up to 50s) with sessionId; returns 202 Accepted if no job, or `RunnerJobRequest` with `run_service_url` and `runner_request_id` when queued. [docs.github](https://docs.github.com/en/actions/reference/runners/self-hosted-runners)
3. Acquires job via POST to `/acquirejob` (2-min window); response includes full job plan and `planId` for lock renewal. [depot](https://depot.dev/blog/github-actions-runner-architecture-part-1-the-listener)
4. Background thread renews job lock every ~1 min via `/renewjob` until completion. [sysdig](https://www.sysdig.com/blog/how-threat-actors-are-using-self-hosted-github-actions-runners-as-backdoors)

## Execution and Cleanup
Listener spawns the worker with job details to run steps (checkout, commands, etc.). Post-job, runner reports results to GitHub; ephemeral runners auto-deregister. Runners must outbound-connect to domains like `*.actions.githubusercontent.com` on port 443. [youtube](https://www.youtube.com/watch?v=GHc-IvPRnMI)

## Key Internals Table

| Aspect          | Details                                                                 | Source      |
|-----------------|-------------------------------------------------------------------------|-------------|
| Polling Timeout | 50s hold; loops on 202; 60s pickup limit before re-queue  [docs.github](https://docs.github.com/en/actions/reference/runners/self-hosted-runners) | Listener   |
| Job Lock        | 10-min expiry; renew every 1 min  [depot](https://depot.dev/blog/github-actions-runner-architecture-part-1-the-listener)                               | Renewal    |
| Ephemeral Mode  | `--ephemeral` flag; single-job, then deregisters  [youtube](https://www.youtube.com/watch?v=GHc-IvPRnMI)               | Autoscaling|
| API Migration   | From Azure DevOps to GitHub Broker (V2 flow)  [depot](https://depot.dev/blog/github-actions-runner-architecture-part-1-the-listener)           | Backend    |

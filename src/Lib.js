import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
let octokit = null;

//

function actionOptionsGet() {
	let token = core.getInput("token");
	if (!token) token = process.env.GITHUB_TOKEN;
	if (!token)
		throw Error(
			"Expects token. Please add field `token` or set environment variable `GITHUB_TOKEN`.",
		);

	let repoRef = core.getInput("repo");
	if (!repoRef) repoRef = process.env.GITHUB_REPOSITORY;
	if (!repoRef)
		throw Error(
			"Expects repo in format {owner}/{repo_name}. Please add field `repo`.",
		);

	const splits = repoRef.split("/");
	const owner = splits[0];
	const repo = splits[1];
	if (!owner || !repo || splits.length > 2)
		throw Error(
			"Expects repo in format {owner}/{repo_name}. Please add field `repo`.",
		);

	let workflowId = core.getInput("workflow_id");
	if (workflowId && /^\d+$/.test(workflowId)) workflowId = Number(workflowId);
	const branch = core.getInput("branch");
	let conclusions = core.getMultilineInput("run_conclusions");
	if (conclusions.length === 1)
		conclusions = conclusions[0]
			.split(",")
			.map((v) => v.trim())
			.filter((v) => v !== "");

	const savePeriod = timeParse(core.getInput("save_period") || 90);
	let saveMinRunsNumber = core.getInput("save_min_runs_number");
	if (saveMinRunsNumber) saveMinRunsNumber = Number(saveMinRunsNumber);
	if (saveMinRunsNumber || saveMinRunsNumber === 0)
		saveMinRunsNumber = Math.ceil(saveMinRunsNumber);
	else saveMinRunsNumber = 10;
	const dry = inputAsBoolean("dry");
	const onlyClosedPullRequests = inputAsBoolean("only_closed_pull_requests");

	const options = {
		token,
		owner,
		repo,
		workflowId,
		branch,
		conclusions,
		savePeriod,
		saveMinRunsNumber,
		dry,
		onlyClosedPullRequests,
	};

	return options;
}

//

function inputAsBoolean(inputName) {
	const value = core.getInput(inputName);
	return typeof value === "string" && value.trim().toLowerCase() === "true";
}

//

function timeParse(src) {
	if (!Number.isNaN(Number(src))) return src * 86400000;

	if (typeof src !== "string")
		throw Error(
			'Unsupported time type. Please, set number of days as number or time in format "hh:mm:ss".',
		);

	const parts = src.trim().split(":");
	if (parts.length !== 3)
		throw Error(
			'Unsupported time format. Please set time in format: "hh:mm:ss"',
		);

	const hours = Number(parts[0]);
	const days = Math.trunc(hours / 24);

	const baseDelta = 86400000 * days;
	parts[0] = hours - days * 24;
	const result = baseDelta + Date.parse(`01 Jan 1970 ${parts.join(":")} GMT`);
	if (Number.isNaN(result)) throw Error("Wrong time format.");

	return result;
}

//

async function workflowRunsGet(options) {
	octokit = new Octokit({ auth: options.token });

	const result = [];
	let runs = null;

	let listWorkflowRunsRoutine = octokit.actions.listWorkflowRunsForRepo;
	const opts = {
		owner: options.owner,
		repo: options.repo,
		branch: options.branch,
		per_page: 100,
		page: 1,
	};
	if (options.workflowId) {
		opts.workflow_id = options.workflowId;
		listWorkflowRunsRoutine = octokit.actions.listWorkflowRuns;
	}

	do {
		const response = await listWorkflowRunsRoutine(opts);
		runs = response.data.workflow_runs;
		result.push(...runs);
		opts.page++;
	} while (runs.length === 100);

	return result;
}

//

function workflowRunsFilter(runs, options) {
	let result = runs.filter((e) => e.status === "completed");

	if (options.conclusions?.length)
		result = result.filter((e) => options.conclusions.includes(e.conclusion));

	let saveMinRunsNumber = options.saveMinRunsNumber;
	if (!saveMinRunsNumber || typeof saveMinRunsNumber !== "number")
		saveMinRunsNumber = 0;

	const savePeriod = Date.now() - options.savePeriod;
	result = result.filter((e) => {
		if (Date.parse(e.updated_at) < savePeriod) return true;
		saveMinRunsNumber -= 1;
		return false;
	});

	if (saveMinRunsNumber > 0) result.splice(0, options.saveMinRunsNumber);

	return result;
}

//

async function workflowRunsFilterByClosedPullRequests(runs, options) {
	if (!options.onlyClosedPullRequests) return runs;

	if (octokit === null) octokit = new Octokit({ auth: options.token });

	const branchHasClosedPullRequestMap = new Map();
	const result = [];

	for (let i = 0; i < runs.length; i++) {
		const run = runs[i];
		const branch = run.head_branch;
		if (!branch) continue;

		const headOwner =
			run.head_repository?.owner?.login ||
			run.repository?.owner?.login ||
			options.owner;
		const head = `${headOwner}:${branch}`;

		if (!branchHasClosedPullRequestMap.has(head)) {
			const response = await octokit.pulls.list({
				owner: options.owner,
				repo: options.repo,
				state: "closed",
				head,
				per_page: 1,
			});
			branchHasClosedPullRequestMap.set(head, response.data.length > 0);
		}

		if (branchHasClosedPullRequestMap.get(head)) result.push(run);
	}

	core.info(
		`Selected ${result.length} run(s) from ${runs.length} run(s) by filtering only branches with closed pull requests.`,
	);
	return result;
}

//

async function workflowRunsClean(runs, options) {
	if (octokit === null) octokit = new Octokit({ auth: options.token });

	const reportMap = Object.create(null);
	reportMap.conclusions = Object.create(null);
	for (let i = 0; i < runs.length; i++)
		reportMap.conclusions[runs[i].conclusion] = 0;
	reportMap.runsLength = runs.length;

	if (options.dry) {
		for (let i = 0; i < runs.length; i++) {
			const runId = runs[i].id;
			const msg = runs[i].head_commit.message;
			const conclusion = runs[i].conclusion;
			reportMap.conclusions[conclusion] += 1;

			core.info(
				`Deleting workflow run::#${runId} commit message::"${msg}" conclusion::${conclusion}`,
			);
		}
		reportMap.msg = `Deleted 0 run(s) due to dry run.`;
	} else {
		for (let i = 0; i < runs.length; i++) {
			const runId = runs[i].id;
			const msg = runs[i].head_commit.message;
			const conclusion = runs[i].conclusion;
			reportMap.conclusions[conclusion] += 1;

			core.info(
				`Deleting workflow run::#${runId} commit message::"${msg}" conclusion::${conclusion}`,
			);
			try {
				await octokit.actions.deleteWorkflowRun({
					owner: options.owner,
					repo: options.repo,
					run_id: runId,
				});
			} catch (err) {
				reportMap.msg = `Deleted ${i - 1} run(s).`;
				reportLog(reportMap);
				throw err;
			}
		}
		reportMap.msg = `Deleted ${runs.length} run(s).`;
	}

	reportLog(reportMap);
}

//

function reportLog(reportMap) {
	const delimeter = "=".repeat(reportMap.msg.length);
	const conclusionsKeys = Object.keys(reportMap.conclusions);

	core.info(`\n${delimeter}`);
	core.info(
		`Selected ${reportMap.runsLength} run(s)${conclusionsKeys.length > 0 ? ":" : "."}`,
	);
	if (conclusionsKeys.length > 0)
		for (const key in reportMap.conclusions)
			core.info(`${key}::${reportMap.conclusions[key]}`);
	core.info(delimeter);

	core.info(`\n${delimeter}`);
	core.info(reportMap.msg);
	core.info(delimeter);
}

//

export {
	actionOptionsGet,
	timeParse,
	workflowRunsGet,
	workflowRunsFilter,
	workflowRunsFilterByClosedPullRequests,
	workflowRunsClean,
};

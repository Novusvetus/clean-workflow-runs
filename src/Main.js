import * as action from "./Lib.js";

//

async function run() {
	const options = action.actionOptionsGet();
	const runs = await action.workflowRunsGet(options);
	const filtered = action.workflowRunsFilter(runs, options);
	const filteredByClosedPullRequests =
		await action.workflowRunsFilterByClosedPullRequests(filtered, options);
	return action.workflowRunsClean(filteredByClosedPullRequests, options);
}

//

run()
	.then((e) => {
		return e;
	})
	.catch((err) => {
		console.error(err.message);
		process.exit(1);
	});

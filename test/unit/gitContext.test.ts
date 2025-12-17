import { getAdoContextFromWorkspace } from "../../src/gitContext";

describe("Git Context", () => {
	it("should be defined", () => {
		expect(getAdoContextFromWorkspace).toBeDefined();
	});
});

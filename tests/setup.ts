import { afterEach, beforeAll, beforeEach, expect, rs } from "@rstest/core";
import { setProjectAnnotations } from "@storybook/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import preview from "../.storybook/preview";

expect.extend(matchers);
const annotations = setProjectAnnotations([preview]);
if (annotations.beforeAll) beforeAll(annotations.beforeAll);
beforeEach(() => {
	rs.clearAllMocks();
});
afterEach(() => cleanup());

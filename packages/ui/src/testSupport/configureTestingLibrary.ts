import { configure } from "@testing-library/react";

// The screens render several times more slowly while the whole suite runs in parallel, so a wait gets well past the default second.
configure({ asyncUtilTimeout: 4000 });

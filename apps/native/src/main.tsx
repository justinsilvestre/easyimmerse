import { renderStartupFailure } from "@easyimmerse/ui";
import { bootstrap } from "./bootstrap.tsx";

bootstrap().catch(renderStartupFailure);

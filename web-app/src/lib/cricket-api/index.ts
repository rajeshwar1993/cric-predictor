import type { CricketApiClient } from "./types";
import { realClient } from "./client";
import { mockClient } from "./mock";
import { IS_MOCK_MODE } from "@/lib/constants";

export const cricketApi: CricketApiClient = IS_MOCK_MODE ? mockClient : realClient;

export type { CricketApiClient } from "./types";

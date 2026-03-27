import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import fs from "fs";
import path from "path";

class FailureLogger implements Reporter {
  private failures: string[] = [];
  private logPath = path.join(__dirname, "../reports/failures.log");

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === "failed" || result.status === "timedOut") {
      const artifacts = result.attachments
        .filter((a) => a.name === "video" || a.name === "screenshot")
        .map((a) => `  Artifact: ${a.path}`)
        .join("\n");

      const entry = [
        `[${new Date().toISOString()}]`,
        `FAILED: ${test.titlePath().join(" > ")}`,
        `File: ${test.location.file}:${test.location.line}`,
        `Duration: ${result.duration}ms`,
        `Error: ${result.errors.map((e) => e.message || "Unknown error").join("\n")}`,
        artifacts,
        "---",
      ].join("\n");

      this.failures.push(entry);
    }
  }

  onEnd(_result: FullResult) {
    if (this.failures.length > 0) {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
      fs.writeFileSync(this.logPath, this.failures.join("\n\n"));
      console.log(
        `\n⚠ ${this.failures.length} failure(s) logged to ${this.logPath}\n`
      );
    }
  }
}

export default FailureLogger;

#!/usr/bin/env node

import { hello } from ".";
import { description, name, version } from "./version";
import commander = require("commander");

commander
  .name(name)
  .version(version)
  .description(description)
  .usage("[options]")
  .parse(process.argv);

(async () => {
  process.stdout.write(hello() + "\n");
})().catch(error => {
  process.stderr.write(`unexpected error: ${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});

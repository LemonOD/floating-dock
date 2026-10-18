import { copyFileSync } from "node:fs";

copyFileSync("src/styles.css", "dist/style.css");
console.log("Copied src/styles.css -> dist/style.css");

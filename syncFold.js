const chokidar = require("chokidar");
const fs = require("fs-extra");
const path = require("path");

const sourceFolder = process.argv[2];
const targetFolder = process.argv[3];

console.log(`Watching ${sourceFolder} for changes...`);

chokidar.watch(sourceFolder).on("all", async (event, filePath) => {
  const relativePath = path.relative(sourceFolder, filePath);
  const targetPath = path.join(targetFolder, relativePath);

  console.log(`Detected ${event} event for ${filePath}.`);

  if (event === "add" || event === "change") {
    try {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(filePath, targetPath);
      console.log(`Copied ${filePath} to ${targetPath}.`);
    } catch (err) {
      console.error(
        `Failed to copy ${filePath} to ${targetPath}: ${err.message}`
      );
    }
  } else if (event === "unlink" || event === "unlinkDir") {
    try {
      await fs.remove(targetPath);
      console.log(`Deleted ${targetPath}.`);
    } catch (err) {
      console.error(`Failed to delete ${targetPath}: ${err.message}`);
    }
  }
});

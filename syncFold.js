// Import the necessary NodeGui components and the required Node.js modules
const {
  QMainWindow,
  QWidget,
  QGridLayout,
  QLabel,
  QLineEdit,
  QPushButton,
} = require("@nodegui/nodegui");
const chokidar = require("chokidar");
const fs = require("fs-extra");
const path = require("path");

// Get the source and target folders from the command line arguments
const sourceFolder = process.argv[2];
const targetFolder = process.argv[3];

// Create a new window
const win = new QMainWindow();
win.setWindowTitle("File Watcher");

// Create a central widget and a grid layout
const centralWidget = new QWidget();
const layout = new QGridLayout();
centralWidget.setLayout(layout);

// Create labels and input fields for the source and target folders
const sourceFolderLabel = new QLabel();
sourceFolderLabel.setText("Source Folder:");

const sourceFolderInput = new QLineEdit();
sourceFolderInput.setText(sourceFolder);

const targetFolderLabel = new QLabel();
targetFolderLabel.setText("Target Folder:");

const targetFolderInput = new QLineEdit();
targetFolderInput.setText(targetFolder);

// Create a button to start watching the folders
const startWatchingButton = new QPushButton();
startWatchingButton.setText("Start Watching");

// Create a label to show the logs
const logLabel = new QLabel();
logLabel.setWordWrap(true);

// Add the widgets to the grid layout
layout.addWidget(sourceFolderLabel, 0, 0);
layout.addWidget(sourceFolderInput, 0, 1);
layout.addWidget(targetFolderLabel, 1, 0);
layout.addWidget(targetFolderInput, 1, 1);
layout.addWidget(startWatchingButton, 2, 0, 1, 2);
layout.addWidget(logLabel, 3, 0, 1, 2);

// Add an event listener to the button to start watching the folders
startWatchingButton.addEventListener("clicked", async () => {
  console.log(`Watching ${sourceFolderInput.text()} for changes...`);

  // Use Chokidar to watch for changes in the source folder
  chokidar
    .watch(sourceFolderInput.text())
    .on("all", async (event, filePath) => {
      // Get the relative path of the file that triggered the event
      const relativePath = path.relative(sourceFolderInput.text(), filePath);
      // Get the target path for the file
      const targetPath = path.join(targetFolderInput.text(), relativePath);

      // Update the log label with the event and file path
      logLabel.setText(`Detected ${event} event for ${filePath}.`);

      if (event === "add" || event === "change") {
        // If the event is "add" or "change", copy the file to the target folder
        try {
          await fs.ensureDir(path.dirname(targetPath));
          await fs.copy(filePath, targetPath);
          logLabel.setText(`Copied ${filePath} to ${targetPath}.`);
        } catch (err) {
          console.error(
            `Failed to copy ${filePath} to ${targetPath}: ${err.message}`
          );
        }
      } else if (event === "unlink" || event === "unlinkDir") {
        // If the event is "unlink" or "unlinkDir", delete the file from the target folder
        try {
          await fs.remove(targetPath);
          logLabel.setText(`Deleted ${targetPath}.`);
        } catch (err) {
          console.error(`Failed to delete ${targetPath}: ${err.message}`);
        }
      }
    });
});

// Set the central widget and show the window
win.setCentralWidget(centralWidget);
win.show();

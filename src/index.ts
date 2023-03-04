// Import the necessary NodeGui components and the required Node.js modules
import {
  FileMode,
  QFileDialog,
  QGridLayout,
  QLabel,
  QLineEdit,
  QMainWindow,
  QPushButton,
  QTextEdit,
  QTextEditLineWrapMode,
  QWidget,
  ScrollBarPolicy,
} from "@nodegui/nodegui";
import chokidar from "chokidar";
import fs from "fs-extra";
import path from "path";

// Create a new window
const win = new QMainWindow();
win.setMinimumWidth(500);
win.setWindowTitle("syncFold");

// Create a central widget and a grid layout
const centralWidget = new QWidget();
const layout = new QGridLayout();
centralWidget.setLayout(layout);

// Create labels and input fields for the source and target folders
const sourceFolderLabel = new QLabel();
sourceFolderLabel.setText("Source Folder:");

const sourceFolderInput = new QLineEdit();

const sourceFolderButton = new QPushButton();
sourceFolderButton.setText("Choose Folder");

const targetFolderLabel = new QLabel();
targetFolderLabel.setText("Target Folder:");

const targetFolderInput = new QLineEdit();

const targetFolderButton = new QPushButton();
targetFolderButton.setText("Choose Folder");

// Create a button to start watching the folders
const startWatchingButton = new QPushButton();
startWatchingButton.setText("Start Watching");

// Create a button to stop watching the folders
const stopWatchingButton = new QPushButton();
stopWatchingButton.setText("Stop");
stopWatchingButton.setVisible(false);

// Create a label to show the logs
const logText = new QTextEdit();
logText.setLineWrapMode(QTextEditLineWrapMode.NoWrap);
logText.setReadOnly(true);
logText.setVerticalScrollBarPolicy(ScrollBarPolicy.ScrollBarAlwaysOff);

// Add the widgets to the grid layout
layout.addWidget(sourceFolderLabel, 0, 0);
layout.addWidget(sourceFolderInput, 0, 1);
layout.addWidget(sourceFolderButton, 0, 2);
layout.addWidget(targetFolderLabel, 1, 0);
layout.addWidget(targetFolderInput, 1, 1);
layout.addWidget(targetFolderButton, 1, 2);
layout.addWidget(startWatchingButton, 2, 0, 1, 3);
layout.addWidget(stopWatchingButton, 2, 0, 1, 3);
layout.addWidget(logText, 3, 0, 1, 3);

// Add an event listener to the source folder button to choose the source folder
sourceFolderButton.addEventListener("clicked", async () => {
  const fileDialog = new QFileDialog();
  fileDialog.setFileMode(FileMode.Directory);
  fileDialog.setNameFilter("Source folder");
  fileDialog.exec();

  const folder = fileDialog.selectedFiles()[0];
  sourceFolderInput.setText(folder);
});

// Add an event listener to the target folder button to choose the target folder
targetFolderButton.addEventListener("clicked", async () => {
  const fileDialog = new QFileDialog();
  fileDialog.setFileMode(FileMode.Directory);
  fileDialog.setNameFilter("Target folder");
  fileDialog.exec();

  const folder = fileDialog.selectedFiles()[0];
  targetFolderInput.setText(folder);
});

const logs = Array.from(Array(100)).map(() => "");

logText.setText(logs.join("\n"));

let watcher: chokidar.FSWatcher;

// Add an event listener to the button to start watching the folders
startWatchingButton.addEventListener("clicked", async () => {
  if (sourceFolderInput.text() === "" || targetFolderInput.text() === "") {
    return;
  }

  console.log(`Watching ${sourceFolderInput.text()} for changes...`);

  logs.pop();
  logs.unshift(
    `[${new Date().toLocaleString()}] Watching ${sourceFolderInput.text()} for changes...`
  );
  logText.setText(logs.join("\n"));

  startWatchingButton.hide();
  stopWatchingButton.show();
  sourceFolderInput.setDisabled(true);
  targetFolderInput.setDisabled(true);
  sourceFolderButton.setDisabled(true);
  targetFolderButton.setDisabled(true);

  // Use Chokidar to watch for changes in the source folder
  watcher = chokidar
    .watch(sourceFolderInput.text())
    .on("all", async (event, filePath) => {
      // Get the relative path of the file that triggered the event
      const relativePath = path.relative(sourceFolderInput.text(), filePath);
      // Get the target path for the file
      const targetPath = path.join(targetFolderInput.text(), relativePath);

      // Update the log label with the event and file path
      logs.pop();
      logs.unshift(
        `[${new Date().toLocaleString()}] Detected ${event} event for ${filePath}.`
      );
      logText.setText(logs.join("\n"));

      if (event === "add" || event === "change") {
        // If the event is "add" or "change", copy the file to the target folder
        try {
          await fs.ensureDir(path.dirname(targetPath));
          await fs.copy(filePath, targetPath);

          logs.pop();
          logs.unshift(
            `[${new Date().toLocaleString()}] Copied ${filePath} to ${targetPath}.`
          );
          logText.setText(logs.join("\n"));
        } catch (err: unknown) {
          console.error(
            `Failed to copy ${filePath} to ${targetPath}: ${JSON.stringify(
              err
            )}`
          );
        }
      } else if (event === "unlink" || event === "unlinkDir") {
        // If the event is "unlink" or "unlinkDir", delete the file from the target folder
        try {
          await fs.remove(targetPath);

          logs.pop();
          logs.unshift(
            `[${new Date().toLocaleString()}] Deleted ${targetPath}.`
          );
          logText.setText(logs.join("\n"));
        } catch (err: unknown) {
          console.error(
            `Failed to delete ${targetPath}: ${JSON.stringify(err)}`
          );
        }
      }
    });
});

stopWatchingButton.addEventListener("clicked", async () => {
  console.log(`Stopping watcher...`);

  logs.pop();
  logs.unshift(`[${new Date().toLocaleString()}] Stopping watcher...`);
  logText.setText(logs.join("\n"));

  watcher.close();

  stopWatchingButton.hide();
  startWatchingButton.show();
  sourceFolderInput.setDisabled(false);
  targetFolderInput.setDisabled(false);
  sourceFolderButton.setDisabled(false);
  targetFolderButton.setDisabled(false);
});

// Set the central widget and show the window
win.setCentralWidget(centralWidget);
win.show();

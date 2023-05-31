// Import the necessary NodeGui components and the required Node.js modules
import {
  FileMode,
  QComboBox,
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
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path, { join } from "path";

const file = join("./db.json");

const adapter = new JSONFile<{
  recentSources: string[];
  recentDestinations: string[];
}>(file);
const defaultData = { recentSources: [], recentDestinations: [] };
const db = new Low<{ recentSources: string[]; recentDestinations: string[] }>(
  adapter,
  defaultData
);

db.read().then(() => {
  createWindow(db.data.recentSources, db.data.recentDestinations);
});

function createWindow(
  recentSources: string[] = [],
  recentDestinations: string[] = []
) {
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

  const sourceComboBox = new QComboBox();
  sourceComboBox.setFixedWidth(20);
  sourceComboBox.addItems(["", ...recentSources]);

  sourceComboBox.addEventListener("currentIndexChanged", (index) => {
    if (index === 0) {
      return;
    }

    sourceFolderInput.setText(recentSources[index - 1]);

    sourceComboBox.setCurrentIndex(0);
  });

  const sourceFolderButton = new QPushButton();
  sourceFolderButton.setText("Choose Folder");

  const targetFolderLabel = new QLabel();
  targetFolderLabel.setText("Target Folder:");

  const targetFolderInput = new QLineEdit();

  const targetComboBox = new QComboBox();
  targetComboBox.setFixedWidth(20);
  targetComboBox.addItems(["", ...recentDestinations]);

  targetComboBox.addEventListener("currentIndexChanged", (index) => {
    if (index === 0) {
      return;
    }

    targetFolderInput.setText(recentDestinations[index - 1]);

    targetComboBox.setCurrentIndex(0);
  });

  const targetFolderButton = new QPushButton();
  targetFolderButton.setText("Choose Folder");

  // Create a button to start watching the folders
  const startWatchingButton = new QPushButton();
  startWatchingButton.setText("Start Watching");

  // Create a button to stop watching the folders
  const stopWatchingButton = new QPushButton();
  stopWatchingButton.setText("Stop");
  stopWatchingButton.setVisible(false);

  // Create a button to open new windows
  const newWindowButton = new QPushButton();
  newWindowButton.setText("New window");

  // Create a label to show the logs
  const logText = new QTextEdit();
  logText.setLineWrapMode(QTextEditLineWrapMode.NoWrap);
  logText.setReadOnly(true);
  logText.setVerticalScrollBarPolicy(ScrollBarPolicy.ScrollBarAlwaysOff);

  // Add the widgets to the grid layout
  layout.addWidget(sourceFolderLabel, 0, 0);
  layout.addWidget(sourceFolderInput, 0, 1);
  layout.addWidget(sourceComboBox, 0, 2);
  layout.addWidget(sourceFolderButton, 0, 3);
  layout.addWidget(targetFolderLabel, 1, 0);
  layout.addWidget(targetFolderInput, 1, 1);
  layout.addWidget(targetComboBox, 1, 2);
  layout.addWidget(targetFolderButton, 1, 3);
  layout.addWidget(startWatchingButton, 2, 0, 1, 3);
  layout.addWidget(stopWatchingButton, 2, 0, 1, 3);
  layout.addWidget(newWindowButton, 2, 3);
  layout.addWidget(logText, 3, 0, 1, 4);

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

  // Add an event listener to the button to start a new window
  newWindowButton.addEventListener("clicked", async () => {
    db.read().then(() => {
      createWindow(db.data.recentSources, db.data.recentDestinations);
    });
  });

  // Add an event listener to the button to start watching the folders
  startWatchingButton.addEventListener("clicked", async () => {
    if (sourceFolderInput.text() === "" || targetFolderInput.text() === "") {
      return;
    }

    if (!db.data.recentSources.includes(sourceFolderInput.text())) {
      db.data.recentSources.push(sourceFolderInput.text());
    }

    if (!db.data.recentDestinations.includes(targetFolderInput.text())) {
      db.data.recentDestinations.push(targetFolderInput.text());
    }

    db.write().then(() => {
      console.log("Database updated");
    });

    console.log(`Watching ${sourceFolderInput.text()} for changes...`);

    logs.pop();
    logs.unshift(
      `[${new Date().toLocaleString()}] Watching ${sourceFolderInput.text()} for changes...`
    );
    logText.setText(logs.join("\n"));

    startWatchingButton.hide();
    stopWatchingButton.show();
    sourceFolderInput.setDisabled(true);
    sourceComboBox.setDisabled(true);
    targetFolderInput.setDisabled(true);
    targetComboBox.setDisabled(true);
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

    const prevSource = sourceFolderInput.text();
    const prevTarget = targetFolderInput.text();

    // Clear the recent sources and destinations and add the current ones
    sourceComboBox.clear();
    sourceComboBox.addItems(["", ...db.data.recentSources]);

    targetComboBox.clear();
    targetComboBox.addItems(["", ...db.data.recentDestinations]);

    // Set the input fields to the previous values, these get reset when resetting the combo boxes
    sourceFolderInput.setText(prevSource);
    targetFolderInput.setText(prevTarget);

    logs.pop();
    logs.unshift(`[${new Date().toLocaleString()}] Stopping watcher...`);
    logText.setText(logs.join("\n"));

    watcher.close();

    stopWatchingButton.hide();
    startWatchingButton.show();
    sourceFolderInput.setDisabled(false);
    sourceComboBox.setDisabled(false);
    targetFolderInput.setDisabled(false);
    targetComboBox.setDisabled(false);
    sourceFolderButton.setDisabled(false);
    targetFolderButton.setDisabled(false);
  });

  // Set the central widget and show the window
  win.setCentralWidget(centralWidget);
  win.show();
}

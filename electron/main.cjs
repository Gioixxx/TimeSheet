const { app, BrowserWindow, Tray, Menu, Notification, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const DEFAULT_PORT = "43123";

/** @param {string} dir */
function loadEnvFromDir(dir) {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(dir, name);
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split(/\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

function portableRoot() {
  return app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, "..");
}

function dataDir() {
  return path.join(portableRoot(), "timesheet-data");
}

function ensureDatabase() {
  const dir = dataDir();
  const userDb = path.join(dir, "timesheet.db");
  if (fs.existsSync(userDb)) {
    return userDb;
  }
  fs.mkdirSync(dir, { recursive: true });
  const template = path.join(process.resourcesPath, "prisma", "timesheet.db");
  if (!fs.existsSync(template)) {
    throw new Error(
      `Database template missing at ${template}. Rebuild the app with prisma/timesheet.db included.`,
    );
  }
  fs.copyFileSync(template, userDb);
  return userDb;
}

function databaseUrlForPath(dbPath) {
  const abs = path.resolve(dbPath).replace(/\\/g, "/");
  return `file:${abs}`;
}

function findServerScript(standaloneRoot) {
  const js = path.join(standaloneRoot, "server.js");
  const mjs = path.join(standaloneRoot, "server.mjs");
  if (fs.existsSync(js)) return js;
  if (fs.existsSync(mjs)) return mjs;
  throw new Error(`No server.js or server.mjs under ${standaloneRoot}`);
}

let mainWindow = null;
/** @type {import('child_process').ChildProcess | null} */
let serverProcess = null;
/** @type {Tray | null} */
let tray = null;
/** @type {ReturnType<typeof setInterval> | null} */
let reminderPollInterval = null;

function waitForServer(port, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tryOnce = () => {
      const http = require("http");
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        n += 1;
        if (n >= maxAttempts) {
          reject(new Error("Server did not become ready in time."));
          return;
        }
        setTimeout(tryOnce, 500);
      });
    };
    tryOnce();
  });
}

function trayIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "standalone", "public", "icon.svg")
    : path.join(__dirname, "..", "public", "icon.svg");
}

function createTray(port) {
  let icon;
  try {
    icon = nativeImage.createFromPath(trayIconPath());
    if (!icon.isEmpty()) {
      icon = icon.resize({ width: 16, height: 16 });
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip("Timesheet");

  const buildMenu = () =>
    Menu.buildFromTemplate([
      {
        label: "Apri Timesheet",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow(port);
          }
        },
      },
      { type: "separator" },
      {
        label: "Esci",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

  tray.setContextMenu(buildMenu());

  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow(port);
    }
  });
}

function startReminderPolling(port) {
  const upcomingUrl = `http://127.0.0.1:${port}/api/reminders/upcoming`;

  const poll = () =>
    fetch(upcomingUrl)
      .then((r) => r.json())
      .then((reminders) => {
        if (!Array.isArray(reminders)) return;
        for (const reminder of reminders) {
          if (!Notification.isSupported()) break;
          const notif = new Notification({
            title: reminder.title,
            body: reminder.notes ?? "",
            icon: trayIconPath(),
          });
          notif.on("click", () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          });
          notif.show();
          // Marca come notificato (fire-and-forget)
          fetch(`http://127.0.0.1:${port}/api/reminders/${reminder.id}/notified`, {
            method: "POST",
          }).catch(() => {});
        }
      })
      .catch(() => {});

  poll();
  reminderPollInterval = setInterval(poll, 60 * 1000);
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.loadURL(`http://127.0.0.1:${port}`);
  // Nasconde nel tray invece di chiudersi (a meno che non sia una chiusura esplicita)
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function startServer(projectRoot, port) {
  const isWin = process.platform === "win32";

  if (!app.isPackaged) {
    loadEnvFromDir(projectRoot);
    return spawn(isWin ? "npm.cmd" : "npm", ["run", "dev", "--", "-p", String(port)], {
      cwd: projectRoot,
      shell: true,
      env: { ...process.env, PORT: String(port) },
      stdio: "inherit",
    });
  }

  loadEnvFromDir(portableRoot());
  const dbPath = ensureDatabase();
  const standaloneRoot = path.join(process.resourcesPath, "standalone");
  const serverScript = findServerScript(standaloneRoot);

  return spawn(process.execPath, [serverScript], {
    cwd: standaloneRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(port),
      NODE_ENV: "production",
      DATABASE_URL: databaseUrlForPath(dbPath),
    },
    stdio: "inherit",
  });
}

function stopServer() {
  if (!serverProcess) return;
  if (serverProcess.pid && process.platform === "win32") {
    try {
      spawn("taskkill", ["/pid", String(serverProcess.pid), "/f", "/t"], {
        shell: true,
        stdio: "ignore",
      });
    } catch {
      serverProcess.kill();
    }
  } else {
    serverProcess.kill("SIGTERM");
  }
  serverProcess = null;
}

app.whenReady().then(() => {
  const projectRoot = path.join(__dirname, "..");
  const port = process.env.PORT || DEFAULT_PORT;

  try {
    serverProcess = startServer(projectRoot, port);
  } catch (err) {
    console.error(err);
    app.quit();
    return;
  }

  serverProcess.on("error", (err) => {
    console.error("Server process error:", err);
    app.quit();
  });

  waitForServer(port)
    .then(() => {
      app.isQuitting = false;
      createWindow(port);
      createTray(port);
      startReminderPolling(port);

      // Email polling: avvio immediato + ogni 5 minuti
      const emailPollUrl = `http://127.0.0.1:${port}/api/email-poll`;
      const pollEmail = () =>
        fetch(emailPollUrl, { method: "POST" })
          .then((r) => r.json())
          .then((res) => {
            if (res.created > 0) {
              console.log(`[email-poll] ${res.created} voci create, ${res.failed} fallite, ${res.skipped} saltate`);
            }
          })
          .catch(() => {});
      pollEmail();
      setInterval(pollEmail, 5 * 60 * 1000);
    })
    .catch((err) => {
      console.error(err);
      app.quit();
    });
});

app.on("window-all-closed", () => {
  // Non usciamo: l'icona nel tray mantiene l'app attiva per i reminder in background
  // L'uscita avviene solo tramite "Esci" nel menu del tray (che setta app.isQuitting = true)
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (reminderPollInterval) {
    clearInterval(reminderPollInterval);
    reminderPollInterval = null;
  }
  stopServer();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverProcess) {
    const port = process.env.PORT || DEFAULT_PORT;
    createWindow(port);
  }
});

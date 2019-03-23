import fs from 'fs';
import crypto from 'crypto';
import _ from 'lodash';
import path from 'path';
import ncp from 'ncp';

const copy = ncp.ncp;
const log = require('loglevel');
/**
 * Only picks certain app args to pass to nativefier.json
 * @param options
 */
function selectAppArgs(options) {
  return {
    name: options.name,
    targetUrl: options.targetUrl,
    counter: options.counter,
    bounce: options.bounce,
    width: options.width,
    height: options.height,
    minWidth: options.minWidth,
    minHeight: options.minHeight,
    maxWidth: options.maxWidth,
    maxHeight: options.maxHeight,
    x: options.x,
    y: options.y,
    showMenuBar: options.showMenuBar,
    fastQuit: options.fastQuit,
    userAgent: options.userAgent,
    nativefierVersion: options.nativefierVersion,
    ignoreCertificate: options.ignoreCertificate,
    disableGpu: options.disableGpu,
    ignoreGpuBlacklist: options.ignoreGpuBlacklist,
    enableEs3Apis: options.enableEs3Apis,
    insecure: options.insecure,
    flashPluginDir: options.flashPluginDir,
    diskCacheSize: options.diskCacheSize,
    fullScreen: options.fullScreen,
    hideWindowFrame: options.hideWindowFrame,
    maximize: options.maximize,
    disableContextMenu: options.disableContextMenu,
    disableDevTools: options.disableDevTools,
    zoom: options.zoom,
    internalUrls: options.internalUrls,
    crashReporter: options.crashReporter,
    singleInstance: options.singleInstance,
    clearCache: options.clearCache,
    appCopyright: options.appCopyright,
    appVersion: options.appVersion,
    buildVersion: options.buildVersion,
    win32metadata: options.win32metadata,
    versionString: options.versionString,
    processEnvs: options.processEnvs,
    fileDownloadOptions: options.fileDownloadOptions,
    tray: options.tray,
    basicAuthUsername: options.basicAuthUsername,
    basicAuthPassword: options.basicAuthPassword,
    alwaysOnTop: options.alwaysOnTop,
    titleBarStyle: options.titleBarStyle,
    globalShortcuts: options.globalShortcuts,
  };
}

function maybeCopyScripts(srcs, dest) {
  if (!srcs) {
    return new Promise((resolve) => {
      resolve();
    });
  }
  const promises = srcs.map(
    (src) =>
      new Promise((resolve, reject) => {
        if (!fs.existsSync(src)) {
          reject(new Error('Error copying injection files: file not found'));
          return;
        }

        let destFileName;
        if (path.extname(src) === '.js') {
          destFileName = 'inject.js';
        } else if (path.extname(src) === '.css') {
          destFileName = 'inject.css';
        } else {
          resolve();
          return;
        }

        copy(src, path.join(dest, 'inject', destFileName), (error) => {
          if (error) {
            reject(new Error(`Error Copying injection files: ${error}`));
            return;
          }
          resolve();
        });
      }),
  );

  return new Promise((resolve, reject) => {
    Promise.all(promises)
      .then(() => {
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function normalizeAppName(appName, url) {
  // use a simple 3 byte random string to prevent collision
  const hash = crypto.createHash('md5');
  hash.update(url);
  const postFixHash = hash.digest('hex').substring(0, 6);
  const normalized = _.kebabCase(appName.toLowerCase());
  return `${normalized}-nativefier-${postFixHash}`;
}

function changeAppPackageJsonName(appPath, name) {
  const packageJsonPath = path.join(appPath, '/package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
  packageJson.name = name
  console.log(`PACKAGE NAME: ${name}`)
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson));
}

/**
 * Creates a temporary directory and copies the './app folder' inside,
 * and adds a text file with the configuration for the single page app.
 *
 * @param {string} src
 * @param {string} dest
 * @param {{}} options
 * @param callback
 */
function buildApp(src, dest, options, callback) {
  const appArgs = selectAppArgs(options);
  copy(src, dest, (error) => {
    if (error) {
      callback(`Error Copying temporary directory: ${error}`);
      return;
    }

    fs.writeFileSync(
      path.join(dest, '/nativefier.json'),
      JSON.stringify(appArgs),
    );

    maybeCopyScripts(options.inject, dest)
      .catch((err) => {
        log.warn(err);
      })
      .then(() => {
        changeAppPackageJsonName(dest, appArgs.name);
        callback();
      });
  });
}

export default buildApp;

// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
// @remove-on-eject-end
'use strict';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

process.env.NODE_ENV = 'development';

// Ensure environment variables are read.
require('../config/env');

const address = require('address');
const fs = require('fs');
const chalk = require('chalk');
const detect = require('@timer/detect-port');
const WebpackDevServer = require('webpack-dev-server');
const clearConsole = require('react-dev-utils/clearConsole');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const getProcessForPort = require('react-dev-utils/getProcessForPort');
const openBrowser = require('react-dev-utils/openBrowser');
const inquirer = require('inquirer');
const paths = require('../config/paths');
const config = require('../config/webpack.config.dev');
const devServerConfig = require('../config/webpackDevServer.config');
const createWebpackCompiler = require('./utils/createWebpackCompiler');
const prepareProxy = require('react-dev-utils/prepareProxy');
const url = require('url');

const useYarn = fs.existsSync(paths.yarnLockFile);
const cli = useYarn ? 'yarn' : 'npm';
const isInteractive = process.stdout.isTTY;

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
  process.exit(1);
}

// Tools like Cloud9 rely on this.
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

function run(port) {
  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';

  const formatUrl = hostname =>
    url.format({ protocol, hostname, port, pathname: '/' });

  const isUnspecifiedAddress = HOST === '0.0.0.0' || HOST === '::';
  let prettyHost, lanAddress;
  if (isUnspecifiedAddress) {
    prettyHost = 'localhost';
    try {
      lanAddress = address.ip();
    } catch (_e) {
      // ignored
    }
  } else {
    prettyHost = HOST;
  }
  const prettyUrl = formatUrl(prettyHost);

  // Create a webpack compiler that is configured with custom messages.
  const compiler = createWebpackCompiler(
    config,
    function onReady(showInstructions) {
      if (!showInstructions) {
        return;
      }
      console.log();
      console.log(
        `You can now view ${chalk.bold(require(paths.appPackageJson).name)} in the browser.`
      );
      console.log();

      if (isUnspecifiedAddress && lanAddress) {
        console.log(
          `  ${chalk.bold('Local:')}            ${chalk.cyan(prettyUrl)}`
        );
        console.log(
          `  ${chalk.bold('On Your Network:')}  ${chalk.cyan(formatUrl(lanAddress))}`
        );
      } else {
        console.log(`  ${chalk.cyan(prettyUrl)}`);
      }

      console.log();
      console.log('Note that the development build is not optimized.');
      console.log(
        `To create a production build, use ${chalk.cyan(`${cli} run build`)}.`
      );
      console.log();
    }
  );

  // Load proxy config
  const proxy = require(paths.appPackageJson).proxy;
  // Serve webpack assets generated by the compiler over a web sever.
  const devServer = new WebpackDevServer(
    compiler,
    devServerConfig(prepareProxy(proxy), lanAddress)
  );

  // Launch WebpackDevServer.
  devServer.listen(port, HOST, err => {
    if (err) {
      return console.log(err);
    }

    if (isInteractive) {
      clearConsole();
    }
    console.log(chalk.cyan('Starting the development server...'));
    console.log();

    openBrowser(formatUrl(prettyHost));
  });
}

// We attempt to use the default port but if it is busy, we offer the user to
// run on a different port. `detect()` Promise resolves to the next free port.
detect(DEFAULT_PORT, HOST).then(port => {
  if (port === DEFAULT_PORT) {
    run(port);
    return;
  }

  if (isInteractive) {
    clearConsole();
    const existingProcess = getProcessForPort(DEFAULT_PORT);
    const question = {
      type: 'confirm',
      name: 'shouldChangePort',
      message: chalk.yellow(
        `Something is already running on port ${DEFAULT_PORT}.` +
          `${existingProcess ? ` Probably:\n  ${existingProcess}` : ''}`
      ) + '\n\nWould you like to run the app on another port instead?',
      default: true,
    };

    inquirer.prompt(question).then(answer => {
      if (answer.shouldChangePort) {
        run(port);
      }
    });
  } else {
    console.log(
      chalk.red(`Something is already running on port ${DEFAULT_PORT}.`)
    );
  }
});

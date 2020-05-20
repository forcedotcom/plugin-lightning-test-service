/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Logger } from '@salesforce/core';
import * as selenium from 'selenium-standalone';
import { promisify } from 'util';

class SeleniumRunner {
  private process: selenium.ChildProcess;

  public async start(config: selenium.StartOpts = {}, logger: Logger) {
    // Sets the base directory used to store the selenium standalone .jar and drivers.
    // Defaults to current working directory + .selenium/
    // On windows, thats a directory we cannot write to so we specify a temp directory.
    if (!config.basePath) {
      config.basePath = this.getSeleniumInstallBaseDirectory();
    }

    // Install if it isn't already installed. Should get an error if java is not installed.
    await new Promise((resolve, reject) => {
      const installConfig: selenium.InstallOpts = {
        logger: (message: string) => logger.debug(message),
        basePath: config.basePath
      };
      if (config.drivers) {
        installConfig.drivers = {};
        Object.assign(installConfig.drivers, config.drivers);
      }
      selenium.install(installConfig, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });

    const child = await promisify<selenium.StartOpts, selenium.ChildProcess>(
      selenium.start
    )(config);
    this.process = child;
    return true;
  }

  public kill() {
    if (this.process) {
      this.process.kill();
    }
  }

  /**
   * For Windows, we cannot install to the default directory as we're getting
   * access issues installing into the CLI node_modules directory.
   * Instead we'll use the temp directory for the org.
   *
   * No other operating systems are having this issue, so not using a temp directory
   * for them, as I'm concerned they'll need to install the jars more often in that case.
   * Since the temp directory could be changed or deleted.
   */
  private getSeleniumInstallBaseDirectory(): string | undefined {
    if (process.platform === 'win32') {
      const os = require('os');
      const path = require('path');
      return path.join(os.tmpdir(), 'selenium');
    }
    return;
  }
}

export = SeleniumRunner;

/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// ** external modules **
import { UX } from '@salesforce/command';
import { Logger, Messages, Org, SfdxError } from '@salesforce/core';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as moment from 'moment';
import * as path from 'path';
import { StartOpts } from 'selenium-standalone';
import * as util from 'util';
import { promisify } from 'util';
import * as webdriverio from 'webdriverio';
import Reporters = require('./reporter');
import { Reporter } from './reporter';
import SeleniumRunner = require('./seleniumRunner');
import TestResults = require('./testResults');

const TEST_RESULT_FILE_PREFIX = 'lightning-test-result';

const writeFile = promisify(fs.writeFile);

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
  'plugin-lightning-testing-service',
  'run'
);

/**
 * Lightning TAP reporter implementation.
 */
class LightningTestTapReporter extends Reporters.TapReporter {
  public onStart(res) {
    if (res.tests && res.tests.length) {
      this.logTapStart(res.tests.length);
    }
  }

  public async onFinished(res) {
    res.tests.forEach(test => {
      this.logTapResult(test);
    });
  }

  public getFullTestName(testResult) {
    return testResult.FullName;
  }
}

/**
 * A list of the applicable reporter types
 */
// tslint:disable-next-line: variable-name
const ReporterTypes = {
  human: Reporters.HumanReporter,
  tap: LightningTestTapReporter,
  json: Reporters.JsonReporter,
  junit: Reporters.JUnitReporter
};

/**
 *  A container for the lightning test results that provides helpers around formating
 *  and logging test results.
 */
class LightningTestResults extends TestResults {
  constructor(testApi, tests, runResultSummaries, config) {
    super(
      testApi.testrunid,
      testApi.startTime,
      'force.lightning',
      tests,
      runResultSummaries,
      config
    );
  }

  public getTestContainerName() {
    return '';
  }

  public getTestNamespace(test) {
    return test.NamespacePrefix;
  }

  public getTestName(test) {
    return test.FullName;
  }
}

interface Options {
  resultformat: string;
  configfile: string;
  outputdir: string;
  targetusername: string;
  json: boolean;
  timeout: number;
  appname: string;
}

export default class LightningTestApi {
  private seleniumRunner: SeleniumRunner;
  private startTime: moment.Moment;
  private configFileContent: StartOpts;
  private reporter: Reporter;
  private lightningTestResults: LightningTestResults;
  private browser: webdriverio.BrowserObject;

  /**
   * The API class that manages running Lightning tests.
   *
   * @param org {object} The org for running tests.
   */
  constructor(
    private org: Org,
    private options: Options,
    private ux: UX,
    private logger: Logger
  ) {
    this.startTime = moment();
  }

  /**
   *
   * Initialize the test api to specify additional options and setup the
   * output directory if needed.
   *
   * @param {object} options The options used to run the tests. You can see a
   * list of valid options in the by looking at the defaults in the constructor.
   * @param {object} logger The logger object, which should typically be the
   * heroku cli.
   */
  public initialize = async () => {
    if (this.options.configfile) {
      this.configFileContent = JSON.parse(
        fs.readFileSync(this.options.configfile).toString('utf8')
      );
    }

    if (!this.options.resultformat) {
      this.options.resultformat = 'human';
    }

    // Validate the reporter
    const reporter = ReporterTypes[this.options.resultformat];
    if (!reporter) {
      throw new SfdxError(messages.getMessage('lightningTestInvalidReporter'));
      // Object.keys(ReporterTypes).join(',')
    } else if (this.options.resultformat === 'json') {
      // If the reporter is json, make sure the json flag is also set
      this.options.json = true;
    }

    this.reporter = new reporter(this.ux);

    await this.startSelenium(this.configFileContent);
    await this.setupOutputDirectory();
  };

  /**
   * Run the specified tests.
   */
  public runTests = async () => {
    this.reporter.log(
      this.options.targetusername
        ? `Invoking Lightning tests using ${this.options.targetusername}...`
        : 'Invoking Lightning tests...'
    );

    // Default configs
    const driverOptions: webdriverio.RemoteOptions = {
      capabilities: {
        browserName: 'chrome'
      },
      hostname: 'localhost',
      port: 4444,
      path: '/wd/hub',
      logLevel: 'silent'
    };

    // tslint:disable-next-line: radix
    const outputDivId = '#run_results_full';

    // // Applying config file
    // if (this.configFileContent != null) {
    //   if (this.configFileContent.webdriverio != null) {
    //     driverOptions = this.configFileContent.webdriverio;
    //   }

    //   if (this.configFileContent.outputDivId != null) {
    //     outputDivId = `#$${this.configFileContent.outputDivId}`;
    //   }
    // }

    // Types are wrong here, await is required
    this.browser = await webdriverio.remote(driverOptions);

    // Run lightning test apps with webdriverio and record results.
    // tslint:disable-next-line: no-any
    let testResults: any;
    try {
      testResults = await this.runTestAndExtractResults(
        outputDivId,
        this.options.timeout
      );
      await this.retrieveAndStoreTestResults(testResults);
    } catch (err) {
      throw new SfdxError(err.message, messages.getMessage('testRunError'));
    } finally {
      if (this.seleniumRunner) {
        this.seleniumRunner.kill();
      }
    }

    if (testResults == null) {
      throw new SfdxError(
        messages.getMessage('lightningTestResultRetrievalFailed')
      );
    }

    return testResults;
  };

  /**
   * Create the output directory the the test results will be stored if doesn't exist
   */
  public setupOutputDirectory = async () => {
    const outputdir = this.options.outputdir;
    if (!util.isNullOrUndefined(outputdir)) {
      try {
        await mkdirp(outputdir);
        return outputdir;
      } catch (error) {
        // It is ok if the directory already exist
        if (error.name !== 'EEXIST') {
          throw error;
        }
      }
    }
  };

  /**
   * Retrieve the test results then store them by logging the test results
   * to the client and filesystem.
   */
  private retrieveAndStoreTestResults = results => {
    this.reporter.log('Preparing test results...');

    const orgConfig = {
      orgId: this.org.getOrgId(),
      instanceUrl: '',
      username: this.org.getUsername()
    };

    try {
      this.lightningTestResults = new LightningTestResults(
        this,
        results.tests,
        results.summary,
        orgConfig
      );
      if (this.options.outputdir) {
        return this.logTestArtifacts();
      }

      if (this.reporter) {
        this.reporter.emit('start', this.lightningTestResults);
        this.reporter.emit('finished', this.lightningTestResults);
      }

      this.reporter.log('Test run complete');

      return this.lightningTestResults.toJson();
    } catch (err) {
      err['name'] = 'TestResultRetrievalFailed';
      err['message'] = messages.getMessage(
        'lightningTestResultRetrievalFailed',
        [err.message]
      );
      throw err;
    }
  };

  private startSelenium = (config: StartOpts) => {
    // start selenium here
    this.seleniumRunner = new SeleniumRunner();
    return this.seleniumRunner.start(config, this.logger);
  };

  // login and hit test app url; extract results from dom when complete
  private runTestAndExtractResults = async (
    outputDivId: string,
    timeout: number
  ) => {
    let appname = `/c/${
      this.options.appname == null ? 'jasmineTests' : this.options.appname
    }`;
    if (appname.indexOf('.app') < 0) {
      appname += '.app';
    }

    const url = await this.getFrontDoorUrl(appname);
    const testResultsStr = await this.extractTestResults(
      url,
      outputDivId,
      timeout
    );
    return await this.generateResultSummary(JSON.parse(testResultsStr));
  };

  private extractTestResults = async (
    url: string,
    outputDivId: string,
    timeout: number
  ) => {
    await this.browser.url(url);
    let text: string | undefined;
    const element = await this.browser.$(outputDivId);
    const ready = await element.waitUntil(
      async () => {
        await element.waitForExist({ timeout });
        text = await element.getAttribute('textContent');
        return text && text.length > 0;
      },
      { timeout }
    );
    if (!ready || !text) {
      throw new Error('Results not found on page or operation timed out.');
    }
    return text;
  };

  private getFrontDoorUrl = async (appname: string) => {
    // retrieving lightning test app url with credential params.
    const output = await promisify(exec)(
      `sfdx force:org:open --urlonly --targetusername ${this.org.getUsername()} --path ${appname} --json`
    );

    const { result, status } = JSON.parse(output.stdout);
    if (status !== 0) {
      throw new SfdxError('Error retrieving front door url.');
    }

    return result.url;
  };

  private generateResultSummary = async testResults => {
    const summary = {
      StartTime: this.startTime,
      TestTime: 0,
      TestExecutionTime: 0,
      UserId: '' // TODO
    };
    testResults.summary = [summary];

    // extract duration time for dom
    const durationTimeRegexp = new RegExp(/([0-9\.]+)/gi);

    const duration = await this.extractDuration();
    if (!util.isNullOrUndefined(duration)) {
      const parsedDuration = durationTimeRegexp.exec(duration);
      if (parsedDuration != null && parsedDuration.length > 0) {
        summary.TestTime = parseFloat(parsedDuration[0]) * 1000; // convert to ms
        summary.TestExecutionTime = summary.TestTime;
      }
    }
    return testResults;
  };

  private extractDuration = async (): Promise<string | null> => {
    let text: string | null = null;
    try {
      text = await this.browser.getElementText('.jasmine-duration');
    } catch {
      // Ignore
    }
    return text;
  };

  /**
   * Log test results to the console and/or the filesystem depending on the options
   */
  private async logTestArtifacts() {
    this.reporter.log(
      `Writing test results to files to ${this.options.outputdir}...`
    );

    // write test results files - junit and json
    if (util.isString(this.options.outputdir)) {
      let json;
      const files = [];

      // Write junit file
      const junit = {
        format: 'JUnit',
        file: path.join(
          this.options.outputdir,
          `${TEST_RESULT_FILE_PREFIX}-junit.xml`
        )
      };

      await writeFile(junit.file, this.lightningTestResults.generateJunit());
      files.push(junit);
      // Write JSON file
      json = {
        format: 'JSON',
        file: path.join(
          this.options.outputdir,
          `${TEST_RESULT_FILE_PREFIX}.json`
        )
      };
      await writeFile(
        json.file,
        JSON.stringify(this.lightningTestResults.toJson(), null, 4)
      );
      files.push(json);
      this.reporter.logTable('Test Reports', files, [
        { key: 'format', label: 'Format' },
        { key: 'file', label: 'File' }
      ]);
    }
  }
}

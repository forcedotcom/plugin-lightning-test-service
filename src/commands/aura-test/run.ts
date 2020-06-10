import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import _ = require('lodash');
import LightningTestApi from '../../lightningTestApi';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
  'plugin-lightning-testing-service',
  'run'
);

export default class Run extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');
  public static descriptionLong = messages.getMessage('commandDescriptionLong');

  public static examples = [
    '$ sfdx aura-test:run',
    '$ sfdx aura-test:run -a tests -r human',
    '$ sfdx aura-test:run -f config/myConfigFile.json -d testResultFolder'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    resultformat: flags.string({
      char: 'r',
      description: messages.getMessage('resultformatFlagDescription'),
      longDescription: messages.getMessage('resultformatFlagDescriptionLong')
    }),
    appname: flags.string({
      char: 'a',
      description: messages.getMessage('appnameFlagDescription'),
      longDescription: messages.getMessage('appnameFlagDescriptionLong')
    }),
    outputdir: flags.filepath({
      char: 'd',
      description: messages.getMessage('outputdirDescription'),
      longDescription: messages.getMessage('outputdirDescriptionLong')
    }),
    configfile: flags.filepath({
      char: 'f',
      description: messages.getMessage('configfileDescription'),
      longDescription: messages.getMessage('configfileDescriptionLong')
    }),
    leavebrowseropen: flags.boolean({
      char: 'o',
      description: messages.getMessage('leavebrowseropenDescription'),
      longDescription: messages.getMessage('leavebrowseropenDescriptionLong')
    }),
    timeout: flags.number({
      char: 't',
      description: messages.getMessage('timeoutDescription'),
      longDescription: messages.getMessage('timeoutDescriptionLong'),
      default: 60000
    })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {
    const org = this.org;

    if (!org.checkScratchOrg()) {
      throw new SfdxError(messages.getMessage('scratchOrgOnly'));
    }

    const options = {
      resultformat: this.flags.resultformat,
      configfile: this.flags.configfile,
      outputdir: this.flags.outputdir,
      targetusername: this.flags.targetusername,
      json: this.flags.json,
      timeout: this.flags.timeout,
      appname: this.flags.appname
    };

    const testApi = new LightningTestApi(
      this.org,
      options,
      this.ux,
      this.logger
    );
    await testApi.initialize();
    const res = await testApi.runTests();

    // If any tests failed, change the exit code to 100
    if (_.get(res, 'summary.failing')) {
      process.exitCode = 100;
    }
    return res;
  }
}

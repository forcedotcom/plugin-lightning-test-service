# Lightning Testing Service CLI Plugin

**NOTICE: This tool is no longer supported and no additional work is planned for this tool. We recommend if you want to use this tool, that you treat it as an example and create your own fork of it to use in your build process**

SFDX Pluging for the [Lightning Test Service](https://github.com/forcedotcom/LightningTestingService)

<!-- toc -->
* [Lightning Testing Service CLI Plugin](#lightning-testing-service-cli-plugin)
<!-- tocstop -->
    <!-- install -->
    <!-- usage -->
```sh-session
$ npm install -g plugin-lightning-testing-service
$ sfdx COMMAND
running command...
$ sfdx (-v|--version|version)
plugin-lightning-testing-service/1.0.1 darwin-x64 node-v12.10.0
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`sfdx aura-test:install [-r <string>] [-t] [-w <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-aura-testinstall--r-string--t--w-number--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx aura-test:run [-r <string>] [-a <string>] [-d <filepath>] [-f <filepath>] [-o] [-t <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-aura-testrun--r-string--a-string--d-filepath--f-filepath--o--t-number--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx aura-test:install [-r <string>] [-t] [-w <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

install Lightning Testing Service unmanaged package in your org

```
USAGE
  $ sfdx aura-test:install [-r <string>] [-t] [-w <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -r, --releaseversion=releaseversion                                               release version of Lightning Testing
                                                                                    Service

  -t, --packagetype                                                                 type of unmanaged package. 'full'
                                                                                    option contains both jasmine and
                                                                                    mocha, plus examples

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   number of minutes to wait for
                                                                                    installation status

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  $ sfdx aura-test:install
  $ sfdx aura-test:install -w 0 -r v1.0
  sfdx aura-test:install -t jasmine
```

_See code: [src/commands/aura-test/install.ts](https://github.com/forcedotcom/plugin-lightning-test-service/blob/v1.0.1/src/commands/aura-test/install.ts)_

## `sfdx aura-test:run [-r <string>] [-a <string>] [-d <filepath>] [-f <filepath>] [-o] [-t <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

invoke Aura component tests

```
USAGE
  $ sfdx aura-test:run [-r <string>] [-a <string>] [-d <filepath>] [-f <filepath>] [-o] [-t <number>] [-u <string>] 
  [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --appname=appname                                                             name of your Lightning test
                                                                                    application

  -d, --outputdir=outputdir                                                         directory path to store test run
                                                                                    artifacts: for example, log files
                                                                                    and test results

  -f, --configfile=configfile                                                       path to config file for the test

  -o, --leavebrowseropen                                                            leave browser open

  -r, --resultformat=resultformat                                                   test result format emitted to
                                                                                    stdout; --json flag overrides this
                                                                                    parameter

  -t, --timeout=timeout                                                             [default: 60000] time (ms) to wait
                                                                                    for results element in dom

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  $ sfdx aura-test:run
  $ sfdx aura-test:run -a tests -r human
  $ sfdx aura-test:run -f config/myConfigFile.json -d testResultFolder
```

_See code: [src/commands/aura-test/run.ts](https://github.com/forcedotcom/plugin-lightning-test-service/blob/v1.0.1/src/commands/aura-test/run.ts)_
<!-- commandsstop -->

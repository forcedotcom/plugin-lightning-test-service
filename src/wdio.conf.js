export.config = {
    services: [
        ['selenium-standalone', {
            logPath: 'logs',
            installArgs: {
                drivers: {
                    chrome: { version: '79.0.3945.88' },
                }
            },
            args: {
                drivers: {
                    chrome: { version: '79.0.3945.88' },
                }
            },
        }]
    ],
};
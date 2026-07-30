const interval = setInterval(() => {
    try {
        tizen.application.getAppInfo('io.gh.reisxd.HyperTizenX');
        tizen.application.launch(
            'io.gh.reisxd.HyperTizenX',
            function () {
                console.log('Launch Service succeeded');
                clearInterval(interval);
            },
            function (e) {
                console.log("Launch Service failed: " + e.message);
            }
        );
    } catch (e) {
        console.log('App not found');
    }    
}, 1000);
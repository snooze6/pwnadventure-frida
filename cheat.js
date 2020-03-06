const frida = require('frida');
const fs = require('fs');

let remote = "10.211.55.3:1337";

async function run() {
    let mgr = frida.getDeviceManager();
    let device = await mgr.addRemoteDevice(remote);
    let pid = await device.attach("PwnAdventure3-Win32-Shipping.exe");

    if (pid){
        console.log('[+] - Attached to PwnAdventure3!');
        console.log(pid);

        let code = fs.readFileSync(__dirname+'/agents.js','utf-8');
        // console.log(code);
        let script = await pid.createScript(code);
        script.message.connect(onMessage);
        await script.load();
        // (await script).exports.setup();
        // console.log(script.exports);

        await script.exports.setup();
    } else {
        console.log('[-] - Game not running');
    }
}

function onMessage(message, data) {
    if (message.type === 'send') {
        console.log(message.payload);
    } else if (message.type === 'error') {
        console.error(message.stack);
    }
}

run().catch(function onerror(error) {
    console.log(error.stack);
});

/**
 * frida -H 10.211.55.3:1337 PwnAdventure3-Win32-Shipping.exe -l agents.js
 *
 */

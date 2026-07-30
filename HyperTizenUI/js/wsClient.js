let client;
let deviceIP;
const ssdpDevices = [];
let canEnable = false;

function open() {
    client = new WebSocket(`ws://${deviceIP}:8086`);
    client.onopen = onOpen;
    client.onmessage = onMessage;
    client.onerror = () => {
        location.reload();
    }
}

const events = {
    SetConfig: 0,
    ReadConfig: 1,
    ReadConfigResult: 2,
    ScanSSDP: 3,
    SSDPScanResult: 4,
    DebugCapture: 5,
    DebugCaptureResult: 6
}

function send(json) {
    // The native side requires this field on every message (BasicEvent's
    // protocolVersion is [JsonProperty(Required = Required.Always)]) - a
    // message missing it is silently dropped, not just ignored.
    json.protocolVersion = 1;
    client.send(JSON.stringify(json));
}

function onOpen() {
    document.getElementById('status').textContent = 'Connected';
    document.getElementById('enabled').onchange = (e) => {
        if (!canEnable) {
            alert('Please select a device first');
            return e.target.checked = false;
        }
        send({ event: events.SetConfig, key: 'enabled', value: e.target.checked.toString() });
    }
    send({ event: events.ReadConfig, key: 'rpcServer' });
    send({ event: events.ReadConfig, key: 'enabled' });
    send({ event: events.ScanSSDP });
    setInterval(() => {
        send({ event: events.ScanSSDP });
    }, 10000);

    setTimeout(() => {
        const manualField = document.getElementById('manualRpc');
        if (!canEnable && manualField && manualField.value) {
            setRPC(manualField.value);
            const enabledBox = document.getElementById('enabled');
            enabledBox.checked = true;
            enabledBox.onchange({ target: enabledBox });
        }
        send({ event: events.DebugCapture });
    }, 1500);
}

function onMessage(data) {
    const msg = JSON.parse(data.data);
    switch(msg.Event) {
        case events.ReadConfigResult:
            if(msg.key === 'rpcServer' && !msg.error) {
                canEnable = true;
                document.getElementById('ssdpDeviceTitle').innerText = `SSDP Devices (Currently Connected to ${msg.value})`;
            } else if(msg.key === 'enabled' && !msg.error) {
                document.getElementById('enabled').checked = msg.value === 'true';
            }
            break;
        case events.DebugCaptureResult:
            document.getElementById('status').textContent = `Connected — DEBUG: ${msg.info}`;
            break;
        case events.SSDPScanResult: {
            for (const device of msg.devices) {
                // Native discovery resolves HyperHDR's <jsonServer> port and
                // returns a ws:// convention URL for the raw TCP JSON client.
                const url = device.UrlBase;
                if (!url.startsWith('ws://')) {
                    continue;
                }

                if (ssdpDevices.some(d => d.url === url)) {
                    continue;
                }
                
                const friendlyName = device.FriendlyName;
                const item = document.createElement('div');
                const label = document.createElement('a');
                item.className = 'ssdpItem';
                item.dataset.uri = url;
                item.dataset.friendlyName = friendlyName;
                item.tabIndex = 0;
                item.addEventListener('click', () => setRPC(url));
                label.textContent = friendlyName;
                item.appendChild(label);
                document.getElementById('ssdpItems').appendChild(item);
                ssdpDevices.push({ url, friendlyName });
            }
        }
    }
}

window.setRPC = (url) =>  {
    canEnable = true;
    send({ event: events.SetConfig, key: 'rpcServer', value: url });
}

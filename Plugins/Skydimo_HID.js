export function Name() { return "SyncLight K18 ARGB Controller"; }
export function VendorId() { return 0x1a86; }
export function ProductId() { return 0xfe07; }
export function Publisher() { return "Alex Mod"; }
export function Size() { return [33, 18]; }
export function DefaultPosition() { return [10, 10]; }
export function DefaultScale() { return 1.0; }
export function UniqueId() { return "SyncLight_K18_Frame_V2"; }

export let ledCount = 65;
export let brightness = 100;
export let colorOrder = "RGB";
export let stripDirection = "Derecha a Izquierda";

export function Validate(endpoint) {
    return endpoint.interface === 0;
}

export function ControllableParameters() {
    return [
        {"property":"ledCount", "label":"Cantidad de LEDs", "type":"number", "min":1, "max":254, "default":65},
        {"property":"brightness", "label":"Brillo", "type":"number", "min":5, "max":100, "default":100},
        {"property":"colorOrder", "label":"Orden de Color", "type":"combobox", "values":["RGB", "GRB", "BGR"], "default":"RGB"},
        {"property":"stripDirection", "label":"Sentido del Cable", "type":"combobox", "values":["Izquierda a Derecha", "Derecha a Izquierda"], "default":"Izquierda a Derecha"}
    ];
}

let vLedNames = [];
let vLedPositions = [];
let seqId = 1;

function getNextSeq() {
    seqId = (seqId + 1) >= 255 ? 1 : (seqId + 1);
    return seqId;
}

function getSafeCount() {
    return (typeof ledCount !== "undefined" && ledCount > 0) ? ledCount : 65;
}

function getSafeBrightness() {
    return (typeof brightness !== "undefined" && brightness >= 0) ? brightness : 100;
}

function getSafeOrder() {
    return (typeof colorOrder !== "undefined") ? colorOrder : "RGB";
}

function getSafeDirection() {
    return (typeof stripDirection !== "undefined") ? stripDirection : "Izquierda a Derecha";
}

function calcChecksum(buf, length) {
    let sum = 0;
    for (let i = 0; i < length; i++) {
        sum = (sum + buf[i]) & 0xFF;
    }
    return sum;
}

function sendRawBuffer(rawBuffer) {
    const CHUNK_SIZE = 64;
    for (let offset = 0; offset < rawBuffer.length; offset += CHUNK_SIZE) {
        let chunk = rawBuffer.slice(offset, offset + CHUNK_SIZE);
        let packet = new Array(65).fill(0);
        packet[0] = 0x00; // Report ID Windows
        for (let i = 0; i < chunk.length; i++) {
            packet[1 + i] = chunk[i];
        }
        try {
            device.write(packet, 65);
        } catch (e) {}
    }
}

export function Initialize() {
    let count = getSafeCount();
    let bright = getSafeBrightness();

    SetupLedGrid(count);
    
    // Comando RB 0x95: Configurar cantidad de LEDs
    let countPacket = [0x52, 0x42, 0x07, getNextSeq(), 0x95, count];
    countPacket.push(calcChecksum(countPacket, countPacket.length));
    sendRawBuffer(countPacket);

    // Comando RB 0x87: Configurar brillo inicial
    let brightPacket = [0x52, 0x42, 0x07, getNextSeq(), 0x87, Math.max(5, bright)];
    brightPacket.push(calcChecksum(brightPacket, brightPacket.length));
    sendRawBuffer(brightPacket);
}

function SetupLedGrid(count) {
    vLedNames = [];
    vLedPositions = [];

    const leftLeds = 17;
    const topLeds = 31;
    const rightLeds = 17;
    const gridW = 33;
    const gridH = 18;

    if (count === 65) {
        device.setSize([gridW, gridH]);
        let dir = getSafeDirection();
        let idx = 0;

        if (dir === "Derecha a Izquierda") {
            // Sube por la derecha (X = 32, Y = 17 hacia 1)
            for (let y = gridH - 1; y >= 1; y--) {
                vLedNames.push("LED " + (++idx));
                vLedPositions.push([gridW - 1, y]);
            }
            // Cruza por arriba hacia la izquierda (X = 31 hacia 1, Y = 0)
            for (let x = topLeds; x >= 1; x--) {
                vLedNames.push("LED " + (++idx));
                vLedPositions.push([x, 0]);
            }
            // Baja por la izquierda (X = 0, Y = 1 hacia 17)
            for (let y = 1; y <= leftLeds; y++) {
                vLedNames.push("LED " + (++idx));
                vLedPositions.push([0, y]);
            }
        } else {
            // Estándar: Sube por la izquierda (X = 0, Y = 17 hacia 1)
            for (let y = gridH - 1; y >= 1; y--) {
                vLedNames.push("LED " + (++idx));
                vLedPositions.push([0, y]);
            }
            // Cruza por arriba hacia la derecha (X = 1 hacia 31, Y = 0)
            for (let x = 1; x <= topLeds; x++) {
                vLedNames.push("LED " + (++idx));
                vLedPositions.push([x, 0]);
            }
            // Baja por la derecha (X = 32, Y = 1 hacia 17)
            for (let y = 1; y <= rightLeds; y++) {
                vLedNames.push("LED " + (++idx));
                vLedPositions.push([gridW - 1, y]);
            }
        }
    } else {
        // Modo línea por si se cambia la cantidad
        device.setSize([count, 1]);
        for (let i = 0; i < count; i++) {
            vLedNames.push("LED " + (i + 1));
            vLedPositions.push([i, 0]);
        }
    }

    device.setControllableLeds(vLedNames, vLedPositions);
}

export function onLedCountChanged() {
    let count = getSafeCount();
    SetupLedGrid(count);
    let countPacket = [0x52, 0x42, 0x07, getNextSeq(), 0x95, count];
    countPacket.push(calcChecksum(countPacket, countPacket.length));
    sendRawBuffer(countPacket);
}

export function onBrightnessChanged() {
    let bright = getSafeBrightness();
    let brightPacket = [0x52, 0x42, 0x07, getNextSeq(), 0x87, Math.max(5, bright)];
    brightPacket.push(calcChecksum(brightPacket, brightPacket.length));
    sendRawBuffer(brightPacket);
}

export function onStripDirectionChanged() {
    SetupLedGrid(getSafeCount());
}

export function Render() {
    SendSyncScreen();
}

function SendSyncScreen() {
    let count = getSafeCount();
    let bright = getSafeBrightness();
    let order = getSafeOrder();
    let factor = bright / 100;
    let payload = [];

    for (let i = 0; i < count; i++) {
        let pos = vLedPositions[i] || [i, 0];
        let col = device.color(pos[0], pos[1]);

        let r = Math.round(col[0] * factor);
        let g = Math.round(col[1] * factor);
        let b = Math.round(col[2] * factor);

        let finalR = r, finalG = g, finalB = b;
        if (order === "GRB") {
            finalR = g; finalG = r; finalB = b;
        } else if (order === "BGR") {
            finalR = b; finalG = g; finalB = r;
        }

        let ledIndex = i + 1; // Base 1
        payload.push(ledIndex, finalR, finalG, finalB, ledIndex);
    }

    let totalLen = 7 + payload.length;
    let packet = new Array(totalLen).fill(0);

    packet[0] = 0x53; // 'S'
    packet[1] = 0x43; // 'C'
    packet[2] = (totalLen >> 8) & 0xFF;
    packet[3] = totalLen & 0xFF;
    packet[4] = getNextSeq();
    packet[5] = 0x80; // setSyncScreen

    for (let i = 0; i < payload.length; i++) {
        packet[6 + i] = payload[i];
    }

    packet[totalLen - 1] = calcChecksum(packet, totalLen - 1);

    sendRawBuffer(packet);
}

export function Shutdown() {
    let offPacket = [0x52, 0x42, 0x06, getNextSeq(), 0x97];
    offPacket.push(calcChecksum(offPacket, offPacket.length));
    sendRawBuffer(offPacket);
}
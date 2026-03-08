const QRCode = require('qrcode');

async function generatePairingQR(serverUrl, pairingToken) {
    const pairingData = {
        serverUrl: serverUrl,
        pairingToken: pairingToken,
        version: '1.0.1',
        timestamp: Date.now()
    };
    
    const dataString = JSON.stringify(pairingData);
    
    try {
        // Generate as data URL for display in HTML
        const qrDataUrl = await QRCode.toDataURL(dataString, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            width: 300
        });
        
        return qrDataUrl;
    } catch (error) {
        console.error('QR generation error:', error);
        throw error;
    }
}

module.exports = { generatePairingQR };

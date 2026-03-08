#!/usr/bin/env node

/**
 * NIVTO License Key Generator
 * 
 * Generates subscription license keys for NIVTO Staff Manager
 * Format: NIVTO-SUB-YYYYMMDD-XXXXX
 * 
 * Usage:
 *   node generate-license.js <days>
 *   
 * Examples:
 *   node generate-license.js 30          # 30-day subscription
 *   node generate-license.js 365         # 1-year subscription
 *   node generate-license.js --monthly   # Shortcut for 30 days
 *   node generate-license.js --yearly    # Shortcut for 365 days
 */

function generateLicenseKey(daysFromNow) {
    // Calculate expiry date
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + daysFromNow);
    
    // Format as YYYYMMDD
    const year = expiryDate.getFullYear();
    const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
    const day = String(expiryDate.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Generate random 5-character code (uppercase letters and digits)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Construct license key
    const licenseKey = `NIVTO-SUB-${dateStr}-${code}`;
    
    return {
        key: licenseKey,
        expiryDate: expiryDate.toLocaleDateString('en-ZA'),
        daysValid: daysFromNow
    };
}

function printLicenseInfo(license) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║       NIVTO Staff Manager - License Key               ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ License Key: ${license.key.padEnd(38)} ║`);
    console.log(`║ Valid Until: ${license.expiryDate.padEnd(38)} ║`);
    console.log(`║ Duration:    ${(license.daysValid + ' days').padEnd(38)} ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Instructions for Customer:');
    console.log('  1. Launch NIVTO Staff Manager (Windows or Android)');
    console.log('  2. When activation screen appears, click "Already Have a License Key?"');
    console.log('  3. Enter the license key exactly as shown above');
    console.log('  4. Click "Activate License"');
    console.log('  5. App will restart with full access\n');
    
    console.log('💰 Subscription: R349/month');
    console.log('📅 Free 5-day trial included on first launch');
    console.log('📞 Support: 074 353 2291\n');
}

// Parse command line arguments
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log('\nNIVTO License Key Generator');
        console.log('============================\n');
        console.log('Usage:');
        console.log('  node generate-license.js <days>');
        console.log('  node generate-license.js --monthly     # 30 days');
        console.log('  node generate-license.js --yearly      # 365 days');
        console.log('  node generate-license.js --bulk <count> <days>  # Generate multiple keys\n');
        console.log('Examples:');
        console.log('  node generate-license.js 30');
        console.log('  node generate-license.js --monthly');
        console.log('  node generate-license.js --bulk 10 30  # 10 monthly licenses\n');
        return;
    }
    
    // Handle bulk generation
    if (args[0] === '--bulk') {
        const count = parseInt(args[1]) || 1;
        const days = parseInt(args[2]) || 30;
        
        console.log(`\nGenerating ${count} license keys (${days} days each)...\n`);
        console.log('License Key                         | Expiry Date   | Days');
        console.log('====================================|===============|======');
        
        for (let i = 0; i < count; i++) {
            const license = generateLicenseKey(days);
            console.log(`${license.key} | ${license.expiryDate} | ${license.daysValid}`);
        }
        console.log('');
        return;
    }
    
    // Parse days
    let days;
    switch (args[0]) {
        case '--monthly':
        case '-m':
            days = 30;
            break;
        case '--yearly':
        case '-y':
            days = 365;
            break;
        default:
            days = parseInt(args[0]);
            if (isNaN(days) || days <= 0) {
                console.error('Error: Invalid number of days');
                console.error('Usage: node generate-license.js <days>');
                process.exit(1);
            }
    }
    
    // Generate and display single license
    const license = generateLicenseKey(days);
    printLicenseInfo(license);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { generateLicenseKey };

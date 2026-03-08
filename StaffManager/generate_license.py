"""
NIVTO License Key Generator (Python version)

Generates subscription license keys for NIVTO Staff Manager
Format: NIVTO-SUB-YYYYMMDD-XXXXX

Usage:
    python generate_license.py <days>
    python generate_license.py --monthly
    python generate_license.py --yearly
    python generate_license.py --bulk <count> <days>

Examples:
    python generate_license.py 30
    python generate_license.py --monthly
    python generate_license.py --bulk 10 30
"""

import sys
import random
import string
from datetime import datetime, timedelta


def generate_license_key(days_from_now):
    """
    Generate a license key valid for specified number of days
    
    Args:
        days_from_now: Number of days the license should be valid
        
    Returns:
        dict: Contains 'key', 'expiry_date', and 'days_valid'
    """
    # Calculate expiry date
    expiry_date = datetime.now() + timedelta(days=days_from_now)
    
    # Format as YYYYMMDD
    date_str = expiry_date.strftime("%Y%m%d")
    
    # Generate random 5-character code (uppercase letters and digits)
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    
    # Construct license key
    license_key = f"NIVTO-SUB-{date_str}-{code}"
    
    return {
        'key': license_key,
        'expiry_date': expiry_date.strftime("%Y-%m-%d"),
        'days_valid': days_from_now
    }


def print_license_info(license):
    """Print license information in a formatted box"""
    print('\n╔════════════════════════════════════════════════════════╗')
    print('║       NIVTO Staff Manager - License Key               ║')
    print('╠════════════════════════════════════════════════════════╣')
    print(f'║ License Key: {license["key"]:<38} ║')
    print(f'║ Valid Until: {license["expiry_date"]:<38} ║')
    print(f'║ Duration:    {str(license["days_valid"]) + " days":<38} ║')
    print('╚════════════════════════════════════════════════════════╝\n')
    
    print('📋 Instructions for Customer:')
    print('  1. Launch NIVTO Staff Manager (Windows or Android)')
    print('  2. When activation screen appears, click "Already Have a License Key?"')
    print('  3. Enter the license key exactly as shown above')
    print('  4. Click "Activate License"')
    print('  5. App will restart with full access\n')
    
    print('💰 Subscription: R349/month')
    print('📅 Free 5-day trial included on first launch')
    print('📞 Support: 074 353 2291\n')


def print_help():
    """Print usage instructions"""
    print('\nNIVTO License Key Generator')
    print('============================\n')
    print('Usage:')
    print('  python generate_license.py <days>')
    print('  python generate_license.py --monthly     # 30 days')
    print('  python generate_license.py --yearly      # 365 days')
    print('  python generate_license.py --bulk <count> <days>  # Generate multiple keys\n')
    print('Examples:')
    print('  python generate_license.py 30')
    print('  python generate_license.py --monthly')
    print('  python generate_license.py --bulk 10 30  # 10 monthly licenses\n')


def main():
    """Main function to parse arguments and generate licenses"""
    args = sys.argv[1:]
    
    # Show help
    if len(args) == 0 or args[0] in ['--help', '-h']:
        print_help()
        return
    
    # Handle bulk generation
    if args[0] == '--bulk':
        count = int(args[1]) if len(args) > 1 else 1
        days = int(args[2]) if len(args) > 2 else 30
        
        print(f'\nGenerating {count} license keys ({days} days each)...\n')
        print('License Key                         | Expiry Date   | Days')
        print('====================================|===============|======')
        
        for _ in range(count):
            license = generate_license_key(days)
            print(f'{license["key"]} | {license["expiry_date"]} | {license["days_valid"]}')
        
        print('')
        return
    
    # Parse days
    if args[0] in ['--monthly', '-m']:
        days = 30
    elif args[0] in ['--yearly', '-y']:
        days = 365
    else:
        try:
            days = int(args[0])
            if days <= 0:
                raise ValueError
        except ValueError:
            print('Error: Invalid number of days')
            print('Usage: python generate_license.py <days>')
            sys.exit(1)
    
    # Generate and display single license
    license = generate_license_key(days)
    print_license_info(license)


if __name__ == '__main__':
    main()

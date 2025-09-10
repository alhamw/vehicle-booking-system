#!/bin/bash

# This file can be double-clicked from Finder to launch the system
# The .command extension allows it to run directly from macOS Finder

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run the main control script
"$SCRIPT_DIR/run-system.sh" start

# Keep terminal open
echo ""
echo "Press any key to continue..."
read -n 1





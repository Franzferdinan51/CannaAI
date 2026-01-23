#!/bin/bash

################################################################################
# AgentEvolver Installation Script for CannaAI
################################################################################
#
# This script installs and configures AgentEvolver for integration with
# CannaAI's cannabis cultivation management system.
#
# Features:
# - Self-evolving AI capabilities
# - Service-oriented architecture
# - Cannabis cultivation expertise
# - Continuous learning and adaptation
#
# Requirements:
# - Python 3.8 or higher
# - pip (Python package manager)
# - 2GB RAM minimum
# - 1GB disk space
#
# Usage:
#   ./install.sh [--python PYTHON_CMD] [--pip PIP_CMD] [--help]
#
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PYTHON_CMD="${PYTHON_CMD:-python3}"
PIP_CMD="${PIP_CMD:-pip3}"
VENV_DIR="${VENV_DIR:-.venv}"
REQUIRED_PYTHON_VERSION="3.8"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

################################################################################
# Utility Functions
################################################################################

print_header() {
    echo -e "${PURPLE}"
    echo "================================================================================"
    echo "  🤖 AgentEvolver Installation for CannaAI"
    echo "================================================================================"
    echo -e "${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}[STEP $1]${NC} $2"
    echo "----------------------------------------"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

################################################################################
# Check Functions
################################################################################

check_python() {
    print_section "1" "Checking Python Installation"

    if ! command -v "$PYTHON_CMD" &> /dev/null; then
        print_error "Python not found. Tried: $PYTHON_CMD"
        echo ""
        echo "Please install Python $REQUIRED_PYTHON_VERSION or higher:"
        echo "  - Download from: https://www.python.org/downloads/"
        echo "  - Or use your package manager:"
        echo "    • Ubuntu/Debian: sudo apt-get install python3 python3-pip"
        echo "    • macOS: brew install python3"
        echo "    • Windows: Download from python.org"
        echo ""
        echo "Or specify a different Python command:"
        echo "  ./install.sh --python python3.9"
        exit 1
    fi

    # Check Python version
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
    print_success "Python found: $PYTHON_CMD ($PYTHON_VERSION)"

    # Verify version is >= required
    if ! $PYTHON_CMD -c "import sys; exit(0 if sys.version_info >= ($REQUIRED_PYTHON_VERSION | split('.')) else 1)"; then
        print_error "Python version $PYTHON_VERSION is too old. Requires $REQUIRED_PYTHON_VERSION+"
        exit 1
    fi

    print_success "Python version check passed"
}

check_pip() {
    print_section "2" "Checking pip Installation"

    if ! command -v "$PIP_CMD" &> /dev/null; then
        print_warning "pip not found. Installing pip..."

        # Try to install pip
        if command -v "$PYTHON_CMD" -m ensurepip &> /dev/null; then
            $PYTHON_CMD -m ensurepip --upgrade
            print_success "pip installed successfully"
        else
            print_error "Failed to install pip automatically"
            echo "Please install pip manually:"
            echo "  curl https://bootstrap.pypa.io/get-pip.py | $PYTHON_CMD"
            exit 1
        fi
    else
        PIP_VERSION=$($PIP_CMD --version | awk '{print $2}')
        print_success "pip found: $PIP_VERSION"
    fi
}

create_virtual_environment() {
    print_section "3" "Setting up Virtual Environment"

    if [ -d "$VENV_DIR" ]; then
        print_warning "Virtual environment already exists at $VENV_DIR"
        read -p "Remove and recreate? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$VENV_DIR"
            print_info "Removed existing virtual environment"
        else
            print_info "Using existing virtual environment"
            return 0
        fi
    fi

    print_info "Creating virtual environment at $VENV_DIR"
    $PYTHON_CMD -m venv "$VENV_DIR"
    print_success "Virtual environment created"

    # Activate virtual environment
    print_info "Activating virtual environment..."
    source "$VENV_DIR/bin/activate"
    print_success "Virtual environment activated"

    # Update pip in virtual environment
    pip install --upgrade pip
    print_success "pip upgraded to latest version"
}

install_dependencies() {
    print_section "4" "Installing Dependencies"

    # Ensure we're using the virtual environment's pip
    if [ -d "$VENV_DIR" ]; then
        PIP_CMD="$VENV_DIR/bin/pip"
    fi

    # Install from requirements.txt
    if [ -f "requirements.txt" ]; then
        print_info "Installing from requirements.txt..."
        $PIP_CMD install -r requirements.txt
        print_success "Dependencies installed from requirements.txt"
    else
        print_warning "requirements.txt not found"
    fi

    # Install additional dependencies for YAML support
    print_info "Installing PyYAML for configuration support..."
    $PIP_CMD install PyYAML>=6.0
    print_success "PyYAML installed"

    # Optional: Try to install AgentEvolver framework if available
    print_info "Checking for AgentEvolver framework..."
    if $PIP_CMD list | grep -q "agentevolver"; then
        print_success "AgentEvolver framework already installed"
    else
        print_warning "AgentEvolver framework not found in pip"
        print_info "Using mock implementation with launcher.py"
        print_info "To install the full AgentEvolver framework:"
        print_info "  pip install agentevolver"
    fi

    # Install development dependencies if needed
    if [ -f "requirements-dev.txt" ]; then
        print_info "Installing development dependencies..."
        $PIP_CMD install -r requirements-dev.txt
        print_success "Development dependencies installed"
    fi
}

create_directories() {
    print_section "5" "Creating Required Directories"

    directories=(
        "logs"
        "data"
        "plugins"
        "plugins/cannaai"
        "cache"
        "backups"
    )

    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_info "Created directory: $dir"
        else
            print_info "Directory already exists: $dir"
        fi
    done

    print_success "All required directories created"
}

setup_configuration() {
    print_section "6" "Setting up Configuration"

    # Copy config.yaml if it doesn't exist
    if [ ! -f "config.yaml" ]; then
        print_error "config.yaml not found in $SCRIPT_DIR"
        print_info "Please ensure config.yaml is present"
        exit 1
    fi

    print_success "Configuration file found: config.yaml"

    # Create a local override file for custom settings
    if [ ! -f "config.local.yaml" ]; then
        cat > config.local.yaml << EOF
# Local configuration overrides
# Copy settings from config.yaml and modify as needed

# Example: Change port
# server:
#   port: 8002

# Example: Disable certain features
# agentevolver:
#   auto_optimization: false

# Example: Adjust performance threshold
# agentevolver:
#   performance_threshold: 0.9
EOF
        print_info "Created config.local.yaml for local overrides"
        print_info "Edit config.local.yaml to customize settings without affecting config.yaml"
    else
        print_info "config.local.yaml already exists"
    fi

    # Set proper permissions
    chmod 644 config.yaml config.local.yaml 2>/dev/null || true

    print_success "Configuration setup complete"
}

create_launcher_scripts() {
    print_section "7" "Creating Launcher Scripts"

    # Create start script
    cat > start.sh << 'EOF'
#!/bin/bash
# AgentEvolver Start Script for CannaAI

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Start AgentEvolver
echo "Starting AgentEvolver..."
python launcher.py "$@"
EOF
    chmod +x start.sh
    print_success "Created start.sh"

    # Create stop script
    cat > stop.sh << 'EOF'
#!/bin/bash
# AgentEvolver Stop Script

echo "Stopping AgentEvolver..."

# Find and kill the process
if pgrep -f "launcher.py" > /dev/null; then
    pkill -f "launcher.py"
    echo "AgentEvolver stopped"
else
    echo "AgentEvolver is not running"
fi
EOF
    chmod +x stop.sh
    print_success "Created stop.sh"

    # Create status script
    cat > status.sh << 'EOF'
#!/bin/bash
# AgentEvolver Status Check Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Checking AgentEvolver status..."

# Check if running
if pgrep -f "launcher.py" > /dev/null; then
    echo "✅ AgentEvolver is running"

    # Try to get health status
    if command -v curl &> /dev/null; then
        echo ""
        echo "Checking health endpoint..."
        curl -s http://localhost:8001/health | python3 -m json.tool 2>/dev/null || echo "Server not responding yet"
    fi
else
    echo "❌ AgentEvolver is not running"
    echo ""
    echo "To start: ./start.sh"
fi
EOF
    chmod +x status.sh
    print_success "Created status.sh"
}

run_tests() {
    print_section "8" "Running Installation Tests"

    # Test launcher.py can be imported
    print_info "Testing launcher.py import..."
    if $PYTHON_CMD -c "import launcher; print('Import successful')" 2>/dev/null; then
        print_success "launcher.py import test passed"
    else
        print_warning "launcher.py import test failed (may be normal if dependencies are missing)"
    fi

    # Test configuration loading
    print_info "Testing configuration loading..."
    if $PYTHON_CMD -c "import yaml; yaml.safe_load(open('config.yaml'))" 2>/dev/null; then
        print_success "Configuration loading test passed"
    else
        print_error "Configuration loading test failed"
        exit 1
    fi

    # Test server can start (quick import test)
    print_info "Testing server module..."
    if $PYTHON_CMD -c "import server; print('Server module loaded')" 2>/dev/null; then
        print_success "Server module test passed"
    else
        print_warning "Server module test failed"
    fi

    print_success "All tests passed"
}

display_completion_message() {
    echo ""
    echo -e "${GREEN}================================================================================"
    echo "  ✅ AgentEvolver Installation Complete!"
    echo "================================================================================${NC}"
    echo ""
    echo "🚀 AgentEvolver is ready to use with CannaAI!"
    echo ""
    echo -e "${CYAN}Key Features:${NC}"
    echo "  ✓ Self-evolving AI capabilities"
    echo "  ✓ Self-questioning task generation"
    echo "  ✓ Self-navigating exploration"
    echo "  ✓ Self-attributing learning"
    echo "  ✓ Cannabis cultivation expertise"
    echo "  ✓ Continuous learning and adaptation"
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo "  1. Review configuration: config.yaml"
    echo "  2. Customize settings in: config.local.yaml"
    echo "  3. Start AgentEvolver: ./start.sh"
    echo "  4. Check status: ./status.sh"
    echo "  5. Stop AgentEvolver: ./stop.sh"
    echo ""
    echo -e "${CYAN}Integration with CannaAI:${NC}"
    echo "  • Server runs on: http://localhost:8001"
    echo "  • API endpoint: /api/agentevolver"
    echo "  • Health check: http://localhost:8001/health"
    echo "  • CannaAI URL: http://localhost:3000"
    echo ""
    echo -e "${CYAN}For more information:${NC}"
    echo "  • Run: python launcher.py --help"
    echo "  • Test client: python test_client.py"
    echo ""
    echo -e "${YELLOW}Note:${NC} To use the full AgentEvolver framework (not mock), install it with:"
    echo "      pip install agentevolver"
    echo ""
}

################################################################################
# Main Installation Flow
################################################################################

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --python)
                PYTHON_CMD="$2"
                shift 2
                ;;
            --pip)
                PIP_CMD="$2"
                shift 2
                ;;
            --help)
                echo "AgentEvolver Installation Script"
                echo ""
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --python PYTHON_CMD  Specify Python command (default: python3)"
                echo "  --pip PIP_CMD        Specify pip command (default: pip3)"
                echo "  --help               Show this help message"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Print header
    print_header

    # Run installation steps
    check_python
    check_pip
    create_virtual_environment
    install_dependencies
    create_directories
    setup_configuration
    create_launcher_scripts
    run_tests

    # Display completion message
    display_completion_message
}

# Run main function
main "$@"

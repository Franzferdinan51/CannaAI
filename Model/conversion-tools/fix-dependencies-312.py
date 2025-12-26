#!/usr/bin/env python3
"""
Fix Python dependencies for TF to GGUF conversion (Python 3.12 compatible)
Resolves protobuf conflicts and ensures compatible versions
"""

import subprocess
import sys
import os

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"[INFO] {description}...")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True)
        print(f"[SUCCESS] {description}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] {description} failed: {e}")
        if e.stdout:
            print(f"Output: {e.stdout}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        return False

def fix_dependencies():
    """Fix dependency conflicts for conversion"""
    print("=" * 60)
    print("Fixing Python Dependencies for GGUF Conversion (Python 3.12)")
    print("=" * 60)

    # Check current environment
    print("\n[INFO] Checking current Python environment...")
    run_command("python --version", "Python version check")

    # Install compatible versions for Python 3.12
    print("\n[INFO] Installing Python 3.12 compatible packages...")

    packages_to_install = [
        ("protobuf==3.20.3", "protobuf 3.20.3 (compatible)"),
        ("tensorflow", "TensorFlow (latest version for Python 3.12)"),
        ("h5py", "h5py (latest compatible)"),
        ("numpy", "NumPy (latest compatible)"),
        ("tf2onnx", "tf2onnx (latest compatible)"),
        ("onnx", "ONNX (latest compatible)"),
        ("pathlib2", "pathlib2 (if needed)"),
        ("tqdm", "tqdm for progress bars")
    ]

    success_count = 0
    for package, description in packages_to_install:
        if run_command(f"pip install {package}", f"Install {description}"):
            success_count += 1

    print(f"\n[INFO] Successfully installed {success_count}/{len(packages_to_install)} packages")

    # Verify installations
    print("\n[INFO] Verifying package installations...")

    verification_commands = [
        ("python -c \"import tensorflow; print(f'TensorFlow {tensorflow.__version__}')\" 2>nul", "TensorFlow"),
        ("python -c \"import h5py; print(f'h5py {h5py.__version__}')\" 2>nul", "h5py"),
        ("python -c \"import numpy; print(f'NumPy {numpy.__version__}')\" 2>nul", "NumPy"),
        ("python -c \"import tf2onnx; print(f'tf2onnx {tf2onnx.__version__}')\" 2>nul", "tf2onnx"),
        ("python -c \"import onnx; print(f'ONNX {onnx.__version__}')\" 2>nul", "ONNX"),
        ("python -c \"import protobuf; print(f'protobuf {protobuf.__version__}')\" 2>nul", "protobuf")
    ]

    verified_count = 0
    for cmd, name in verification_commands:
        if run_command(cmd, f"Verify {name}"):
            verified_count += 1

    print(f"\n[INFO] Verified {verified_count}/{len(verification_commands)} packages")

    # Test model loading
    if os.path.exists("best_model.h5"):
        print("\n[INFO] Testing model loading...")
        test_cmd = '''python -c "import tensorflow as tf; model = tf.keras.models.load_model('best_model.h5'); print(f'Model loaded successfully! Parameters: {model.count_params():,}')"'''
        if run_command(test_cmd, "Model loading test"):
            print("[SUCCESS] Model can be loaded successfully")
        else:
            print("[ERROR] Model loading failed - continuing anyway")
    else:
        print("[WARNING] best_model.h5 not found - skipping model test")

    print("\n" + "=" * 60)
    if verified_count >= 4:  # At least core packages working
        print("[SUCCESS] Core dependencies are working!")
        print("[INFO] You can now run the conversion script")
    else:
        print("[WARNING] Some packages may have issues")
        print("[INFO] You can try running the conversion anyway")
    print("=" * 60)

    return verified_count >= 4  # At least core packages working

if __name__ == "__main__":
    success = fix_dependencies()
    sys.exit(0 if success else 1)
import sys
print(f"Python Executable: {sys.executable}")
try:
    import rest_framework_simplejwt
    print("SUCCESS: rest_framework_simplejwt imported successfully.")
    print(f"Location: {rest_framework_simplejwt.__file__}")
except ImportError as e:
    print(f"FAILURE: {e}")

try:
    import corsheaders
    print("SUCCESS: corsheaders imported successfully.")
except ImportError as e:
    print(f"FAILURE: {e}")

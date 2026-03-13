import os
from pathlib import Path

from dotenv import load_dotenv


def main() -> None:
  # Always resolve .env from the project root, regardless of cwd.
  root = Path(__file__).resolve().parent
  env_path = root / ".env"

  print(f"Project root: {root}")
  print(f"Looking for .env at: {env_path}")

  if not env_path.exists():
    print("⚠️  .env file not found in project root.")
  else:
    load_dotenv(env_path)

  key = os.getenv("OPENAI_API_KEY")

  print(f"Current Directory: {os.getcwd()}")
  print(f"Files here: {os.listdir('.')}")
  print(f"OPENAI_API_KEY Found: {'✅ YES' if key else '❌ NO'}")
  if key:
    print(f"Key Prefix: {key[:8]}...")


if __name__ == "__main__":
  main()


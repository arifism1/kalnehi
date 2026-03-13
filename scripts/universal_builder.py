import os
import json
from pathlib import Path

import pdfplumber
from openai import OpenAI
from dotenv import load_dotenv


def get_project_root() -> Path:
  # scripts/universal_builder.py -> project root
  return Path(__file__).resolve().parents[1]


# Force load .env from the project root so it is stable
root = get_project_root()
env_path = root / ".env"
load_dotenv(env_path if env_path.exists() else None)

# 1. Update the Client to use the correct v1beta OpenAI-compatible endpoint
client = OpenAI(
  api_key=os.getenv("GEMINI_API_KEY"),
  base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)

# 2. Model: use a Gemini model that is available on the OpenAI-compatible endpoint.
# The error log from your last run shows that `gemini-3-flash` is not found for
# the current API version, so we fall back to `gemini-1.5-flash`, which is
# documented to work with the v1beta OpenAI-compatible path.
MODEL_NAME = "gemini-1.5-flash"


def classify_and_extract(file_path: Path):
  print(f"🕵️  Processing: {file_path.name}")
  try:
    with pdfplumber.open(str(file_path)) as pdf:
      header_text = "\n".join(
        [p.extract_text() for p in pdf.pages[:2] if p.extract_text()]
      )
      full_text = "\n".join([p.extract_text() for p in pdf.pages if p.extract_text()])

    prompt = (
      "Classify this NEET exam document into one word: "
      "'SYLLABUS', 'WEIGHTAGE', or 'DEPENDENCY'.\n"
      f"Content: {header_text[:1000]}"
    )

    response = client.chat.completions.create(
      model=MODEL_NAME,
      messages=[{"role": "user", "content": prompt}],
    )
    category = response.choices[0].message.content.strip().upper()
    print(f"✅ Result: {category}")
    return {"type": category, "content": full_text}
  except Exception as e:
    print(f"❌ Failed to read {file_path}: {e}")
    return None


def build_master_dataset(exam_name: str, folder_path: Path):
  print(f"🚀 ENGINE START: Building {exam_name}")

  if not folder_path.exists():
    print(f"❌ ERROR: Folder '{folder_path}' not found.")
    return

  pdf_files = sorted([p for p in folder_path.iterdir() if p.suffix.lower() == ".pdf"])
  print(f"📂 Found {len(pdf_files)} PDFs in {folder_path}")

  all_data = []
  for file_path in pdf_files:
    data = classify_and_extract(file_path)
    if data:
      all_data.append(data)

  if not all_data:
    print("❌ No data extracted. Check if PDFs are empty or encrypted.")
    return

  print(f"🧠 AI TRIANGULATION: Merging {len(all_data)} sources...")

  compact_payload = [
    {"type": d["type"], "content": d["content"][:3000]} for d in all_data
  ]

  master_prompt = f"""
Act as a NEET 2026 Architect. Create a canonical JSON dataset.
RULES:
1. Slugs must be kebab-case (e.g., phy-vectors-01).
2. Weightage (0-100) comes from WEIGHTAGE files.
3. Prerequisites come from DEPENDENCY files.
4. Topics list comes from SYLLABUS files.

DATA: {json.dumps(compact_payload)}
""".strip()

  try:
    completion = client.chat.completions.create(
      model=MODEL_NAME,
      messages=[{"role": "user", "content": master_prompt}],
      response_format={"type": "json_object"},
    )

    output_dir = get_project_root() / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{exam_name.lower()}_canonical.json"

    with output_path.open("w", encoding="utf-8") as f:
      f.write(completion.choices[0].message.content)

    print(f"🎉 SUCCESS: {output_path} created!")
  except Exception as e:
    print(f"❌ AI Merge Error: {e}")


if __name__ == "__main__":
  root = get_project_root()
  data_dir = root / "data" / "neet_files"
  build_master_dataset("NEET_2026", data_dir)


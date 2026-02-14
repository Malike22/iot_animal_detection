import os
import time
import threading
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# =========================
# CONFIG
# =========================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
MODEL_URL = os.getenv("MODEL_URL")  # HF Docker Space endpoint

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# =========================
# BACKGROUND STORAGE TASK
# =========================
def background_storage(image_bytes, filename, mimetype, animal, confidence, user_id):

    try:
        bucket = "labeled-images"

        # Upload image to Supabase Storage
        supabase.storage.from_(bucket).upload(
            filename,
            image_bytes,
            {"content-type": mimetype}
        )

        public_url = supabase.storage.from_(bucket).get_public_url(filename)

        # Insert record into database
        data = {
            "labeled_image_url": public_url,
            "animal_detected": animal,
            "confidence_score": confidence,
            "user_id": user_id
        }

        supabase.table("labeled_images").insert(data).execute()

        print("Stored detection:", animal)

    except Exception as e:
        print("Background storage error:", e)


# =========================
# PREDICT ENDPOINT (AI ONLY)
# =========================
@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    image_bytes = file.read()
    mimetype = file.mimetype

    try:
        # ===== SEND IMAGE TO HF DOCKER SPACE =====
        files = {"image": (file.filename, image_bytes, mimetype)}

        response = requests.post(
            MODEL_URL,
            files=files,
            timeout=120
        )

        response.raise_for_status()

        prediction = response.json()

        animal = prediction.get("label", "Unknown")
        confidence = float(prediction.get("confidence", 0)) * 100

        # ===== RETURN RESULT IMMEDIATELY (NO STORAGE) =====
        return jsonify({
            "status": "success",
            "animal": animal,
            "confidence": confidence
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# SAVE DETECTION ENDPOINT (MANUAL)
# =========================
@app.route("/save-detection", methods=["POST"])
def save_detection():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    animal = request.form.get("animal")
    confidence = request.form.get("confidence")
    user_id = request.form.get("user_id")

    if not all([animal, confidence, user_id]):
        return jsonify({"error": "Missing required data (animal, confidence, or user_id)"}), 400

    try:
        image_bytes = file.read()
        mimetype = file.mimetype
        # Using a folder-like path for "captured-images" bucket requirement if needed
        # But the user asked for bucket "captured-images" specifically.
        bucket = "captured-images"
        filename = f"{int(time.time())}_{file.filename}"

        # 1. Upload image to Supabase Storage
        supabase.storage.from_(bucket).upload(
            filename,
            image_bytes,
            {"content-type": mimetype}
        )

        # 2. Get Public URL
        public_url = supabase.storage.from_(bucket).get_public_url(filename)

        # 3. Insert record into database (labeled_images table)
        data = {
            "labeled_image_url": public_url,
            "animal_detected": animal,
            "confidence_score": float(confidence),
            "user_id": user_id
        }

        supabase.table("labeled_images").insert(data).execute()

        return jsonify({"status": "success", "message": "Detection saved to history"}), 200

    except Exception as e:
        print("Save detection error:", e)
        return jsonify({"error": str(e)}), 500


# =========================
# HEALTH CHECK
# =========================
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200


# =========================
# RUN SERVER
# =========================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

# Google Colab Integration Guide (Worker Mode)

This guide explains how to set up a Google Colab notebook as a pure AI inference worker. Colab will poll your backend for new images, perform animal detection using deep learning, and send results back—without running any public server or using ngrok.

## Architecture Overview

```
┌─────────────────────────┐
│  Flask Backend          │
│  (Vercel/Render/...)    │
│                         │
│  /api/pending-tasks     │◄─────┐
│  /api/submit-results    │      │ Polls & Posts
└─────────────────────────┘      │
                                 │
                            ┌─────────────┐
                            │Google Colab │
                            │(Worker)     │
                            └─────────────┘
```

The Google Colab notebook will:
1. **Poll** your backend for pending image processing tasks
2. **Download** images from Supabase Storage
3. **Process** images using deep learning model
4. **Send results** back to your backend API
5. **Loop continuously** without requiring ngrok or Flask

## Setting Up the Colab Notebook

### Step 1: Create a New Colab Notebook

Visit [Google Colab](https://colab.research.google.com/) and create a new notebook.

### Step 2: Install Required Libraries

```python
!pip install tensorflow pillow opencv-python requests numpy
```

### Step 3: Import Libraries and Set Configuration

```python
import os
import requests
import base64
import time
from PIL import Image, ImageDraw, ImageFont
import io
import tensorflow as tf
from tensorflow import keras
import numpy as np
import cv2

# CONFIGURATION - Update these values with YOUR deployed Flask backend URL
# Example: "https://your-app.vercel.app" or "https://your-app.onrender.com"
BACKEND_URL = "https://your-flask-backend.com"  # Replace with your actual backend URL
POLLING_INTERVAL = 5  # Check for tasks every 5 seconds
MAX_RETRIES = 3
RETRY_WAIT = 2

print("✅ Configuration:")
print(f"  Backend: {BACKEND_URL}")
print(f"  Polling interval: {POLLING_INTERVAL}s")
print("\n⚠️  Make sure BACKEND_URL is set to your deployed Flask backend!")
```

### Step 4: Set Up Authentication (Optional but Recommended)

```python
# If your backend requires authentication, set a secret key
# Store this securely - don't hardcode in production
BACKEND_SECRET_KEY = "your-secret-key-here"  # Optional: for backend verification

def get_headers():
    """Get request headers with optional authentication"""
    headers = {
        'Content-Type': 'application/json',
    }
    if BACKEND_SECRET_KEY:
        headers['X-Colab-Secret'] = BACKEND_SECRET_KEY
    return headers
```

### Step 5: Load Your Model

#### Option A: Use Pre-trained Model (MobileNetV2) - Recommended for Quick Start

```python
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions

print("📥 Loading MobileNetV2 model (first time may take ~30 seconds)...")
model = MobileNetV2(weights='imagenet')
print("✅ Model loaded!")

def classify_image(img_array):
    """Classify image using MobileNetV2"""
    try:
        # Preprocess
        img_resized = cv2.resize(img_array, (224, 224))
        img_preprocessed = preprocess_input(np.expand_dims(img_resized, axis=0))

        # Predict
        predictions = model.predict(img_preprocessed, verbose=0)
        decoded = decode_predictions(predictions, top=1)[0][0]

        class_name = decoded[1]
        confidence = float(decoded[2] * 100)

        # Map to common animals
        animal_map = {
            'ox': 'Cow',
            'water_buffalo': 'Buffalo',
            'indian_elephant': 'Elephant',
            'african_elephant': 'Elephant',
            'hog': 'Pig',
            'dog': 'Dog',
            'cat': 'Cat',
            'tiger': 'Tiger',
            'leopard': 'Leopard',
            'monkey': 'Monkey',
            'gorilla': 'Gorilla',
            'chimpanzee': 'Monkey',
            'deer': 'Deer',
            'wildcat': 'Wildcat'
        }

        detected_animal = animal_map.get(
            class_name.lower(),
            class_name.replace('_', ' ').title()
        )

        return detected_animal, confidence
    except Exception as e:
        print(f"⚠️ Classification error: {e}")
        return "Unknown", 0.0
```

#### Option B: Use YOLOv8 for Advanced Object Detection (Recommended for Accuracy)

YOLOv8 provides better bounding box detection and is specifically designed for object detection tasks.

```python
!pip install ultralytics -q

from ultralytics import YOLO

print("📥 Loading YOLOv8 model...")
model = YOLO("yolov8n.pt")  # nano - fastest, or use yolov8s.pt for small, yolov8m.pt for medium
print("✅ YOLOv8 model loaded!")

def classify_image(img_array):
    """Detect animals using YOLOv8"""
    try:
        # Run inference
        results = model.predict(source=img_array, conf=0.5, verbose=False)

        detected_animals = []
        best_confidence = 0
        best_animal = "Unknown"

        # Extract detections
        for r in results:
            boxes = r.boxes
            names = r.names

            for box in boxes:
                cls_id = int(box.cls[0])
                label = names[cls_id]
                confidence = float(box.conf[0]) * 100

                detected_animals.append(label)

                # Track best detection
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_animal = label

        # Return most confident detection or Unknown if no detections
        if best_animal != "Unknown":
            return best_animal, best_confidence
        else:
            return "Unknown", 0.0

    except Exception as e:
        print(f"⚠️ Detection error: {e}")
        return "Unknown", 0.0
```

#### Option C: Load Custom Trained Model from Google Drive

```python
from google.colab import drive

# Mount Google Drive to access your trained model
drive.mount('/content/drive')

print("📥 Loading custom model...")
model = keras.models.load_model('/content/drive/MyDrive/animal_model.h5')

CLASS_NAMES = ['Cow', 'Elephant', 'Dog', 'Monkey', 'Deer', 'Wild Boar']

def classify_image(img_array):
    """Classify image using custom model"""
    try:
        img_resized = cv2.resize(img_array, (224, 224))
        img_normalized = img_resized / 255.0
        img_batch = np.expand_dims(img_normalized, axis=0)

        predictions = model.predict(img_batch, verbose=0)
        class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][class_idx] * 100)

        return CLASS_NAMES[class_idx], confidence
    except Exception as e:
        print(f"⚠️ Classification error: {e}")
        return "Unknown", 0.0
```

### Step 6: Helper Functions

```python
def download_image(image_url):
    """Download image from URL"""
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        img = Image.open(io.BytesIO(response.content))
        return np.array(img.convert('RGB'))
    except Exception as e:
        print(f"❌ Failed to download image: {e}")
        return None

def draw_label_on_image(img_array, animal_name, confidence):
    """Add detection label to image"""
    try:
        img = Image.fromarray(img_array.astype('uint8'))
        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40
            )
        except:
            font = ImageFont.load_default()

        label_text = f"{animal_name} ({confidence:.1f}%)"
        bbox = draw.textbbox((0, 0), label_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Draw background box
        draw.rectangle(
            [(10, 10), (text_width + 30, text_height + 30)],
            fill=(0, 255, 0)
        )
        draw.text((20, 20), label_text, fill=(0, 0, 0), font=font)

        return np.array(img)
    except Exception as e:
        print(f"⚠️ Failed to draw label: {e}")
        return img_array

def image_to_base64(img_array):
    """Convert image array to base64 string"""
    try:
        img = Image.fromarray(img_array.astype('uint8'))
        buffered = io.BytesIO()
        img.save(buffered, format="JPEG", quality=85)
        return base64.b64encode(buffered.getvalue()).decode()
    except Exception as e:
        print(f"❌ Failed to encode image: {e}")
        return None
```

### Step 7: Main Worker Loop

```python
def poll_and_process_tasks():
    """Main worker loop - continuously poll for tasks and process them"""

    print("🚀 Starting Colab worker...")
    print(f"📍 Backend: {BACKEND_URL}")
    print(f"⏱️  Polling every {POLLING_INTERVAL}s for new tasks\n")

    session_id = f"colab-{int(time.time())}"
    task_count = 0

    while True:
        try:
            # Step 1: Poll for pending tasks
            try:
                response = requests.get(
                    f"{BACKEND_URL}/api/pending-tasks",
                    headers=get_headers(),
                    timeout=10
                )
                response.raise_for_status()
                task = response.json().get('task')
            except requests.exceptions.RequestException as e:
                print(f"⚠️  Failed to fetch task: {e}")
                time.sleep(POLLING_INTERVAL)
                continue

            # No task available yet
            if not task:
                print(f"⏳ Waiting for tasks... ({time.strftime('%H:%M:%S')})")
                time.sleep(POLLING_INTERVAL)
                continue

            task_id = task.get('id')
            image_url = task.get('image_url')
            captured_image_id = task.get('captured_image_id')
            user_id = task.get('user_id')

            print(f"\n{'='*60}")
            print(f"📸 Processing task {task_id}")
            print(f"   Image: {image_url[:50]}...")
            print(f"{'='*60}")

            # Step 2: Download image
            print("📥 Downloading image...")
            img_array = download_image(image_url)

            if img_array is None:
                print(f"❌ Task {task_id} failed: Could not download image")
                submit_result(task_id, captured_image_id, user_id,
                            success=False, error="Download failed")
                continue

            # Step 3: Classify animal
            print("🤖 Running animal detection...")
            animal_detected, confidence = classify_image(img_array)
            print(f"✅ Detected: {animal_detected} ({confidence:.1f}%)")

            # Step 4: Draw label on image
            print("🎨 Creating labeled image...")
            labeled_img = draw_label_on_image(img_array, animal_detected, confidence)

            # Step 5: Convert to base64
            labeled_img_base64 = image_to_base64(labeled_img)

            if labeled_img_base64 is None:
                print(f"❌ Task {task_id} failed: Could not encode image")
                submit_result(task_id, captured_image_id, user_id,
                            success=False, error="Encoding failed")
                continue

            # Step 6: Submit results back to backend
            print("📤 Submitting results...")
            success = submit_result(
                task_id,
                captured_image_id,
                user_id,
                animal_detected=animal_detected,
                confidence_score=confidence,
                labeled_image_base64=labeled_img_base64,
                success=True
            )

            if success:
                task_count += 1
                print(f"✅ Task completed! (Total: {task_count})")

        except KeyboardInterrupt:
            print("\n\n⛔ Worker stopped by user")
            break
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            time.sleep(POLLING_INTERVAL)

def submit_result(task_id, captured_image_id, user_id,
                 animal_detected=None, confidence_score=None,
                 labeled_image_base64=None, success=False, error=None):
    """Submit processing result back to backend"""
    try:
        payload = {
            'task_id': task_id,
            'captured_image_id': captured_image_id,
            'user_id': user_id,
            'success': success
        }

        if success:
            payload.update({
                'animal_detected': animal_detected,
                'confidence_score': confidence_score,
                'labeled_image_base64': labeled_image_base64
            })
        else:
            payload['error'] = error

        response = requests.post(
            f"{BACKEND_URL}/api/submit-results",
            json=payload,
            headers=get_headers(),
            timeout=30
        )
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"❌ Failed to submit results: {e}")
        return False

# Start the worker
poll_and_process_tasks()
```

### Step 8: Run the Worker

Simply run the notebook with all cells executed in order. The worker will continuously poll your backend and process tasks.

## Training a Custom Model (Optional)

### Option 1: Train Custom YOLOv8 Model (Recommended for Production)

YOLOv8 provides superior performance for animal detection tasks with bounding box accuracy.

```python
from ultralytics import YOLO
from google.colab import files
import zipfile
import os

# 1. Prepare your dataset with YOLOv8 structure:
#    dataset/
#    ├── images/
#    │   ├── train/
#    │   ├── val/
#    │   └── test/
#    └── labels/
#        ├── train/
#        ├── val/
#        └── test/
#
# YAML format should be:
# path: /content/dataset
# train: images/train
# val: images/val
# test: images/test
# nc: 6  # number of classes
# names: ['Cow', 'Elephant', 'Dog', 'Monkey', 'Deer', 'WildBoar']

# 2. Import dataset from local files or Google Drive
print("📁 Importing dataset...")

# Option A: Upload ZIP file from local machine
print("Select your dataset ZIP file:")
uploaded = files.upload()
zip_file = list(uploaded.keys())[0]
extract_path = "/content/animal_dataset"

with zipfile.ZipFile(zip_file, 'r') as zip_ref:
    zip_ref.extractall(extract_path)

print(f"✅ Dataset extracted to {extract_path}")
print(f"📂 Contents: {os.listdir(extract_path)}")

# Option B: Use from Google Drive (uncomment if using Drive)
# from google.colab import drive
# drive.mount('/content/drive')
# extract_path = '/content/drive/MyDrive/animal_dataset'

# 3. Train YOLOv8 model
print("🚀 Starting YOLOv8 training...")
model = YOLO("yolov8m.pt")  # nano (n), small (s), medium (m), large (l)

results = model.train(
    data=f"{extract_path}/data.yaml",
    epochs=50,
    imgsz=640,
    batch=16,  # adjust based on GPU memory (8, 16, 32)
    patience=20,
    device=0,  # GPU device
    name="animal_detection_yolo",
    save=True,
    cache=True,
    augment=True,
    rect=True
)

print("✅ Training complete!")

# 4. Validate model
print("📊 Running validation...")
metrics = model.val()
print(f"mAP50: {metrics.box.map50}")
print(f"mAP50-95: {metrics.box.map}")

# 5. Test on sample image
print("🧪 Testing on sample image...")
test_results = model.predict(source=f"{extract_path}/images/test", conf=0.5)

# 6. Save model to Google Drive
import shutil
drive.mount('/content/drive', force_remount=True)
model_save_path = '/content/drive/MyDrive/yolov8_animal_model.pt'
shutil.copy(model.trainer.best, model_save_path)
print(f"✅ Best model saved to: {model_save_path}")

# 7. Export model for deployment
model.export(format='pt')  # PyTorch
print("✅ Model exported!")
```

**Using Custom Trained YOLOv8 Model in Worker**:

Replace the model loading section with:

```python
!pip install ultralytics -q
from ultralytics import YOLO
from google.colab import drive

drive.mount('/content/drive')

# Load your trained model
model = YOLO('/content/drive/MyDrive/yolov8_animal_model.pt')
print("✅ Custom YOLOv8 model loaded!")

# The classify_image function remains the same as Option B above
def classify_image(img_array):
    """Detect animals using custom YOLOv8 model"""
    try:
        results = model.predict(source=img_array, conf=0.5, verbose=False)
        detected_animals = []
        best_confidence = 0
        best_animal = "Unknown"

        for r in results:
            boxes = r.boxes
            names = r.names
            for box in boxes:
                cls_id = int(box.cls[0])
                label = names[cls_id]
                confidence = float(box.conf[0]) * 100
                detected_animals.append(label)
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_animal = label

        if best_animal != "Unknown":
            return best_animal, best_confidence
        else:
            return "Unknown", 0.0

    except Exception as e:
        print(f"⚠️ Detection error: {e}")
        return "Unknown", 0.0
```

### Option 2: Train Custom TensorFlow/Keras Model

```python
# 1. Prepare dataset structure in Google Drive:
# /content/drive/MyDrive/dataset/
#   ├── cow/
#   ├── elephant/
#   ├── dog/
#   └── monkey/

# 2. Load and preprocess data
from tensorflow.keras.preprocessing.image import ImageDataGenerator

datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    horizontal_flip=True
)

train_generator = datagen.flow_from_directory(
    '/content/drive/MyDrive/dataset',
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical',
    subset='training'
)

validation_generator = datagen.flow_from_directory(
    '/content/drive/MyDrive/dataset',
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical',
    subset='validation'
)

# 3. Build model
from tensorflow.keras import layers, models

base_model = MobileNetV2(
    weights='imagenet',
    include_top=False,
    input_shape=(224, 224, 3)
)
base_model.trainable = False

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.5),
    layers.Dense(len(train_generator.class_indices), activation='softmax')
])

# 4. Compile and train
model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

history = model.fit(
    train_generator,
    epochs=10,
    validation_data=validation_generator
)

# 5. Save model to Google Drive
model.save('/content/drive/MyDrive/animal_model.h5')
print("✅ Model saved!")
```

## Configuration Steps

1. **Get Your Backend URL**
   - Deploy your Flask backend to Vercel, Render, or Railway
   - Copy the public URL
   - Paste in the Colab notebook BACKEND_URL setting

2. **(Optional) Set Secret Key**
   - For added security, define a secret key in both:
     - Colab: `BACKEND_SECRET_KEY`
     - Flask: Backend API validation
   - This prevents unauthorized task submissions

3. **Enable GPU in Colab** (Recommended)
   - Go to Runtime → Change runtime type
   - Select GPU for faster processing

## Important Notes

- **Colab Timeout**: Free Colab times out after 12 hours of inactivity. Use Colab Pro for longer sessions.
- **Worker Design**: This architecture has NO public server - Colab only makes outbound HTTP requests
- **Scalability**: You can run multiple Colab notebooks as workers (each polling independently)
- **Model Performance**: Pre-trained models work well; custom-trained models are more accurate
- **Error Handling**: Failed tasks are retried by the backend; Colab continues polling

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tasks not being fetched | Verify BACKEND_URL is correct and your Flask backend is running |
| "Failed to download image" | Check that image URLs in database are valid and accessible |
| Model prediction errors | Ensure image format is correct (JPG/PNG) and model matches input size |
| Results not saved | Verify Flask backend has `/api/submit-results` endpoint |
| Colab disconnects | Keep the notebook active; use Colab Pro for longer sessions |

## How It Works (Architecture Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│ Your Web App (React)                                        │
│ - Upload image                                              │
│ - View detection results                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase                                                    │
│ - Stores images in Storage bucket                           │
│ - Database: captured_images, labeled_images                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Flask Backend (Vercel/Render/Railway)                       │
│ - /api/pending-tasks     ◄──── Colab polls here            │
│ - /api/submit-results    ◄──── Colab posts results here    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Google Colab (Worker)                                       │
│ 1. Poll backend for tasks                                  │
│ 2. Download image from Supabase Storage                    │
│ 3. Run animal detection model                              │
│ 4. Send results back to Flask backend                      │
│ 5. Loop continuously                                        │
└─────────────────────────────────────────────────────────────┘
```

# Raspberry Pi Setup Guide

This guide will help you set up your Raspberry Pi 3B+ with the necessary hardware and software for the Animal Detection System.

## Hardware Requirements

- Raspberry Pi 3B+
- Raspberry Pi Camera Module
- PIR Motion Sensor
- LED (any color)
- Buzzer
- Breadboard
- Resistors (220Ω for LED, 1kΩ for buzzer)
- Jumper wires
- Power supply for Raspberry Pi

## Hardware Connections

### PIR Sensor
- VCC → 5V (Pin 2)
- GND → Ground (Pin 6)
- OUT → GPIO 17 (Pin 11)

### LED
- Anode (+) → GPIO 27 (Pin 13) through 220Ω resistor
- Cathode (-) → Ground (Pin 14)

### Buzzer
- Positive → GPIO 22 (Pin 15) through 1kΩ resistor
- Negative → Ground (Pin 20)

### Camera Module
- Connect to the Camera Serial Interface (CSI) port

## Software Setup

### 1. Enable Camera Interface

```bash
sudo raspi-config
```

Navigate to: `Interface Options` → `Camera` → `Enable`

### 2. Install Required Python Packages

```bash
sudo apt-get update
sudo apt-get install python3-pip python3-picamera
pip3 install RPi.GPIO requests pillow
```

### 3. Create Python Script

Create a file `animal_detection.py`:

```python
#!/usr/bin/env python3

import RPi.GPIO as GPIO
import picamera
import time
import requests
import base64
from io import BytesIO
from PIL import Image

# Pin Configuration
PIR_PIN = 17
LED_PIN = 27
BUZZER_PIN = 22

# API Configuration
# Get SUPABASE_URL from your Supabase dashboard: https://supabase.com/dashboard
# Get USER_ID from web app Settings page
API_URL = "https://your-project-id.supabase.co/functions/v1/upload-image"
USER_ID = "your-user-id-from-settings-page"

# Setup GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(PIR_PIN, GPIO.IN)
GPIO.setup(LED_PIN, GPIO.OUT)
GPIO.setup(BUZZER_PIN, GPIO.OUT)

# Initialize Camera
camera = picamera.PiCamera()
camera.resolution = (1024, 768)

def capture_and_upload():
    """Capture image and upload to server"""
    print("Motion detected!")

    # Turn on LED immediately
    GPIO.output(LED_PIN, GPIO.HIGH)

    # Capture image
    stream = BytesIO()
    camera.capture(stream, format='jpeg')
    stream.seek(0)

    # Convert to base64
    img = Image.open(stream)
    buffered = BytesIO()
    img.save(buffered, format="JPEG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode()

    # Upload to server
    try:
        response = requests.post(
            API_URL,
            json={
                "image": img_base64,
                "userId": USER_ID,
                "metadata": {
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "device": "raspberry_pi_3b"
                }
            },
            timeout=30
        )

        if response.status_code == 200:
            print("Image uploaded successfully!")
        else:
            print(f"Upload failed: {response.text}")
    except Exception as e:
        print(f"Error uploading: {e}")

    # Wait 2 minutes then sound buzzer
    time.sleep(120)

    # Buzzer pattern (beep 3 times)
    for _ in range(3):
        GPIO.output(BUZZER_PIN, GPIO.HIGH)
        time.sleep(0.5)
        GPIO.output(BUZZER_PIN, GPIO.LOW)
        time.sleep(0.5)

    # Turn off LED
    GPIO.output(LED_PIN, GPIO.LOW)

def main():
    """Main monitoring loop"""
    print("Animal Detection System Started")
    print("Waiting for motion...")

    try:
        while True:
            if GPIO.input(PIR_PIN):
                capture_and_upload()
                # Wait before detecting again
                time.sleep(10)
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\nStopping...")

    finally:
        GPIO.cleanup()
        camera.close()

if __name__ == "__main__":
    main()
```

### 4. Configure Your Settings

Edit the script and replace:
- `YOUR_SUPABASE_URL` with your actual Supabase URL
- `your-user-id-from-dashboard` with your User ID (found in dashboard settings)

### 5. Make Script Executable

```bash
chmod +x animal_detection.py
```

### 6. Run the Script

```bash
python3 animal_detection.py
```

### 7. Run on Startup (Optional)

To run automatically on boot:

```bash
sudo nano /etc/rc.local
```

Add before `exit 0`:

```bash
python3 /home/pi/animal_detection.py &
```

## Testing

1. Wave your hand in front of the PIR sensor
2. LED should turn on immediately
3. Check your dashboard for the captured image
4. After 2 minutes, buzzer should sound
5. Check for labeled image once AI processing completes

## Troubleshooting

### Camera not working
```bash
vcgencmd get_camera
```
Should show: `supported=1 detected=1`

### PIR sensor too sensitive
- Adjust the sensitivity potentiometer on the sensor
- Increase the delay time in code

### GPIO permission errors
```bash
sudo usermod -a -G gpio pi
```

## Notes

- Keep the Raspberry Pi connected to internet (WiFi or Ethernet)
- Ensure stable power supply
- Position PIR sensor at appropriate height (3-4 feet) for best detection
- Camera should have clear view of the detection area

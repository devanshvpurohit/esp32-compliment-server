#!/usr/bin/env python3
"""
Compliment Server for ESP32 Clock
Sends a random compliment to the ESP32 every 5 minutes via HTTP.
"""

import time
import random
import requests
from datetime import datetime

# Configuration
ESP32_IP = "192.168.4.1"  # Default AP mode IP, change to your ESP32's IP if in STA mode
ESP32_PORT = 80
COMPLIMENT_INTERVAL = 300  # 5 minutes in seconds

# Collection of compliments
COMPLIMENTS = [
    "You're doing great!",
    "Your code is awesome!",
    "Keep up the good work!",
    "You're a star!",
    "Believe in yourself!",
    "You're amazing!",
    "You light up the room!",
    "Your smile is contagious!",
    "You're one of a kind!",
    "You're making a difference!",
    "You're inspiring!",
    "You're a genius!",
    "You're unstoppable!",
    "You're brilliant!",
    "You rock!",
    "You're fantastic!",
    "You're wonderful!",
    "You're incredible!",
    "You're spectacular!",
    "You're phenomenal!",
    "Stay positive!",
    "You've got this!",
    "You're a champion!",
    "You're exceptional!",
    "You're magnificent!",
    "You're outstanding!",
    "You're remarkable!",
    "You're superb!",
    "You're terrific!",
    "You're fabulous!",
    "Dream big!",
    "Shine bright!",
    "Be awesome today!",
    "You're creative!",
    "You're talented!",
    "You're unique!",
    "You're valued!",
    "You're appreciated!",
    "You're capable!",
    "You're strong!",
]


def send_compliment(esp32_url, compliment):
    """Send a compliment to the ESP32 via HTTP POST."""
    try:
        # Send compliment as a POST request to a new endpoint we'll add
        response = requests.post(
            f"{esp32_url}/compliment",
            json={"message": compliment},
            timeout=5
        )
        
        if response.status_code == 200:
            print(f"✓ Compliment sent: {compliment}")
            return True
        else:
            print(f"✗ Failed to send compliment. Status: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Error connecting to ESP32: {e}")
        return False


def main():
    """Main loop to send compliments every 5 minutes."""
    esp32_url = f"http://{ESP32_IP}:{ESP32_PORT}"
    
    print("=" * 60)
    print("ESP32 Compliment Server")
    print("=" * 60)
    print(f"ESP32 Address: {esp32_url}")
    print(f"Interval: {COMPLIMENT_INTERVAL // 60} minutes")
    print(f"Total Compliments: {len(COMPLIMENTS)}")
    print("=" * 60)
    print("\nStarting compliment delivery...\n")
    
    while True:
        try:
            # Pick a random compliment
            compliment = random.choice(COMPLIMENTS)
            
            # Add timestamp
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] Sending compliment...")
            
            # Send to ESP32
            send_compliment(esp32_url, compliment)
            
            # Wait for next interval
            print(f"Next compliment in {COMPLIMENT_INTERVAL // 60} minutes...\n")
            time.sleep(COMPLIMENT_INTERVAL)
            
        except KeyboardInterrupt:
            print("\n\nCompliment server stopped by user. Goodbye! 👋")
            break
        except Exception as e:
            print(f"Unexpected error: {e}")
            print("Retrying in 30 seconds...")
            time.sleep(30)


if __name__ == "__main__":
    main()

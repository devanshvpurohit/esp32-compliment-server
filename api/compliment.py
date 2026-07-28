"""
Vercel Serverless Function - Get Random Compliment (JavaScript version available at compliment.js)
"""

import random
from http.server import BaseHTTPRequestHandler
import json

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
    "Today is your day!",
    "Keep shining!",
    "You inspire others!",
    "You're limitless!",
    "You're a rockstar!",
]


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Return a random compliment as JSON"""
        compliment = random.choice(COMPLIMENTS)
        
        response = {
            "success": True,
            "compliment": compliment,
            "total_compliments": len(COMPLIMENTS)
        }
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        self.wfile.write(json.dumps(response).encode())
        return

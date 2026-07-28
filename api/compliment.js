/**
 * Vercel Serverless Function - Get Random Compliment
 */

const COMPLIMENTS = [
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
];

function getRandomCompliment() {
  return COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
}

module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const compliment = getRandomCompliment();
  
  return res.status(200).json({
    success: true,
    compliment: compliment,
    total_compliments: COMPLIMENTS.length,
    timestamp: new Date().toISOString()
  });
};

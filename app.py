import pandas as pd
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import re

from cloudinary_mapping import SONGS, IMAGES

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

EMOJI_TO_SENTIMENT = {
    "😊": "Happy",
    "😢": "Sad",
    "😌": "Relaxed",
    "💪": "Motivated",
    "😁": "Happy",
    "😭": "Sad",
    "😎": "Relaxed",
    "🔥": "Motivated"
}

# Use a relative path so this works both locally and when deployed (e.g. Render)
df = pd.read_csv(os.path.join(BASE_DIR, "music_sentiment_dataset.csv"))


def normalize(name):
    """Lowercase, strip spaces/underscores for fuzzy matching against Cloudinary keys."""
    return re.sub(r'[\s_]+', '', str(name).strip().lower())


# Build normalized lookup dicts once at startup
SONGS_NORMALIZED = {normalize(k): v for k, v in SONGS.items()}
IMAGES_NORMALIZED = {normalize(k): v for k, v in IMAGES.items()}


def get_song_url(song_name):
    return SONGS_NORMALIZED.get(normalize(song_name))


def get_image_url(song_name):
    return IMAGES_NORMALIZED.get(normalize(song_name))


def recommend_songs(sentiment):
    songs = df[df['Sentiment_Label'].str.lower() == sentiment.lower()]
    if songs.empty:
        return []
    songs = songs.drop_duplicates(subset=['Song_Name', 'Artist'])
    result = []
    for _, row in songs.iterrows():
        song_name = row['Song_Name']
        file_url = get_song_url(song_name)
        image_url = get_image_url(song_name)
        mood = row.get('Mood')
        if not mood or pd.isna(mood):
            mood = sentiment
        result.append({
            'Song_Name': song_name,
            'Artist': row['Artist'],
            'Genre': row['Genre'],
            'Mood': mood,
            'file_url': file_url,
            'image_url': image_url
        })
    return result


@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    emoji = data.get('emoji', '').strip()
    sentiment = EMOJI_TO_SENTIMENT.get(emoji)
    if not sentiment:
        return jsonify({'error': "Unknown emoji"}), 400
    songs = recommend_songs(sentiment)
    return jsonify({'sentiment': sentiment, 'songs': songs})


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

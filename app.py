import pandas as pd
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SONGS_FOLDER = os.path.join(BASE_DIR, 'songs')
IMAGE_FOLDER = os.path.join(BASE_DIR, 'images')
CREATE_PLAYLIST = os.path.join(BASE_DIR, 'Create playlist')

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

df = pd.read_csv(r"C:\Users\shaik\OneDrive\Desktop\EMOJI\music_sentiment_dataset.csv")

def get_song_filename(song_name):
    # Normalize song name for matching
    base = song_name.strip().replace(' ', '').lower()
    for ext in ['.mp3', '.wav', '.ogg']:
        # Check for exact match (case-insensitive, ignoring spaces)
        for file in os.listdir(SONGS_FOLDER):
            if file.lower().endswith(ext):
                file_base = os.path.splitext(file)[0].replace(' ', '').lower()
                if file_base == base:
                    return file
    return None

def recommend_songs(sentiment):
    songs = df[df['Sentiment_Label'].str.lower() == sentiment.lower()]
    if songs.empty:
        return []
    songs = songs.drop_duplicates(subset=['Song_Name', 'Artist'])
    result = []
    for _, row in songs.iterrows():
        # Use File_Name column if present, else fallback to filename matching
        filename = None
        if 'File_Name' in df.columns and pd.notna(row.get('File_Name', None)):
            filename = row['File_Name']
        else:
            filename = get_song_filename(row['Song_Name'])
        file_url = f"/songs/{filename}" if filename else None
        mood = row.get('Mood')
        if not mood or pd.isna(mood):
            mood = sentiment
        result.append({
            'Song_Name': row['Song_Name'],
            'Artist': row['Artist'],
            'Genre': row['Genre'],
            'Mood': mood,
            'file_url': file_url
        })
    return result

@app.route('/songs/<path:filename>')
def serve_song(filename):
    return send_from_directory(SONGS_FOLDER, filename)

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    emoji = data.get('emoji', '').strip()
    sentiment = EMOJI_TO_SENTIMENT.get(emoji)
    if not sentiment:
        return jsonify({'error': "Unknown emoji"}), 400
    songs = recommend_songs(sentiment)
    return jsonify({'sentiment': sentiment, 'songs': songs})


# Route to serve images
@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(IMAGE_FOLDER, filename)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

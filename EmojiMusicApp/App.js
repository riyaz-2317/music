import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, StatusBar, SafeAreaView, Platform
} from 'react-native';
import { Audio } from 'expo-av';

const API_BASE = 'https://emoji-music-backend.onrender.com';

const EMOJIS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😃', label: 'Happy' },
  { emoji: '😄', label: 'Happy' },
  { emoji: '😆', label: 'Happy' },
  { emoji: '🤣', label: 'Happy' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😞', label: 'Sad' },
  { emoji: '😿', label: 'Sad' },
  { emoji: '😌', label: 'Relaxed' },
  { emoji: '😴', label: 'Relaxed' },
  { emoji: '😇', label: 'Relaxed' },
  { emoji: '🧘', label: 'Relaxed' },
  { emoji: '🤩', label: 'Motivated' },
  { emoji: '😤', label: 'Motivated' },
  { emoji: '🔥', label: 'Motivated' },
  { emoji: '💪', label: 'Motivated' },
];

export default function App() {
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [songs, setSongs] = useState([]);
  const [sentiment, setSentiment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentIdx, setCurrentIdx] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundObj, setSoundObj] = useState(null);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (soundObj) soundObj.unloadAsync();
    };
  }, [soundObj]);

  async function getRecommendation() {
    if (!selectedEmoji) {
      setError('Please select an emoji first.');
      return;
    }
    setError('');
    setLoading(true);
    setSongs([]);
    setSentiment('');
    setCurrentIdx(null);
    if (soundObj) {
      await soundObj.unloadAsync();
      setSoundObj(null);
      setIsPlaying(false);
    }
    try {
      const res = await fetch(`${API_BASE}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: selectedEmoji.emoji }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSongs(data.songs || []);
        setSentiment(data.sentiment || '');
      }
    } catch (e) {
      setError('Could not reach server. It may be waking up — try again in 30 seconds.');
    }
    setLoading(false);
  }

  async function playSong(idx) {
    try {
      // Stop current song if playing
      if (soundObj) {
        await soundObj.unloadAsync();
        setSoundObj(null);
        setIsPlaying(false);
      }
      if (currentIdx === idx && isPlaying) {
        setCurrentIdx(null);
        return;
      }
      const song = songs[idx];
      if (!song?.file_url) return;

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: song.file_url },
        { shouldPlay: true }
      );
      setSoundObj(sound);
      setCurrentIdx(idx);
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          // Auto-play next song
          const nextIdx = idx + 1;
          if (nextIdx < songs.length) {
            playSong(nextIdx);
          } else {
            setIsPlaying(false);
            setCurrentIdx(null);
          }
        }
      });
    } catch (e) {
      setError('Could not play this song.');
    }
  }

  async function playNext() {
    if (currentIdx !== null && currentIdx + 1 < songs.length) {
      await playSong(currentIdx + 1);
    }
  }

  async function playPrev() {
    if (currentIdx !== null && currentIdx - 1 >= 0) {
      await playSong(currentIdx - 1);
    }
  }

  const currentSong = currentIdx !== null ? songs[currentIdx] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#191414" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: `${API_BASE}/rvit.jpg` }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>🎵 Emoji Song Recommender</Text>
          <Text style={styles.subtitle}>Choose your mood</Text>
        </View>

        {/* Emoji Picker */}
        <TouchableOpacity
          style={styles.emojiSelector}
          onPress={() => setEmojiPickerVisible(!emojiPickerVisible)}
          activeOpacity={0.8}
        >
          <Text style={styles.emojiSelectorText}>
            {selectedEmoji ? `${selectedEmoji.emoji}  ${selectedEmoji.label}` : '-- Select an emoji --'}
          </Text>
          <Text style={styles.emojiChevron}>{emojiPickerVisible ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {emojiPickerVisible && (
          <View style={styles.emojiGrid}>
            {EMOJIS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.emojiItem, selectedEmoji?.emoji === item.emoji && styles.emojiItemSelected]}
                onPress={() => {
                  setSelectedEmoji(item);
                  setEmojiPickerVisible(false);
                }}
              >
                <Text style={styles.emojiItemEmoji}>{item.emoji}</Text>
                <Text style={styles.emojiItemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Get Recommendation Button */}
        <TouchableOpacity style={styles.recommendBtn} onPress={getRecommendation} activeOpacity={0.85}>
          <Text style={styles.recommendBtnText}>Get Recommendation</Text>
        </TouchableOpacity>

        {/* Error */}
        {!!error && <Text style={styles.error}>{error}</Text>}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1db954" />
            <Text style={styles.loadingText}>Finding songs... (may take 30s on first load)</Text>
          </View>
        )}

        {/* Now Playing Card */}
        {currentSong && (
          <View style={styles.nowPlayingCard}>
            {currentSong.image_url ? (
              <Image source={{ uri: currentSong.image_url }} style={styles.nowPlayingImage} resizeMode="cover" />
            ) : null}
            <Text style={styles.nowPlayingTitle}>{currentSong.Song_Name}</Text>
            <Text style={styles.nowPlayingArtist}>{currentSong.Artist}</Text>
            <Text style={styles.nowPlayingMood}>{currentSong.Genre} · {currentSong.Mood}</Text>
            <View style={styles.playerControls}>
              <TouchableOpacity style={styles.controlBtn} onPress={playPrev} disabled={currentIdx === 0}>
                <Text style={[styles.controlBtnText, currentIdx === 0 && styles.controlBtnDisabled]}>⏮️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pauseBtn} onPress={() => playSong(currentIdx)}>
                <Text style={styles.pauseBtnText}>{isPlaying ? '⏸' : '▶️'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlBtn} onPress={playNext} disabled={currentIdx === songs.length - 1}>
                <Text style={[styles.controlBtnText, currentIdx === songs.length - 1 && styles.controlBtnDisabled]}>⏭️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Song List */}
        {songs.length > 0 && (
          <View style={styles.songList}>
            <Text style={styles.songListTitle}>
              🎶 {sentiment} mood — {songs.length} songs
            </Text>
            {songs.map((song, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.songRow, currentIdx === idx && styles.songRowActive]}
                onPress={() => playSong(idx)}
                activeOpacity={0.75}
              >
                {song.image_url ? (
                  <Image source={{ uri: song.image_url }} style={styles.songThumb} resizeMode="cover" />
                ) : (
                  <View style={styles.songThumbPlaceholder}>
                    <Text style={{ fontSize: 22 }}>🎵</Text>
                  </View>
                )}
                <View style={styles.songInfo}>
                  <Text style={[styles.songName, currentIdx === idx && styles.songNameActive]} numberOfLines={1}>
                    {song.Song_Name}
                  </Text>
                  <Text style={styles.songArtist} numberOfLines={1}>{song.Artist}</Text>
                  <Text style={styles.songMeta} numberOfLines={1}>{song.Genre} · {song.Mood}</Text>
                </View>
                <Text style={styles.playIcon}>
                  {currentIdx === idx && isPlaying ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const GREEN = '#1db954';
const BG = '#191414';
const CARD = '#282828';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { padding: 16, paddingBottom: 40, backgroundColor: BG },

  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  logo: { width: 80, height: 80, borderRadius: 16, marginBottom: 10 },
  title: { color: GREEN, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#aaa', fontSize: 14, marginTop: 4 },

  emojiSelector: {
    backgroundColor: CARD, borderWidth: 1, borderColor: GREEN,
    borderRadius: 12, padding: 14, marginTop: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  emojiSelectorText: { color: '#fff', fontSize: 16 },
  emojiChevron: { color: GREEN, fontSize: 14 },

  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', marginTop: 8,
    backgroundColor: CARD, borderRadius: 12, padding: 8,
  },
  emojiItem: {
    width: '25%', alignItems: 'center', paddingVertical: 10,
    borderRadius: 10,
  },
  emojiItemSelected: { backgroundColor: '#1db95433' },
  emojiItemEmoji: { fontSize: 28 },
  emojiItemLabel: { color: '#aaa', fontSize: 10, marginTop: 2 },

  recommendBtn: {
    backgroundColor: GREEN, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 16,
  },
  recommendBtnText: { color: '#191414', fontWeight: 'bold', fontSize: 16 },

  error: { color: '#ff4c4c', textAlign: 'center', marginTop: 12, fontSize: 14 },

  loadingBox: { alignItems: 'center', marginTop: 24, gap: 10 },
  loadingText: { color: '#aaa', fontSize: 13, textAlign: 'center' },

  nowPlayingCard: {
    backgroundColor: CARD, borderRadius: 18, padding: 16,
    alignItems: 'center', marginTop: 20,
    borderWidth: 1, borderColor: GREEN,
  },
  nowPlayingImage: { width: 160, height: 160, borderRadius: 12, marginBottom: 12 },
  nowPlayingTitle: { color: GREEN, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  nowPlayingArtist: { color: '#fff', fontSize: 14, marginTop: 4 },
  nowPlayingMood: { color: '#aaa', fontSize: 12, marginTop: 2 },
  playerControls: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 16 },
  controlBtn: { padding: 8 },
  controlBtnText: { fontSize: 28 },
  controlBtnDisabled: { opacity: 0.3 },
  pauseBtn: {
    backgroundColor: GREEN, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
  },
  pauseBtnText: { fontSize: 24 },

  songList: { marginTop: 20 },
  songListTitle: { color: GREEN, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  songRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: CARD,
    borderRadius: 14, padding: 12, marginBottom: 10, gap: 12,
  },
  songRowActive: { borderWidth: 1, borderColor: GREEN, backgroundColor: '#1db95422' },
  songThumb: { width: 50, height: 50, borderRadius: 8 },
  songThumbPlaceholder: {
    width: 50, height: 50, borderRadius: 8,
    backgroundColor: '#333', alignItems: 'center', justifyContent: 'center',
  },
  songInfo: { flex: 1 },
  songName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  songNameActive: { color: GREEN },
  songArtist: { color: '#aaa', fontSize: 12, marginTop: 2 },
  songMeta: { color: '#666', fontSize: 11, marginTop: 1 },
  playIcon: { color: GREEN, fontSize: 20, paddingLeft: 4 },
});
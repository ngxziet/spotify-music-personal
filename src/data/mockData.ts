import { Song, Playlist } from '@/types';

export const CURATED_SONGS: Song[] = [
  {
    id: 'song-1',
    title: 'Midnight City Lights',
    artist: 'Lofi Dreamer & Chillhop Beats',
    album: 'Nocturnal Vibes',
    duration: 372,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    category: 'Lofi & Chill',
    lyrics: `[00:00.00] Midnight city lights reflecting on the window pane
[00:15.00] Gentle raindrops falling down like sweet champagne
[00:30.00] City sleeps while our quiet dreams remain
[00:45.00] Soft beats carry through the neon rain
[01:00.00] Lost in the melodies, feeling no pain
[01:15.00] Just you and the midnight sound again`,
    source: 'curated'
  },
  {
    id: 'song-2',
    title: 'Golden Sunset Breeze',
    artist: 'Acoustic Horizon',
    album: 'Endless Coast',
    duration: 423,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    category: 'Acoustic & Folk',
    lyrics: `[00:00.00] Walking barefoot on the golden sand
[00:20.00] Ocean waves whispering across the land
[00:40.00] Take a breath, let the world unwind
[01:00.00] Leaving all the worries far behind
[01:20.00] Sunsets warm the heart and peaceful mind`,
    source: 'curated'
  },
  {
    id: 'song-3',
    title: 'Neon Odyssey 2088',
    artist: 'CyberPulse & Synthwave Rider',
    album: 'Retro Future',
    duration: 348,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80',
    category: 'Synthwave & EDM',
    lyrics: `[00:00.00] Accelerating down the digital highway
[00:25.00] Neon laser grids lighting up the night sky
[00:50.00] Synthesizers hum as the engines fly
[01:15.00] Future rhythm pulsing through the wire
[01:40.00] Burning with electric fire`,
    source: 'curated'
  },
  {
    id: 'song-4',
    title: 'Raindrops & Warm Coffee',
    artist: 'Café de Paris Quartet',
    album: 'Sunday Morning Brew',
    duration: 302,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
    category: 'Jazz & Lofi',
    lyrics: `[00:00.00] Aroma of fresh coffee filling the room
[00:20.00] Rain outside washing away all the gloom
[00:40.00] Page of a book turned slow and light
[01:00.00] Everything feels cozy, warm and right
[01:20.00] Peaceful moments morning till the night`,
    source: 'curated'
  },
  {
    id: 'song-5',
    title: 'Moonlight Piano Reverie',
    artist: 'Elena Rostova',
    album: 'Solitude in Minor',
    duration: 353,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1520523839898-507127045c47?w=800&auto=format&fit=crop&q=80',
    category: 'Classical & Piano',
    lyrics: `[00:00.00] Keys dancing beneath gentle fingers
[00:30.00] A memory that softly lingers
[01:00.00] Starlight gleaming through the open door
[01:30.00] Piano echoes across the wooden floor`,
    source: 'curated'
  },
  {
    id: 'song-6',
    title: 'Deep Focus Flow',
    artist: 'Alpha Brainwave Society',
    album: 'Deep Work Lab',
    duration: 395,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    category: 'Focus & Study',
    lyrics: `[00:00.00] Clear mind, laser focused state
[00:30.00] Eliminate distractions, unlock the gate
[01:00.00] Pure flow, timeless and calm
[01:30.00] Sonic frequencies like soothing balm`,
    source: 'curated'
  },
  {
    id: 'song-7',
    title: 'Summer Festival Memories',
    artist: 'Solaris Beats feat. Maya',
    album: 'Euphoria Days',
    duration: 334,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    category: 'Pop & Dance',
    lyrics: `[00:00.00] Dancing under the confetti storm
[00:15.00] Bass vibrating while hearts stay warm
[00:30.00] Hands in the air, we sing out loud
[00:45.00] Shining brighter than any crowd
[01:00.00] Tonight we are forever young and proud!`,
    source: 'curated'
  },
  {
    id: 'song-8',
    title: 'Starlight Meditation',
    artist: 'Zenith Sound Lab',
    album: 'Cosmic Journey',
    duration: 320,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    category: 'Ambient & Sleep',
    lyrics: `[00:00.00] Floating amongst galaxies far away
[00:30.00] Cosmic dust glistening in gentle sway
[01:00.00] Breathe in calmness, breathe out release
[01:30.00] Infinite silence, everlasting peace`,
    source: 'curated'
  }
];

export const CURATED_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-chill-lofi',
    title: 'Lofi Chill & Thư Giãn',
    description: 'Những giai điệu Lofi êm dịu giúp bạn tập trung học tập, làm việc hoặc thư giãn cuối ngày.',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    songs: [CURATED_SONGS[0], CURATED_SONGS[3], CURATED_SONGS[5]],
    createdAt: '2026-01-01',
    isCustom: false
  },
  {
    id: 'playlist-top-hits',
    title: 'Today\'s Top Trending',
    description: 'Tổng hợp những bản nhạc sôi động và thịnh hành nhất toàn cầu.',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    songs: [CURATED_SONGS[6], CURATED_SONGS[2], CURATED_SONGS[1]],
    createdAt: '2026-01-02',
    isCustom: false
  },
  {
    id: 'playlist-peaceful-piano',
    title: 'Piano Tĩnh Lặng',
    description: 'Thanh âm dương cầm sâu lắng, êm dịu đưa bạn vào giấc ngủ ngon.',
    coverUrl: 'https://images.unsplash.com/photo-1520523839898-507127045c47?w=800&auto=format&fit=crop&q=80',
    songs: [CURATED_SONGS[4], CURATED_SONGS[7]],
    createdAt: '2026-01-03',
    isCustom: false
  },
  {
    id: 'playlist-deep-focus',
    title: 'Deep Work & Coding Flow',
    description: 'Âm nhạc không lời giúp tăng cường sự tập trung và đẩy cao hiệu suất làm việc.',
    coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    songs: [CURATED_SONGS[5], CURATED_SONGS[0], CURATED_SONGS[2]],
    createdAt: '2026-01-04',
    isCustom: false
  }
];

export const GENRES = [
  { id: 'all', name: 'Tất cả', color: 'from-emerald-600 to-teal-800' },
  { id: 'pop', name: 'Pop & Thịnh Hành', color: 'from-pink-600 to-rose-800' },
  { id: 'lofi', name: 'Lofi & Chill', color: 'from-amber-600 to-orange-800' },
  { id: 'edm', name: 'EDM & Dance', color: 'from-purple-600 to-indigo-800' },
  { id: 'piano', name: 'Piano & Cổ Điển', color: 'from-blue-600 to-cyan-800' },
  { id: 'acoustic', name: 'Acoustic & Indie', color: 'from-emerald-700 to-green-950' },
  { id: 'vpop', name: 'V-Pop Việt Nam', color: 'from-red-600 to-amber-700' },
  { id: 'rock', name: 'Rock & Metal', color: 'from-zinc-700 to-zinc-950' }
];

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdBanner from '../components/AdBanner'
import { getClubLogo, fetchLiveStandings, fetchLiveFixtures, type LiveStanding, type LiveFixture } from '../services/liveScoreApi'

// ─── Types ──────────────────────────────────────────────────────────────────
interface TeamRow {
  pos: number
  team: string
  abbr: string
  p: number; w: number; d: number; l: number
  gf: number; ga: number; gd: number; pts: number
  form: ('W' | 'D' | 'L')[]
  zone: 'ucl' | 'uel' | 'uecl' | 'rel' | ''
}

interface Scorer {
  name: string; club: string; goals: number; assists: number
}

interface LeagueData {
  label: string
  country: string
  flag: string
  table: TeamRow[]
  scorers: Scorer[]
}

// ─── Data ────────────────────────────────────────────────────────────────────
const LEAGUES: Record<string, LeagueData> = {
  epl: {
    label: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    scorers: [
      { name: 'Erling Haaland', club: 'Man City', goals: 27, assists: 5 },
      { name: 'Alexander Isak', club: 'Newcastle', goals: 22, assists: 4 },
      { name: 'Bukayo Saka', club: 'Arsenal', goals: 18, assists: 14 },
      { name: 'Cole Palmer', club: 'Chelsea', goals: 17, assists: 11 },
      { name: 'Mohamed Salah', club: 'Liverpool', goals: 16, assists: 13 },
    ],
    table: [
      { pos:1,  team:'Arsenal',       abbr:'ARS', p:33, w:24, d:6, l:3,  gf:72, ga:28, gd:44,  pts:78, form:['W','W','W','D','W'], zone:'ucl' },
      { pos:2,  team:'Liverpool',     abbr:'LIV', p:33, w:23, d:6, l:4,  gf:68, ga:32, gd:36,  pts:75, form:['W','D','W','W','L'], zone:'ucl' },
      { pos:3,  team:'Man City',      abbr:'MCI', p:33, w:21, d:8, l:4,  gf:65, ga:30, gd:35,  pts:71, form:['W','W','D','W','W'], zone:'ucl' },
      { pos:4,  team:'Chelsea',       abbr:'CHE', p:33, w:18, d:8, l:7,  gf:58, ga:40, gd:18,  pts:62, form:['L','W','W','D','W'], zone:'ucl' },
      { pos:5,  team:'Tottenham',     abbr:'TOT', p:33, w:16, d:10,l:7,  gf:55, ga:42, gd:13,  pts:58, form:['W','W','D','L','W'], zone:'uel' },
      { pos:6,  team:'Aston Villa',   abbr:'AVL', p:33, w:15, d:9, l:9,  gf:52, ga:44, gd:8,   pts:54, form:['D','W','L','W','W'], zone:'uel' },
      { pos:7,  team:'Newcastle',     abbr:'NEW', p:33, w:14, d:8, l:11, gf:50, ga:45, gd:5,   pts:50, form:['W','L','W','D','W'], zone:'uecl' },
      { pos:8,  team:'Man Utd',       abbr:'MUN', p:33, w:12, d:7, l:14, gf:42, ga:48, gd:-6,  pts:43, form:['L','D','W','L','D'], zone:'' },
      { pos:9,  team:'Brighton',      abbr:'BHA', p:33, w:11, d:9, l:13, gf:45, ga:50, gd:-5,  pts:42, form:['D','W','L','D','W'], zone:'' },
      { pos:10, team:'West Ham',      abbr:'WHU', p:33, w:11, d:8, l:14, gf:40, ga:52, gd:-12, pts:41, form:['L','L','W','D','W'], zone:'' },
      { pos:11, team:'Everton',       abbr:'EVE', p:33, w:9,  d:8, l:16, gf:35, ga:55, gd:-20, pts:35, form:['D','L','L','W','D'], zone:'' },
      { pos:12, team:'Fulham',        abbr:'FUL', p:33, w:9,  d:7, l:17, gf:38, ga:58, gd:-20, pts:34, form:['L','D','W','L','L'], zone:'' },
      { pos:13, team:'Brentford',     abbr:'BRE', p:33, w:8,  d:8, l:17, gf:36, ga:60, gd:-24, pts:32, form:['D','L','D','L','W'], zone:'' },
      { pos:14, team:'Crystal Palace',abbr:'CRY', p:33, w:8,  d:7, l:18, gf:30, ga:58, gd:-28, pts:31, form:['L','D','L','D','W'], zone:'' },
      { pos:15, team:'Wolves',        abbr:'WOL', p:33, w:7,  d:8, l:18, gf:32, ga:62, gd:-30, pts:29, form:['L','L','D','L','W'], zone:'' },
      { pos:16, team:'Nottm Forest',  abbr:'NFO', p:33, w:7,  d:7, l:19, gf:28, ga:60, gd:-32, pts:28, form:['D','L','L','L','D'], zone:'' },
      { pos:17, team:'Bournemouth',   abbr:'BOU', p:33, w:6,  d:9, l:18, gf:30, ga:62, gd:-32, pts:27, form:['L','D','L','D','L'], zone:'rel' },
      { pos:18, team:'Luton',         abbr:'LUT', p:33, w:5,  d:8, l:20, gf:25, ga:68, gd:-43, pts:23, form:['L','L','D','L','L'], zone:'rel' },
      { pos:19, team:'Burnley',       abbr:'BUR', p:33, w:4,  d:6, l:23, gf:22, ga:74, gd:-52, pts:18, form:['L','L','L','D','L'], zone:'rel' },
      { pos:20, team:'Sheffield Utd', abbr:'SHU', p:33, w:3,  d:5, l:25, gf:20, ga:80, gd:-60, pts:14, form:['L','L','L','L','L'], zone:'rel' },
    ]
  },
  laliga: {
    label: 'La Liga', country: 'Spain', flag: '🇪🇸',
    scorers: [
      { name: 'Kylian Mbappé', club: 'Real Madrid', goals: 31, assists: 8 },
      { name: 'Robert Lewandowski', club: 'Barcelona', goals: 26, assists: 6 },
      { name: 'Vinicius Jr', club: 'Real Madrid', goals: 19, assists: 15 },
      { name: 'Antoine Griezmann', club: 'Atletico', goals: 17, assists: 9 },
      { name: 'Artem Dovbyk', club: 'Girona', goals: 16, assists: 5 },
    ],
    table: [
      { pos:1,  team:'Real Madrid',  abbr:'RMA', p:33, w:26, d:4, l:3,  gf:78, ga:24, gd:54,  pts:82, form:['W','W','W','W','D'], zone:'ucl' },
      { pos:2,  team:'Barcelona',    abbr:'BAR', p:33, w:24, d:5, l:4,  gf:74, ga:30, gd:44,  pts:77, form:['W','W','D','W','W'], zone:'ucl' },
      { pos:3,  team:'Atletico',     abbr:'ATM', p:33, w:21, d:6, l:6,  gf:62, ga:28, gd:34,  pts:69, form:['W','D','W','L','W'], zone:'ucl' },
      { pos:4,  team:'Girona',       abbr:'GIR', p:33, w:20, d:5, l:8,  gf:68, ga:40, gd:28,  pts:65, form:['W','W','L','W','D'], zone:'ucl' },
      { pos:5,  team:'Athletic',     abbr:'ATH', p:33, w:17, d:7, l:9,  gf:54, ga:38, gd:16,  pts:58, form:['D','W','W','L','W'], zone:'uel' },
      { pos:6,  team:'Real Sociedad',abbr:'RSO', p:33, w:15, d:8, l:10, gf:48, ga:40, gd:8,   pts:53, form:['L','W','D','W','W'], zone:'uel' },
      { pos:7,  team:'Villarreal',   abbr:'VIL', p:33, w:14, d:7, l:12, gf:50, ga:44, gd:6,   pts:49, form:['W','L','W','D','L'], zone:'uecl' },
      { pos:8,  team:'Valencia',     abbr:'VAL', p:33, w:11, d:9, l:13, gf:40, ga:48, gd:-8,  pts:42, form:['D','L','W','D','L'], zone:'' },
      { pos:9,  team:'Sevilla',      abbr:'SEV', p:33, w:10, d:8, l:15, gf:38, ga:50, gd:-12, pts:38, form:['L','D','L','W','D'], zone:'' },
      { pos:10, team:'Betis',        abbr:'BET', p:33, w:10, d:7, l:16, gf:36, ga:52, gd:-16, pts:37, form:['W','L','L','D','W'], zone:'' },
      { pos:11, team:'Osasuna',      abbr:'OSA', p:33, w:9,  d:9, l:15, gf:34, ga:50, gd:-16, pts:36, form:['D','D','L','W','D'], zone:'' },
      { pos:12, team:'Mallorca',     abbr:'MAL', p:33, w:9,  d:8, l:16, gf:32, ga:54, gd:-22, pts:35, form:['L','W','D','L','D'], zone:'' },
      { pos:13, team:'Las Palmas',   abbr:'LPA', p:33, w:8,  d:8, l:17, gf:30, ga:55, gd:-25, pts:32, form:['D','L','D','L','W'], zone:'' },
      { pos:14, team:'Rayo',         abbr:'RAY', p:33, w:8,  d:7, l:18, gf:32, ga:58, gd:-26, pts:31, form:['L','D','L','D','L'], zone:'' },
      { pos:15, team:'Alaves',       abbr:'ALA', p:33, w:7,  d:9, l:17, gf:30, ga:60, gd:-30, pts:30, form:['D','L','D','L','L'], zone:'' },
      { pos:16, team:'Getafe',       abbr:'GET', p:33, w:7,  d:8, l:18, gf:28, ga:58, gd:-30, pts:29, form:['L','L','W','D','L'], zone:'' },
      { pos:17, team:'Celta Vigo',   abbr:'CEL', p:33, w:7,  d:7, l:19, gf:30, ga:62, gd:-32, pts:28, form:['L','D','L','L','D'], zone:'rel' },
      { pos:18, team:'Cadiz',        abbr:'CAD', p:33, w:5,  d:8, l:20, gf:24, ga:66, gd:-42, pts:23, form:['L','L','D','L','L'], zone:'rel' },
      { pos:19, team:'Granada',      abbr:'GRA', p:33, w:4,  d:6, l:23, gf:20, ga:74, gd:-54, pts:18, form:['L','L','L','D','L'], zone:'rel' },
      { pos:20, team:'Almeria',      abbr:'ALM', p:33, w:3,  d:5, l:25, gf:18, ga:80, gd:-62, pts:14, form:['L','L','L','L','L'], zone:'rel' },
    ]
  },
  bundesliga: {
    label: 'Bundesliga', country: 'Germany', flag: '🇩🇪',
    scorers: [
      { name: 'Harry Kane', club: 'Bayern Munich', goals: 36, assists: 8 },
      { name: 'Serhou Guirassy', club: 'Dortmund', goals: 25, assists: 4 },
      { name: 'Loïs Openda', club: 'RB Leipzig', goals: 22, assists: 7 },
      { name: 'Victor Boniface', club: 'Leverkusen', goals: 18, assists: 9 },
      { name: 'Deniz Undav', club: 'Stuttgart', goals: 17, assists: 6 },
    ],
    table: [
      { pos:1,  team:'Bayer Leverkusen',abbr:'LEV', p:32, w:26, d:5, l:1,  gf:82, ga:24, gd:58,  pts:83, form:['W','W','W','D','W'], zone:'ucl' },
      { pos:2,  team:'Bayern Munich',   abbr:'BAY', p:32, w:24, d:4, l:4,  gf:88, ga:32, gd:56,  pts:76, form:['W','W','D','W','W'], zone:'ucl' },
      { pos:3,  team:'VfB Stuttgart',   abbr:'STU', p:32, w:19, d:7, l:6,  gf:68, ga:38, gd:30,  pts:64, form:['W','D','W','W','L'], zone:'ucl' },
      { pos:4,  team:'RB Leipzig',      abbr:'RBL', p:32, w:19, d:6, l:7,  gf:65, ga:40, gd:25,  pts:63, form:['D','W','W','L','W'], zone:'ucl' },
      { pos:5,  team:'Borussia Dortmund',abbr:'BVB',p:32, w:16, d:7, l:9,  gf:58, ga:44, gd:14,  pts:55, form:['W','L','W','D','W'], zone:'uel' },
      { pos:6,  team:'Eintracht Frankfurt',abbr:'SGE',p:32,w:15,d:8,l:9,   gf:54, ga:42, gd:12,  pts:53, form:['L','W','W','W','D'], zone:'uel' },
      { pos:7,  team:'Hoffenheim',      abbr:'HOF', p:32, w:12, d:8, l:12, gf:46, ga:50, gd:-4,  pts:44, form:['D','W','L','D','L'], zone:'uecl' },
      { pos:8,  team:'Werder Bremen',   abbr:'WER', p:32, w:11, d:9, l:12, gf:44, ga:48, gd:-4,  pts:42, form:['W','D','L','W','D'], zone:'' },
      { pos:9,  team:'Heidenheim',      abbr:'HDH', p:32, w:11, d:7, l:14, gf:40, ga:52, gd:-12, pts:40, form:['L','W','D','L','W'], zone:'' },
      { pos:10, team:'Freiburg',        abbr:'SCF', p:32, w:10, d:9, l:13, gf:42, ga:50, gd:-8,  pts:39, form:['D','L','W','D','L'], zone:'' },
      { pos:11, team:'Borussia M\'Gladbach',abbr:'BMG',p:32,w:10,d:8,l:14,gf:40, ga:52, gd:-12, pts:38, form:['L','D','D','W','L'], zone:'' },
      { pos:12, team:'FC Augsburg',     abbr:'FCA', p:32, w:9,  d:9, l:14, gf:36, ga:54, gd:-18, pts:36, form:['W','L','D','L','D'], zone:'' },
      { pos:13, team:'Wolfsburg',       abbr:'WOB', p:32, w:9,  d:7, l:16, gf:38, ga:58, gd:-20, pts:34, form:['L','D','L','W','L'], zone:'' },
      { pos:14, team:'Union Berlin',    abbr:'FCU', p:32, w:7,  d:9, l:16, gf:32, ga:60, gd:-28, pts:30, form:['D','L','D','L','D'], zone:'' },
      { pos:15, team:'Bochum',          abbr:'BOC', p:32, w:6,  d:9, l:17, gf:28, ga:62, gd:-34, pts:27, form:['L','D','L','L','D'], zone:'rel' },
      { pos:16, team:'FC Köln',         abbr:'KOE', p:32, w:5,  d:8, l:19, gf:26, ga:68, gd:-42, pts:23, form:['L','L','D','L','L'], zone:'rel' },
      { pos:17, team:'SV Darmstadt',    abbr:'SVD', p:32, w:4,  d:6, l:22, gf:22, ga:76, gd:-54, pts:18, form:['L','L','L','D','L'], zone:'rel' },
      { pos:18, team:'VfL Bochum',      abbr:'VFL', p:32, w:3,  d:5, l:24, gf:18, ga:82, gd:-64, pts:14, form:['L','L','L','L','L'], zone:'rel' },
    ]
  },
  seriea: {
    label: 'Serie A', country: 'Italy', flag: '🇮🇹',
    scorers: [
      { name: 'Lautaro Martínez', club: 'Inter Milan', goals: 24, assists: 7 },
      { name: 'Dušan Vlahović', club: 'Juventus', goals: 19, assists: 4 },
      { name: 'Marcus Thuram', club: 'Inter Milan', goals: 17, assists: 9 },
      { name: 'Federico Chiesa', club: 'Juventus', goals: 16, assists: 8 },
      { name: 'Matteo Retegui', club: 'Genoa', goals: 14, assists: 3 },
    ],
    table: [
      { pos:1,  team:'Inter Milan',   abbr:'INT', p:33, w:27, d:4, l:2,  gf:82, ga:22, gd:60,  pts:85, form:['W','W','W','W','W'], zone:'ucl' },
      { pos:2,  team:'AC Milan',      abbr:'MIL', p:33, w:22, d:7, l:4,  gf:68, ga:30, gd:38,  pts:73, form:['W','W','D','W','L'], zone:'ucl' },
      { pos:3,  team:'Juventus',      abbr:'JUV', p:33, w:21, d:8, l:4,  gf:60, ga:28, gd:32,  pts:71, form:['D','W','W','W','D'], zone:'ucl' },
      { pos:4,  team:'Bologna',       abbr:'BOL', p:33, w:18, d:7, l:8,  gf:58, ga:36, gd:22,  pts:61, form:['W','D','W','L','W'], zone:'ucl' },
      { pos:5,  team:'Atalanta',      abbr:'ATA', p:33, w:18, d:6, l:9,  gf:66, ga:40, gd:26,  pts:60, form:['W','W','L','W','W'], zone:'uel' },
      { pos:6,  team:'Roma',          abbr:'ROM', p:33, w:16, d:7, l:10, gf:54, ga:42, gd:12,  pts:55, form:['L','W','D','W','W'], zone:'uel' },
      { pos:7,  team:'Lazio',         abbr:'LAZ', p:33, w:15, d:8, l:10, gf:50, ga:44, gd:6,   pts:53, form:['W','D','L','W','D'], zone:'uecl' },
      { pos:8,  team:'Fiorentina',    abbr:'FIO', p:33, w:14, d:8, l:11, gf:48, ga:44, gd:4,   pts:50, form:['D','W','W','L','D'], zone:'' },
      { pos:9,  team:'Torino',        abbr:'TOR', p:33, w:11, d:9, l:13, gf:40, ga:48, gd:-8,  pts:42, form:['L','D','W','D','L'], zone:'' },
      { pos:10, team:'Napoli',        abbr:'NAP', p:33, w:11, d:7, l:15, gf:44, ga:50, gd:-6,  pts:40, form:['W','L','L','D','W'], zone:'' },
      { pos:11, team:'Genoa',         abbr:'GEN', p:33, w:10, d:8, l:15, gf:38, ga:52, gd:-14, pts:38, form:['D','L','W','D','L'], zone:'' },
      { pos:12, team:'Monza',         abbr:'MON', p:33, w:9,  d:9, l:15, gf:36, ga:52, gd:-16, pts:36, form:['L','D','D','L','W'], zone:'' },
      { pos:13, team:'Lecce',         abbr:'LEC', p:33, w:8,  d:8, l:17, gf:32, ga:56, gd:-24, pts:32, form:['D','L','L','W','D'], zone:'' },
      { pos:14, team:'Hellas Verona', abbr:'HVE', p:33, w:7,  d:9, l:17, gf:30, ga:58, gd:-28, pts:30, form:['L','D','D','L','L'], zone:'' },
      { pos:15, team:'Cagliari',      abbr:'CAG', p:33, w:7,  d:8, l:18, gf:28, ga:60, gd:-32, pts:29, form:['L','W','D','L','L'], zone:'' },
      { pos:16, team:'Udinese',       abbr:'UDI', p:33, w:7,  d:7, l:19, gf:30, ga:62, gd:-32, pts:28, form:['D','L','L','D','L'], zone:'' },
      { pos:17, team:'Empoli',        abbr:'EMP', p:33, w:6,  d:8, l:19, gf:26, ga:64, gd:-38, pts:26, form:['L','D','L','L','D'], zone:'rel' },
      { pos:18, team:'Frosinone',     abbr:'FRO', p:33, w:5,  d:6, l:22, gf:24, ga:70, gd:-46, pts:21, form:['L','L','D','L','L'], zone:'rel' },
      { pos:19, team:'Salernitana',   abbr:'SAL', p:33, w:4,  d:5, l:24, gf:18, ga:76, gd:-58, pts:17, form:['L','L','L','D','L'], zone:'rel' },
      { pos:20, team:'Sassuolo',      abbr:'SAS', p:33, w:3,  d:4, l:26, gf:16, ga:84, gd:-68, pts:13, form:['L','L','L','L','L'], zone:'rel' },
    ]
  },
  ligue1: {
    label: 'Ligue 1', country: 'France', flag: '🇫🇷',
    scorers: [
      { name: 'Alexandre Lacazette', club: 'Lyon', goals: 20, assists: 6 },
      { name: 'Wissam Ben Yedder', club: 'Monaco', goals: 18, assists: 5 },
      { name: 'Elye Wahi', club: 'Montpellier', goals: 16, assists: 4 },
      { name: 'Lionel Messi', club: 'PSG', goals: 15, assists: 18 },
      { name: 'Kylian Mbappé', club: 'PSG', goals: 24, assists: 10 },
    ],
    table: [
      { pos:1,  team:'PSG',           abbr:'PSG', p:33, w:26, d:5, l:2,  gf:82, ga:28, gd:54,  pts:83, form:['W','W','W','W','W'], zone:'ucl' },
      { pos:2,  team:'Monaco',        abbr:'ASM', p:33, w:22, d:6, l:5,  gf:68, ga:32, gd:36,  pts:72, form:['W','D','W','W','L'], zone:'ucl' },
      { pos:3,  team:'Brest',         abbr:'SBR', p:33, w:20, d:6, l:7,  gf:62, ga:36, gd:26,  pts:66, form:['W','W','L','D','W'], zone:'ucl' },
      { pos:4,  team:'Lille',         abbr:'LIL', p:33, w:18, d:7, l:8,  gf:56, ga:38, gd:18,  pts:61, form:['D','W','W','L','W'], zone:'ucl' },
      { pos:5,  team:'Lyon',          abbr:'OLY', p:33, w:16, d:8, l:9,  gf:58, ga:42, gd:16,  pts:56, form:['W','W','D','L','W'], zone:'uel' },
      { pos:6,  team:'Nice',          abbr:'OGC', p:33, w:15, d:7, l:11, gf:50, ga:42, gd:8,   pts:52, form:['L','W','W','D','W'], zone:'uel' },
      { pos:7,  team:'Marseille',     abbr:'OM',  p:33, w:14, d:8, l:11, gf:48, ga:44, gd:4,   pts:50, form:['W','D','L','W','D'], zone:'uecl' },
      { pos:8,  team:'Lens',          abbr:'LNS', p:33, w:13, d:8, l:12, gf:46, ga:46, gd:0,   pts:47, form:['D','W','L','D','W'], zone:'' },
      { pos:9,  team:'Rennes',        abbr:'REN', p:33, w:12, d:8, l:13, gf:44, ga:48, gd:-4,  pts:44, form:['L','D','W','D','L'], zone:'' },
      { pos:10, team:'Reims',         abbr:'REI', p:33, w:11, d:9, l:13, gf:40, ga:50, gd:-10, pts:42, form:['D','L','W','D','D'], zone:'' },
      { pos:11, team:'Strasbourg',    abbr:'RCS', p:33, w:10, d:8, l:15, gf:38, ga:52, gd:-14, pts:38, form:['L','W','D','L','W'], zone:'' },
      { pos:12, team:'Montpellier',   abbr:'MHC', p:33, w:9,  d:9, l:15, gf:36, ga:54, gd:-18, pts:36, form:['W','D','L','D','L'], zone:'' },
      { pos:13, team:'Toulouse',      abbr:'TFC', p:33, w:9,  d:7, l:17, gf:36, ga:56, gd:-20, pts:34, form:['D','L','D','L','W'], zone:'' },
      { pos:14, team:'Nantes',        abbr:'FCN', p:33, w:8,  d:8, l:17, gf:32, ga:58, gd:-26, pts:32, form:['L','D','L','W','D'], zone:'' },
      { pos:15, team:'Le Havre',      abbr:'HAC', p:33, w:7,  d:9, l:17, gf:30, ga:60, gd:-30, pts:30, form:['D','L','D','D','L'], zone:'' },
      { pos:16, team:'Metz',          abbr:'FCM', p:33, w:7,  d:7, l:19, gf:28, ga:64, gd:-36, pts:28, form:['L','D','L','L','D'], zone:'' },
      { pos:17, team:'Clermont',      abbr:'CLT', p:33, w:6,  d:7, l:20, gf:26, ga:66, gd:-40, pts:25, form:['L','L','D','L','L'], zone:'rel' },
      { pos:18, team:'Lorient',       abbr:'FCL', p:33, w:5,  d:7, l:21, gf:24, ga:70, gd:-46, pts:22, form:['L','L','L','D','L'], zone:'rel' },
      { pos:19, team:'Brest B',       abbr:'BRB', p:33, w:4,  d:5, l:24, gf:20, ga:78, gd:-58, pts:17, form:['L','L','D','L','L'], zone:'rel' },
      { pos:20, team:'Ajaccio',       abbr:'ACA', p:33, w:3,  d:4, l:26, gf:16, ga:86, gd:-70, pts:13, form:['L','L','L','L','L'], zone:'rel' },
    ]
  }
}

// Regions dropdown
const REGIONS: Record<string, string[]> = {
  'Europe': ['epl', 'laliga', 'bundesliga', 'seriea', 'ligue1'],
  'South America': [],
  'Africa': [],
  'Asia': [],
}

const ZONE_CONFIG = {
  ucl:  { label: 'Champions League', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  uel:  { label: 'Europa League',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  uecl: { label: 'Conference Lge',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  rel:  { label: 'Relegation',       color: '#e63946', bg: 'rgba(230,57,70,0.15)' },
}

const FORM_COLORS = { W: '#22c55e', D: '#6b7280', L: '#e63946' }

type ViewMode = 'full' | 'home' | 'away' | 'form'

// ─── Component ───────────────────────────────────────────────────────────────
export default function Standings() {
  const [activeRegion, setActiveRegion] = useState('Europe')
  const [regionOpen, setRegionOpen] = useState(false)
  const [leagueOpen, setLeagueOpen] = useState(false)
  const [activeLeagueKey, setActiveLeagueKey] = useState('epl')
  const [view, setView] = useState<ViewMode>('full')
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [liveStandings, setLiveStandings] = useState<LiveStanding[]>([])
  const [liveFixtures, setLiveFixtures] = useState<LiveFixture[]>([])
  const [loadingStandings, setLoadingStandings] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const navigate = useNavigate()

  const league = LEAGUES[activeLeagueKey]
  const availableLeagues = REGIONS[activeRegion] || []

  // Use real API data if available, fall back to static
  const tableData = liveStandings.length > 0
    ? liveStandings.map(s => ({
        pos: s.rank, team: s.team, abbr: s.team.slice(0,3).toUpperCase(),
        p: s.played, w: s.won, d: s.drawn, l: s.lost,
        gf: s.gf, ga: s.ga, gd: s.gd, pts: s.pts, form: s.form,
        zone: s.rank <= 4 ? 'ucl' : s.rank <= 6 ? 'uel' : s.rank <= 7 ? 'uecl' : s.rank >= (liveStandings.length - 2) ? 'rel' : '' as any
      }))
    : league.table

  // Fetch live standings whenever league changes
  useEffect(() => {
    setLoadingStandings(true)
    fetchLiveStandings(league.label).then(standings => {
      setLiveStandings(standings)
      setLastUpdated(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }))
      setLoadingStandings(false)
    })
  }, [activeLeagueKey, league.label])

  // Fetch today's fixtures
  useEffect(() => {
    fetchLiveFixtures().then(setLiveFixtures)
  }, [])

  function selectRegion(r: string) {
    setActiveRegion(r)
    setRegionOpen(false)
    const first = REGIONS[r]?.[0]
    if (first) setActiveLeagueKey(first)
  }

  function selectLeague(key: string) {
    setActiveLeagueKey(key)
    setLeagueOpen(false)
  }

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#1a0a2e 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#00b341' }}>
                {league.flag} {league.country}
              </p>
              <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display', letterSpacing: '-0.5px' }}>
                Standings
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {/* Region dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setRegionOpen(o => !o); setLeagueOpen(false) }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-sm"
                  style={{ background: '#131320', border: '1px solid #2a2a40' }}
                >
                  🌍 {activeRegion}
                  <span style={{ color: '#00b341', fontSize: 10 }}>▼</span>
                </button>
                {regionOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-sm shadow-2xl"
                    style={{ background: '#131320', border: '1px solid #2a2a40' }}>
                    {Object.keys(REGIONS).map(r => (
                      <button key={r}
                        onClick={() => selectRegion(r)}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                        style={{ color: r === activeRegion ? '#00b341' : '#9ca3af', background: r === activeRegion ? '#1e1e32' : 'transparent' }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* League dropdown */}
              {availableLeagues.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => { setLeagueOpen(o => !o); setRegionOpen(false) }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-sm"
                    style={{ background: '#131320', border: '1px solid #2a2a40' }}
                  >
                    {LEAGUES[activeLeagueKey].label}
                    <span style={{ color: '#00b341', fontSize: 10 }}>▼</span>
                  </button>
                  {leagueOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-sm shadow-2xl"
                      style={{ background: '#131320', border: '1px solid #2a2a40' }}>
                      {availableLeagues.map(key => (
                        <button key={key}
                          onClick={() => selectLeague(key)}
                          className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                          style={{ color: key === activeLeagueKey ? '#00b341' : '#9ca3af', background: key === activeLeagueKey ? '#1e1e32' : 'transparent' }}
                        >
                          {LEAGUES[key].flag} {LEAGUES[key].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">
          {/* ── Main Table ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* View toggle */}
            <div className="flex items-center gap-1 mb-4">
              {(['full','home','away','form'] as ViewMode[]).map(v => (
                <button key={v}
                  onClick={() => setView(v)}
                  className="px-4 py-1.5 text-xs font-bold capitalize rounded-sm transition-all"
                  style={view === v
                    ? { background: '#00b341', color: '#fff' }
                    : { background: '#131320', color: '#6b7280', border: '1px solid #1e1e32' }}
                >
                  {v === 'form' ? 'Last 5' : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            {/* Zone legend */}
            <div className="flex gap-4 mb-4 flex-wrap">
              {(Object.entries(ZONE_CONFIG) as [string, typeof ZONE_CONFIG['ucl']][]).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cfg.color }} />
                  <span className="text-[11px] text-gray-500">{cfg.label}</span>
                </div>
              ))}
            </div>

            {/* Table card */}
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 620 }}>
                  <thead>
                    <tr style={{ background: '#12122a' }}>
                      <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest w-8" style={{ color: '#4b4b6a' }}>#</th>
                      <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: '#4b4b6a' }}>Club</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest w-10" style={{ color: '#4b4b6a' }}>P</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest w-10" style={{ color: '#4b4b6a' }}>W</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest w-10" style={{ color: '#4b4b6a' }}>D</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest w-10" style={{ color: '#4b4b6a' }}>L</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest w-10" style={{ color: '#4b4b6a' }}>GF</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest w-10" style={{ color: '#4b4b6a' }}>GA</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest w-12" style={{ color: '#4b4b6a' }}>GD</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest w-12" style={{ color: '#00b341' }}>Pts</th>
                      {view === 'form' && (
                        <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: '#4b4b6a' }}>Form</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, i) => {
                      const zoneColor = row.zone ? ZONE_CONFIG[row.zone as keyof typeof ZONE_CONFIG].color : 'transparent'
                      const isHovered = hoveredRow === i
                      return (
                        <tr
                          key={row.team}
                          onMouseEnter={() => setHoveredRow(i)}
                          onMouseLeave={() => setHoveredRow(null)}
                          onClick={() => navigate(`/club/${row.team.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`)}
                          style={{
                            borderTop: '1px solid #1a1a28',
                            borderLeft: `3px solid ${zoneColor}`,
                            background: isHovered ? 'rgba(255,255,255,0.04)' : i % 2 === 0 ? '#0d0d1e' : '#0a0a14',
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                        >
                          {/* Position */}
                          <td className="px-3 py-3">
                            <span className="text-xs font-bold" style={{ color: row.zone ? ZONE_CONFIG[row.zone as keyof typeof ZONE_CONFIG].color : '#4b4b6a' }}>
                              {row.pos}
                            </span>
                          </td>

                          {/* Club */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={liveStandings.find(s => s.team === row.team)?.teamLogo || getClubLogo(row.team)}
                                alt={row.team}
                                className="w-6 h-6 object-contain shrink-0"
                                onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(row.team)}` }}
                              />
                              <span className="text-sm font-semibold text-white">{row.team}</span>
                              {loadingStandings && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                            </div>
                          </td>

                          {/* Stats */}
                          <td className="px-3 py-3 text-xs text-center" style={{ color: '#6b7280' }}>{row.p}</td>
                          <td className="px-3 py-3 text-xs text-center" style={{ color: '#6b7280' }}>{row.w}</td>
                          <td className="px-3 py-3 text-xs text-center" style={{ color: '#6b7280' }}>{row.d}</td>
                          <td className="px-3 py-3 text-xs text-center" style={{ color: '#6b7280' }}>{row.l}</td>
                          <td className="px-3 py-3 text-xs text-center" style={{ color: '#6b7280' }}>{row.gf}</td>
                          <td className="px-3 py-3 text-xs text-center" style={{ color: '#6b7280' }}>{row.ga}</td>
                          <td className="px-3 py-3 text-xs text-center font-semibold"
                            style={{ color: row.gd > 0 ? '#22c55e' : row.gd < 0 ? '#e63946' : '#6b7280' }}>
                            {row.gd > 0 ? `+${row.gd}` : row.gd}
                          </td>

                          {/* Points */}
                          <td className="px-3 py-3 text-center">
                            <span className="text-sm font-black text-white">{row.pts}</span>
                          </td>

                          {/* Form */}
                          {view === 'form' && (
                            <td className="px-3 py-3">
                              <div className="flex gap-1 justify-center">
                                {row.form.map((r, j) => (
                                  <span key={j}
                                    className="w-5 h-5 rounded-sm text-[9px] font-black flex items-center justify-center text-white"
                                    style={{ background: FORM_COLORS[r] }}>
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Season info footer */}
            <div className="flex items-center justify-between mt-3">
              <p className="text-[11px]" style={{ color: '#3a3a55' }}>
                {liveStandings.length > 0 ? `✅ Verified Real-Time Standings · ${liveStandings.length} clubs` : '⚠ Using cached standings data'} · 2025/26 Season
              </p>
              {lastUpdated && (
                <p className="text-[10px] font-mono" style={{ color: '#3a3a55' }}>Updated {lastUpdated}</p>
              )}
            </div>

            {/* Today's Fixtures from API */}
            {liveFixtures.length > 0 && (
              <div className="mt-6 rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">📅 Today's Fixtures — Live</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(0,179,65,.15)', color: '#00b341' }}>LIVE API</span>
                </div>
                <div style={{ background: '#0d0d1e' }}>
                  {liveFixtures.slice(0, 8).map((fx, i) => (
                    <div key={fx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
                      style={{ borderTop: i > 0 ? '1px solid #1a1a28' : undefined }}
                      onClick={() => navigate(`/match/${fx.id}`)}>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <img src={fx.homeLogo} alt={fx.home} className="w-5 h-5 object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                        <span className="text-xs font-semibold text-white truncate">{fx.home}</span>
                      </div>
                      <div className="text-center shrink-0">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{
                          background: fx.status?.includes('LIVE') ? 'rgba(0,179,65,.2)' : '#131320',
                          color: fx.status?.includes('LIVE') ? '#00b341' : '#9ca3af'
                        }}>{fx.status || fx.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <span className="text-xs font-semibold text-white truncate">{fx.away}</span>
                        <img src={fx.awayLogo} alt={fx.away} className="w-5 h-5 object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <div className="w-full lg:w-72 flex-none space-y-4">
            {/* Top Scorers */}
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">⚽ Top Scorers</h3>
                <span className="text-[10px] font-bold" style={{ color: '#00b341' }}>{league.label}</span>
              </div>
              <div style={{ background: '#0d0d1e' }}>
                {league.scorers.map((s, i) => (
                  <div key={s.name}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 cursor-pointer"
                    style={{ borderTop: i > 0 ? '1px solid #1a1a28' : undefined }}>
                    <span className="text-xs font-black w-5 text-center flex-none"
                      style={{ color: i === 0 ? '#f59e0b' : '#3a3a55' }}>
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-[9px] font-black text-white"
                      style={{ background: '#131320', border: '1px solid #2a2a40' }}>
                      {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                      <p className="text-[11px]" style={{ color: '#4b4b6a' }}>{s.club}</p>
                    </div>
                    <div className="text-right flex-none">
                      <p className="text-base font-black text-white">{s.goals}</p>
                      <p className="text-[10px]" style={{ color: '#4b4b6a' }}>{s.assists} ast</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone legend card */}
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
              <div className="px-4 py-3" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Zone Guide</h3>
              </div>
              <div style={{ background: '#0d0d1e' }}>
                {(Object.entries(ZONE_CONFIG) as [string, typeof ZONE_CONFIG['ucl']][]).map(([key, cfg], i) => (
                  <div key={key} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderTop: i > 0 ? '1px solid #1a1a28' : undefined }}>
                    <div className="w-1 h-8 rounded-full flex-none" style={{ background: cfg.color }} />
                    <div>
                      <p className="text-xs font-semibold text-white">{cfg.label}</p>
                      <p className="text-[11px]" style={{ color: '#4b4b6a' }}>
                        {key === 'ucl' ? 'Top 4 qualify' : key === 'uel' ? '5th & 6th qualify' : key === 'uecl' ? '7th qualifies' : 'Bottom 3 relegated'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick nav to fixtures */}
            <Link to="/fixtures"
              className="flex items-center justify-between px-4 py-3 rounded-lg transition-all group"
              style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <span className="text-sm font-semibold text-white">View Fixtures</span>
              <span className="text-lg group-hover:translate-x-1 transition-transform" style={{ color: '#00b341' }}>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* click-outside to close dropdowns */}
      {(regionOpen || leagueOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setRegionOpen(false); setLeagueOpen(false) }} />
      )}

      {/* Bottom leaderboard ad */}
      <div className="flex justify-center mt-8">
        <AdBanner size="leaderboard" label="Advertise with FlowerZFC — ads@flowerz.fc" />
      </div>
    </div>
  )
}

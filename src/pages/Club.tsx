import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import AdBanner from '../components/AdBanner'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Player { name: string; pos: string; age: number; nationality: string; goals?: number; assists?: number }
interface Result  { date: string; home: string; away: string; homeScore: number; awayScore: number; competition: string; matchId: string }
interface Upcoming { date: string; time: string; home: string; away: string; competition: string; venue: string; matchId: string }
interface StandingRow { pos: number; team: string; p: number; w: number; d: number; l: number; gd: number; pts: number; zone: string; isCurrent?: boolean }

interface ClubData {
  name: string
  shortName: string
  abbr: string
  country: string
  flag: string
  league: string
  founded: number
  stadium: string
  capacity: number
  manager: string
  primaryColor: string
  secondaryColor: string
  description: string
  position: number
  totalTeams: number
  pts: number
  p: number; w: number; d: number; l: number
  gf: number; ga: number; gd: number
  form: ('W' | 'D' | 'L')[]
  squad: Player[]
  results: Result[]
  upcoming: Upcoming[]
  standingsSnippet: StandingRow[]
  stats: { label: string; value: string; sub?: string }[]
  trophies: { name: string; count: number }[]
}

// ─── Club Database ─────────────────────────────────────────────────────────
const CLUBS: Record<string, ClubData> = {
  arsenal: {
    name: 'Arsenal FC', shortName: 'Arsenal', abbr: 'ARS',
    country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', league: 'Premier League',
    founded: 1886, stadium: 'Emirates Stadium', capacity: 60_704,
    manager: 'Mikel Arteta',
    primaryColor: '#EF0107', secondaryColor: '#FFFFFF',
    description: 'Arsenal Football Club is a professional football club based in Islington, North London, England. One of the most successful clubs in English football, the Gunners have won 13 League championships and 14 FA Cups.',
    position: 1, totalTeams: 20, pts: 78, p: 33, w: 24, d: 6, l: 3, gf: 72, ga: 28, gd: 44,
    form: ['W','W','W','D','W'],
    stats: [
      { label: 'Avg Goals / Game', value: '2.18', sub: 'Scored' },
      { label: 'Avg Goals Conceded', value: '0.85', sub: 'Per game' },
      { label: 'Clean Sheets', value: '14', sub: 'This season' },
      { label: 'Possession Avg', value: '62%', sub: 'Season average' },
      { label: 'xG (Expected Goals)', value: '68.4', sub: 'Season total' },
      { label: 'Big Chances Created', value: '87', sub: 'Season total' },
    ],
    trophies: [
      { name: 'Premier League', count: 13 },
      { name: 'FA Cup', count: 14 },
      { name: 'League Cup', count: 2 },
    ],
    squad: [
      { name: 'David Raya', pos: 'GK', age: 28, nationality: '🇪🇸' },
      { name: 'Ben White', pos: 'RB', age: 26, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { name: 'William Saliba', pos: 'CB', age: 23, nationality: '🇫🇷' },
      { name: 'Gabriel Magalhães', pos: 'CB', age: 26, nationality: '🇧🇷' },
      { name: 'Oleksandr Zinchenko', pos: 'LB', age: 27, nationality: '🇺🇦' },
      { name: 'Declan Rice', pos: 'CM', age: 25, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', goals: 7, assists: 8 },
      { name: 'Martin Ødegaard', pos: 'CAM', age: 25, nationality: '🇳🇴', goals: 14, assists: 12 },
      { name: 'Thomas Partey', pos: 'CDM', age: 30, nationality: '🇬🇭' },
      { name: 'Bukayo Saka', pos: 'RW', age: 22, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', goals: 18, assists: 14 },
      { name: 'Leandro Trossard', pos: 'LW', age: 29, nationality: '🇧🇪', goals: 10, assists: 8 },
      { name: 'Kai Havertz', pos: 'ST', age: 25, nationality: '🇩🇪', goals: 13, assists: 6 },
      { name: 'Aaron Ramsdale', pos: 'GK', age: 25, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { name: 'Takehiro Tomiyasu', pos: 'RB', age: 25, nationality: '🇯🇵' },
      { name: 'Jakub Kiwior', pos: 'CB', age: 23, nationality: '🇵🇱' },
      { name: 'Fabio Vieira', pos: 'CM', age: 23, nationality: '🇵🇹', goals: 4, assists: 5 },
      { name: 'Gabriel Martinelli', pos: 'LW', age: 23, nationality: '🇧🇷', goals: 12, assists: 7 },
    ],
    results: [
      { date: 'SAT 10 AUG', home: 'Arsenal', away: 'Wolves', homeScore: 3, awayScore: 0, competition: 'Premier League', matchId: 'm1' },
      { date: 'SAT 3 AUG', home: 'Fulham', away: 'Arsenal', homeScore: 0, awayScore: 2, competition: 'Premier League', matchId: 'f1' },
      { date: 'TUE 30 JUL', home: 'Arsenal', away: 'Brentford', homeScore: 4, awayScore: 1, competition: 'Premier League', matchId: 'f2' },
      { date: 'SAT 27 JUL', home: 'Everton', away: 'Arsenal', homeScore: 1, awayScore: 1, competition: 'Premier League', matchId: 'f3' },
      { date: 'TUE 23 JUL', home: 'Arsenal', away: 'Man Utd', homeScore: 3, awayScore: 1, competition: 'Premier League', matchId: 'f4' },
    ],
    upcoming: [
      { date: 'SAT 16 AUG', time: '15:00', home: 'Arsenal', away: 'Liverpool', competition: 'Premier League', venue: 'Emirates Stadium', matchId: 'f5' },
      { date: 'TUE 19 AUG', time: '20:00', home: 'PSV', away: 'Arsenal', competition: 'UCL Group Stage', venue: 'Philips Stadion', matchId: 'f6' },
      { date: 'SAT 23 AUG', time: '12:30', home: 'Arsenal', away: 'Chelsea', competition: 'Premier League', venue: 'Emirates Stadium', matchId: 'f7' },
    ],
    standingsSnippet: [
      { pos:1, team:'Arsenal',   p:33, w:24, d:6, l:3,  gd:44,  pts:78, zone:'ucl', isCurrent: true },
      { pos:2, team:'Liverpool', p:33, w:23, d:6, l:4,  gd:36,  pts:75, zone:'ucl' },
      { pos:3, team:'Man City',  p:33, w:21, d:8, l:4,  gd:35,  pts:71, zone:'ucl' },
      { pos:4, team:'Chelsea',   p:33, w:18, d:8, l:7,  gd:18,  pts:62, zone:'ucl' },
      { pos:5, team:'Tottenham', p:33, w:16, d:10,l:7,  gd:13,  pts:58, zone:'uel' },
    ],
  },
  liverpool: {
    name: 'Liverpool FC', shortName: 'Liverpool', abbr: 'LIV',
    country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', league: 'Premier League',
    founded: 1892, stadium: 'Anfield', capacity: 61_015,
    manager: 'Jürgen Klopp',
    primaryColor: '#C8102E', secondaryColor: '#F6EB61',
    description: 'Liverpool Football Club is a professional football club based in Liverpool, England. They are one of the most decorated clubs in English football history, with 19 First Division/Premier League titles and 6 European Cups.',
    position: 2, totalTeams: 20, pts: 75, p: 33, w: 23, d: 6, l: 4, gf: 68, ga: 32, gd: 36,
    form: ['W','D','W','W','L'],
    stats: [
      { label: 'Avg Goals / Game', value: '2.06', sub: 'Scored' },
      { label: 'Avg Goals Conceded', value: '0.97', sub: 'Per game' },
      { label: 'Clean Sheets', value: '12', sub: 'This season' },
      { label: 'Possession Avg', value: '58%', sub: 'Season average' },
      { label: 'xG (Expected Goals)', value: '64.2', sub: 'Season total' },
      { label: 'Big Chances Created', value: '78', sub: 'Season total' },
    ],
    trophies: [
      { name: 'Premier League', count: 19 },
      { name: 'UEFA Champions League', count: 6 },
      { name: 'FA Cup', count: 8 },
    ],
    squad: [
      { name: 'Alisson Becker', pos: 'GK', age: 31, nationality: '🇧🇷' },
      { name: 'Trent Alexander-Arnold', pos: 'RB', age: 25, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', goals: 3, assists: 14 },
      { name: 'Virgil van Dijk', pos: 'CB', age: 32, nationality: '🇳🇱' },
      { name: 'Ibrahima Konaté', pos: 'CB', age: 24, nationality: '🇫🇷' },
      { name: 'Andy Robertson', pos: 'LB', age: 29, nationality: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
      { name: 'Alexis Mac Allister', pos: 'CM', age: 25, nationality: '🇦🇷', goals: 9, assists: 7 },
      { name: 'Dominik Szoboszlai', pos: 'CAM', age: 23, nationality: '🇭🇺', goals: 11, assists: 9 },
      { name: 'Wataru Endo', pos: 'CDM', age: 31, nationality: '🇯🇵' },
      { name: 'Mohamed Salah', pos: 'RW', age: 31, nationality: '🇪🇬', goals: 16, assists: 13 },
      { name: 'Luis Díaz', pos: 'LW', age: 27, nationality: '🇨🇴', goals: 12, assists: 8 },
      { name: 'Darwin Núñez', pos: 'ST', age: 24, nationality: '🇺🇾', goals: 14, assists: 5 },
    ],
    results: [
      { date: 'SAT 10 AUG', home: 'Liverpool', away: 'Crystal Palace', homeScore: 3, awayScore: 1, competition: 'Premier League', matchId: 'f1' },
      { date: 'SAT 3 AUG', home: 'Man Utd', away: 'Liverpool', homeScore: 0, awayScore: 3, competition: 'Premier League', matchId: 'f2' },
      { date: 'TUE 30 JUL', home: 'Liverpool', away: 'Brighton', homeScore: 2, awayScore: 2, competition: 'Premier League', matchId: 'f3' },
    ],
    upcoming: [
      { date: 'SAT 16 AUG', time: '15:00', home: 'Arsenal', away: 'Liverpool', competition: 'Premier League', venue: 'Emirates Stadium', matchId: 'f5' },
      { date: 'WED 20 AUG', time: '20:00', home: 'Liverpool', away: 'AC Milan', competition: 'UCL Group Stage', venue: 'Anfield', matchId: 'f6' },
    ],
    standingsSnippet: [
      { pos:1, team:'Arsenal',   p:33, w:24, d:6, l:3,  gd:44,  pts:78, zone:'ucl' },
      { pos:2, team:'Liverpool', p:33, w:23, d:6, l:4,  gd:36,  pts:75, zone:'ucl', isCurrent: true },
      { pos:3, team:'Man City',  p:33, w:21, d:8, l:4,  gd:35,  pts:71, zone:'ucl' },
      { pos:4, team:'Chelsea',   p:33, w:18, d:8, l:7,  gd:18,  pts:62, zone:'ucl' },
      { pos:5, team:'Tottenham', p:33, w:16, d:10,l:7,  gd:13,  pts:58, zone:'uel' },
    ],
  },
  'man-city': {
    name: 'Manchester City FC', shortName: 'Man City', abbr: 'MCI',
    country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', league: 'Premier League',
    founded: 1880, stadium: 'Etihad Stadium', capacity: 55_097,
    manager: 'Pep Guardiola',
    primaryColor: '#6CABDD', secondaryColor: '#1C2C5B',
    description: 'Manchester City FC are an English professional football club based in Manchester. Under Pep Guardiola, they have become one of the dominant forces in European football.',
    position: 3, totalTeams: 20, pts: 71, p: 33, w: 21, d: 8, l: 4, gf: 65, ga: 30, gd: 35,
    form: ['W','W','D','W','W'],
    stats: [
      { label: 'Avg Goals / Game', value: '1.97', sub: 'Scored' },
      { label: 'Avg Goals Conceded', value: '0.91', sub: 'Per game' },
      { label: 'Clean Sheets', value: '13', sub: 'This season' },
      { label: 'Possession Avg', value: '67%', sub: 'Season average' },
      { label: 'xG (Expected Goals)', value: '62.8', sub: 'Season total' },
      { label: 'Big Chances Created', value: '92', sub: 'Season total' },
    ],
    trophies: [
      { name: 'Premier League', count: 10 },
      { name: 'UEFA Champions League', count: 1 },
      { name: 'FA Cup', count: 8 },
    ],
    squad: [
      { name: 'Ederson', pos: 'GK', age: 30, nationality: '🇧🇷' },
      { name: 'Kyle Walker', pos: 'RB', age: 34, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { name: 'Rúben Dias', pos: 'CB', age: 27, nationality: '🇵🇹' },
      { name: 'Manuel Akanji', pos: 'CB', age: 29, nationality: '🇨🇭' },
      { name: 'Joško Gvardiol', pos: 'LB', age: 22, nationality: '🇭🇷', goals: 8, assists: 4 },
      { name: 'Rodri', pos: 'CDM', age: 27, nationality: '🇪🇸' },
      { name: 'Kevin De Bruyne', pos: 'CAM', age: 32, nationality: '🇧🇪', goals: 10, assists: 18 },
      { name: 'Bernardo Silva', pos: 'CM', age: 29, nationality: '🇵🇹', goals: 9, assists: 9 },
      { name: 'Phil Foden', pos: 'RW', age: 24, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', goals: 14, assists: 11 },
      { name: 'Jeremy Doku', pos: 'LW', age: 22, nationality: '🇧🇪', goals: 6, assists: 12 },
      { name: 'Erling Haaland', pos: 'ST', age: 23, nationality: '🇳🇴', goals: 27, assists: 5 },
    ],
    results: [
      { date: 'SAT 10 AUG', home: 'Man City', away: 'Liverpool', homeScore: 0, awayScore: 0, competition: 'Premier League', matchId: 'm2' },
    ],
    upcoming: [
      { date: 'SAT 16 AUG', time: '17:30', home: 'Man City', away: 'Tottenham', competition: 'Premier League', venue: 'Etihad Stadium', matchId: 'f5' },
    ],
    standingsSnippet: [
      { pos:1, team:'Arsenal',   p:33, w:24, d:6, l:3,  gd:44,  pts:78, zone:'ucl' },
      { pos:2, team:'Liverpool', p:33, w:23, d:6, l:4,  gd:36,  pts:75, zone:'ucl' },
      { pos:3, team:'Man City',  p:33, w:21, d:8, l:4,  gd:35,  pts:71, zone:'ucl', isCurrent: true },
      { pos:4, team:'Chelsea',   p:33, w:18, d:8, l:7,  gd:18,  pts:62, zone:'ucl' },
      { pos:5, team:'Tottenham', p:33, w:16, d:10,l:7,  gd:13,  pts:58, zone:'uel' },
    ],
  },
  chelsea: {
    name: 'Chelsea FC', shortName: 'Chelsea', abbr: 'CHE',
    country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', league: 'Premier League',
    founded: 1905, stadium: 'Stamford Bridge', capacity: 40_341,
    manager: 'Mauricio Pochettino',
    primaryColor: '#034694', secondaryColor: '#FFFFFF',
    description: 'Chelsea FC is a professional football club based in Fulham, West London. One of the most successful English clubs of the modern era, Chelsea have won 6 Premier League titles and 2 UEFA Champions League trophies.',
    position: 4, totalTeams: 20, pts: 62, p: 33, w: 18, d: 8, l: 7, gf: 58, ga: 40, gd: 18,
    form: ['L','W','W','D','W'],
    stats: [
      { label: 'Avg Goals / Game', value: '1.76', sub: 'Scored' },
      { label: 'Avg Goals Conceded', value: '1.21', sub: 'Per game' },
      { label: 'Clean Sheets', value: '9', sub: 'This season' },
      { label: 'Possession Avg', value: '56%', sub: 'Season average' },
      { label: 'xG (Expected Goals)', value: '54.1', sub: 'Season total' },
      { label: 'Big Chances Created', value: '71', sub: 'Season total' },
    ],
    trophies: [
      { name: 'Premier League', count: 6 },
      { name: 'UEFA Champions League', count: 2 },
      { name: 'FA Cup', count: 8 },
    ],
    squad: [
      { name: 'Robert Sánchez', pos: 'GK', age: 26, nationality: '🇪🇸' },
      { name: 'Reece James', pos: 'RB', age: 24, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', goals: 4, assists: 6 },
      { name: 'Thiago Silva', pos: 'CB', age: 39, nationality: '🇧🇷' },
      { name: 'Levi Colwill', pos: 'CB', age: 21, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { name: 'Ben Chilwell', pos: 'LB', age: 27, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { name: 'Moises Caicedo', pos: 'CDM', age: 22, nationality: '🇪🇨' },
      { name: 'Cole Palmer', pos: 'CAM', age: 22, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', goals: 17, assists: 11 },
      { name: 'Conor Gallagher', pos: 'CM', age: 24, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', goals: 6, assists: 5 },
      { name: 'Raheem Sterling', pos: 'RW', age: 29, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', goals: 7, assists: 6 },
      { name: 'Mykhailo Mudryk', pos: 'LW', age: 23, nationality: '🇺🇦', goals: 8, assists: 7 },
      { name: 'Nicolas Jackson', pos: 'ST', age: 23, nationality: '🇸🇳', goals: 14, assists: 4 },
    ],
    results: [
      { date: 'FRI 15 AUG', home: 'Chelsea', away: 'Tottenham', homeScore: 3, awayScore: 1, competition: 'Premier League', matchId: 'fy1' },
      { date: 'SAT 10 AUG', home: 'Arsenal', away: 'Chelsea', homeScore: 2, awayScore: 1, competition: 'Premier League', matchId: 'm1' },
    ],
    upcoming: [
      { date: 'SAT 23 AUG', time: '12:30', home: 'Arsenal', away: 'Chelsea', competition: 'Premier League', venue: 'Emirates Stadium', matchId: 'f7' },
    ],
    standingsSnippet: [
      { pos:2, team:'Liverpool', p:33, w:23, d:6, l:4,  gd:36,  pts:75, zone:'ucl' },
      { pos:3, team:'Man City',  p:33, w:21, d:8, l:4,  gd:35,  pts:71, zone:'ucl' },
      { pos:4, team:'Chelsea',   p:33, w:18, d:8, l:7,  gd:18,  pts:62, zone:'ucl', isCurrent: true },
      { pos:5, team:'Tottenham', p:33, w:16, d:10,l:7,  gd:13,  pts:58, zone:'uel' },
      { pos:6, team:'Aston Villa',p:33,w:15, d:9, l:9,  gd:8,   pts:54, zone:'uel' },
    ],
  },
  wolves: {
    name: 'Wolverhampton Wanderers', shortName: 'Wolves', abbr: 'WOL',
    country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', league: 'Premier League',
    founded: 1877, stadium: 'Molineux Stadium', capacity: 32_050,
    manager: 'Gary O\'Neil',
    primaryColor: '#FDB913', secondaryColor: '#231F20',
    description: 'Wolverhampton Wanderers FC, commonly known as Wolves, is a professional football club in the West Midlands. They have had three First Division titles and are known for their unique playing style under various Portuguese managers.',
    position: 15, totalTeams: 20, pts: 29, p: 33, w: 7, d: 8, l: 18, gf: 32, ga: 62, gd: -30,
    form: ['L','L','D','L','W'],
    stats: [
      { label: 'Avg Goals / Game', value: '0.97', sub: 'Scored' },
      { label: 'Avg Goals Conceded', value: '1.88', sub: 'Per game' },
      { label: 'Clean Sheets', value: '5', sub: 'This season' },
      { label: 'Possession Avg', value: '44%', sub: 'Season average' },
      { label: 'xG (Expected Goals)', value: '32.1', sub: 'Season total' },
      { label: 'Big Chances Created', value: '38', sub: 'Season total' },
    ],
    trophies: [
      { name: 'First Division', count: 3 },
      { name: 'FA Cup', count: 4 },
      { name: 'League Cup', count: 2 },
    ],
    squad: [
      { name: 'José Sá', pos: 'GK', age: 31, nationality: '🇵🇹' },
      { name: 'Matt Doherty', pos: 'RB', age: 32, nationality: '🇮🇪' },
      { name: 'Max Kilman', pos: 'CB', age: 26, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { name: 'Craig Dawson', pos: 'CB', age: 34, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { name: 'Rayan Aït-Nouri', pos: 'LB', age: 23, nationality: '🇩🇿', goals: 2, assists: 5 },
      { name: 'João Gomes', pos: 'CDM', age: 23, nationality: '🇧🇷' },
      { name: 'Matheus Nunes', pos: 'CM', age: 25, nationality: '🇵🇹', goals: 4, assists: 3 },
      { name: 'Pablo Sarabia', pos: 'RW', age: 32, nationality: '🇪🇸', goals: 5, assists: 4 },
      { name: 'Pedro Neto', pos: 'LW', age: 24, nationality: '🇵🇹', goals: 6, assists: 7 },
      { name: 'Hwang Hee-chan', pos: 'ST', age: 28, nationality: '🇰🇷', goals: 9, assists: 3 },
    ],
    results: [
      { date: 'SAT 10 AUG', home: 'Arsenal', away: 'Wolves', homeScore: 3, awayScore: 0, competition: 'Premier League', matchId: 'm1' },
    ],
    upcoming: [
      { date: 'SAT 16 AUG', time: '15:00', home: 'Wolves', away: 'Everton', competition: 'Premier League', venue: 'Molineux Stadium', matchId: 'f5' },
    ],
    standingsSnippet: [
      { pos:13, team:'Brentford',    p:33, w:8,  d:8, l:17, gd:-24, pts:32, zone:'' },
      { pos:14, team:'Crystal Palace',p:33,w:8,  d:7, l:18, gd:-28, pts:31, zone:'' },
      { pos:15, team:'Wolves',       p:33, w:7,  d:8, l:18, gd:-30, pts:29, zone:'', isCurrent: true },
      { pos:16, team:'Nottm Forest', p:33, w:7,  d:7, l:19, gd:-32, pts:28, zone:'' },
      { pos:17, team:'Bournemouth',  p:33, w:6,  d:9, l:18, gd:-32, pts:27, zone:'rel' },
    ],
  },
}

// Generate a fallback for any unknown club
function getFallbackClub(slug: string): ClubData {
  const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return {
    name: `${name} FC`, shortName: name, abbr: name.slice(0,3).toUpperCase(),
    country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', league: 'Premier League',
    founded: 1900, stadium: 'Home Ground', capacity: 30_000, manager: 'Head Coach',
    primaryColor: '#00b341', secondaryColor: '#FFFFFF',
    description: `${name} FC is a professional football club.`,
    position: 10, totalTeams: 20, pts: 40, p: 33, w: 11, d: 7, l: 15, gf: 38, ga: 50, gd: -12,
    form: ['W','D','L','D','W'],
    stats: [], trophies: [], squad: [], results: [], upcoming: [],
    standingsSnippet: [],
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FORM_COLORS = { W: '#22c55e', D: '#6b7280', L: '#e63946' }
const FORM_LABELS = { W: 'Win', D: 'Draw', L: 'Loss' }
const ZONE_COLOR: Record<string,string> = { ucl:'#3b82f6', uel:'#f59e0b', uecl:'#22c55e', rel:'#e63946' }
const POS_GROUP: Record<string,string> = { GK:'Goalkeepers', CB:'Defenders', RB:'Defenders', LB:'Defenders', CDM:'Midfielders', CM:'Midfielders', CAM:'Midfielders', RW:'Forwards', LW:'Forwards', ST:'Forwards' }

type Tab = 'overview' | 'squad' | 'results' | 'fixtures' | 'stats'

// ─── Component ───────────────────────────────────────────────────────────────
export default function Club() {
  const { slug, id } = useParams<{ slug?: string; id?: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const clubKey = (slug || id || '').toLowerCase()
  const club = CLUBS[clubKey] ?? getFallbackClub(clubKey)

  // group squad by position group
  const squadGroups: Record<string, Player[]> = {}
  club.squad.forEach(p => {
    const grp = POS_GROUP[p.pos] ?? 'Others'
    if (!squadGroups[grp]) squadGroups[grp] = []
    squadGroups[grp].push(p)
  })
  const GROUP_ORDER = ['Goalkeepers','Defenders','Midfielders','Forwards','Others']

  const formPct = club.form.reduce((a,r) => a + (r==='W'?3:r==='D'?1:0), 0) / (club.form.length * 3) * 100

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>

      {/* ── Club Hero Header ────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${club.primaryColor}22 0%, #0a0a14 60%)`,
        borderBottom: '1px solid #1e1e32'
      }}>
        <div className="max-w-screen-xl mx-auto px-4 pt-6 pb-8">
          {/* Breadcrumb / back */}
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-white"
              style={{ color: '#6b7280' }}>
              ← Back
            </button>
            <span style={{ color: '#2a2a40' }}>/</span>
            <Link to="/standings" className="text-xs font-semibold transition-colors hover:text-white" style={{ color: '#6b7280' }}>
              Standings
            </Link>
            <span style={{ color: '#2a2a40' }}>/</span>
            <span className="text-xs font-semibold text-white">{club.shortName}</span>
          </div>

          {/* Club identity */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Badge circle */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white flex-none"
              style={{
                background: `linear-gradient(135deg, ${club.primaryColor}, ${club.secondaryColor === '#FFFFFF' ? '#555' : club.secondaryColor})`,
                boxShadow: `0 0 30px ${club.primaryColor}55`
              }}>
              {club.abbr}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: club.primaryColor }}>
                  {club.flag} {club.country} · {club.league}
                </span>
              </div>
              <h1 className="text-4xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                {club.name}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm" style={{ color: '#6b7280' }}>📍 {club.stadium} ({club.capacity.toLocaleString()})</span>
                <span className="text-sm" style={{ color: '#6b7280' }}>🏟️ Est. {club.founded}</span>
                <span className="text-sm" style={{ color: '#6b7280' }}>👔 {club.manager}</span>
              </div>
            </div>

            {/* League position badge */}
            <div className="flex-none text-center px-6 py-4 rounded-lg" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#4b4b6a' }}>League Pos</p>
              <p className="text-5xl font-black" style={{ color: club.primaryColor, fontFamily: 'Big Shoulders Display' }}>
                {club.position}
              </p>
              <p className="text-[11px] font-semibold mt-1" style={{ color: '#6b7280' }}>of {club.totalTeams}</p>
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Points', value: club.pts, color: '#00b341' },
              { label: 'Wins', value: club.w, color: '#22c55e' },
              { label: 'Goal Diff', value: club.gd > 0 ? `+${club.gd}` : club.gd, color: club.gd >= 0 ? '#22c55e' : '#e63946' },
              { label: 'Played', value: club.p, color: '#6b7280' },
            ].map(s => (
              <div key={s.label} className="rounded-lg px-4 py-3 text-center" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <p className="text-2xl font-black" style={{ color: s.color, fontFamily: 'Big Shoulders Display' }}>{s.value}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#4b4b6a' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#0d0d1e', borderBottom: '1px solid #1e1e32', position: 'sticky', top: 56, zIndex: 30 }}>
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex overflow-x-auto" style={{ gap: 0 }}>
            {(['overview','squad','results','fixtures','stats'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-none px-5 py-4 text-sm font-bold capitalize transition-colors relative"
                style={{ color: tab === t ? '#fff' : '#6b7280' }}>
                {t === 'fixtures' ? 'Upcoming' : t.charAt(0).toUpperCase() + t.slice(1)}
                {tab === t && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: club.primaryColor }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-4 py-6">

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="flex gap-6 flex-wrap lg:flex-nowrap">
            <div className="flex-1 min-w-0 space-y-6">
              {/* About */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
                <div className="px-5 py-3" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
                  <h2 className="text-xs font-black uppercase tracking-widest text-white">About the Club</h2>
                </div>
                <div className="px-5 py-4" style={{ background: '#0d0d1e' }}>
                  <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>{club.description}</p>
                </div>
              </div>

              {/* Form */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
                  <h2 className="text-xs font-black uppercase tracking-widest text-white">Recent Form</h2>
                  <span className="text-xs font-bold" style={{ color: '#4b4b6a' }}>Last 5 matches</span>
                </div>
                <div className="px-5 py-5" style={{ background: '#0d0d1e' }}>
                  <div className="flex items-center gap-3 mb-4">
                    {club.form.map((r, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-black text-white"
                          style={{ background: FORM_COLORS[r], boxShadow: `0 4px 12px ${FORM_COLORS[r]}44` }}>
                          {r}
                        </div>
                        <span className="text-[10px]" style={{ color: '#4b4b6a' }}>{FORM_LABELS[r]}</span>
                      </div>
                    ))}
                    <div className="ml-auto text-right">
                      <p className="text-2xl font-black text-white">{Math.round(formPct)}%</p>
                      <p className="text-[11px]" style={{ color: '#4b4b6a' }}>Form rating</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a28' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${formPct}%`, background: `linear-gradient(90deg, ${club.primaryColor}, #22c55e)` }} />
                  </div>
                </div>
              </div>

              {/* Recent Results */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
                  <h2 className="text-xs font-black uppercase tracking-widest text-white">Recent Results</h2>
                  <button onClick={() => setTab('results')} className="text-[11px] font-bold transition-colors hover:text-white" style={{ color: '#00b341' }}>See all →</button>
                </div>
                <div style={{ background: '#0d0d1e' }}>
                  {club.results.slice(0, 3).map((r, i) => {
                    const isHome = r.home === club.shortName
                    const won = isHome ? r.homeScore > r.awayScore : r.awayScore > r.homeScore
                    const drew = r.homeScore === r.awayScore
                    const result = drew ? 'D' : won ? 'W' : 'L'
                    return (
                      <Link key={i} to={`/scores/${r.matchId}`}
                        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
                        style={{ borderTop: i > 0 ? '1px solid #1a1a28' : undefined }}>
                        <span className="w-5 h-5 rounded-sm text-[10px] font-black flex items-center justify-center text-white flex-none"
                          style={{ background: FORM_COLORS[result] }}>{result}</span>
                        <div className="flex-1">
                          <p className="text-[11px] mb-0.5" style={{ color: '#4b4b6a' }}>{r.date} · {r.competition}</p>
                          <p className="text-sm font-semibold text-white">{r.home} {r.homeScore}–{r.awayScore} {r.away}</p>
                        </div>
                        <span className="text-lg" style={{ color: '#2a2a40' }}>›</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-full lg:w-72 flex-none space-y-4">
              {/* League position snippet */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">{club.league}</h3>
                  <Link to="/standings" className="text-[11px] font-bold" style={{ color: '#00b341' }}>Full table →</Link>
                </div>
                <div style={{ background: '#0d0d1e' }}>
                  {club.standingsSnippet.map((row, i) => (
                    <div key={row.team}
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={{
                        borderTop: i > 0 ? '1px solid #1a1a28' : undefined,
                        background: row.isCurrent ? `${club.primaryColor}15` : undefined,
                        borderLeft: row.isCurrent ? `3px solid ${club.primaryColor}` : '3px solid transparent',
                      }}>
                      <span className="text-xs font-bold w-5 text-center flex-none"
                        style={{ color: row.zone ? ZONE_COLOR[row.zone] : '#4b4b6a' }}>{row.pos}</span>
                      <span className="text-sm flex-1 font-semibold" style={{ color: row.isCurrent ? '#fff' : '#9ca3af' }}>{row.team}</span>
                      <span className="text-xs font-bold" style={{ color: row.isCurrent ? '#fff' : '#6b7280' }}>{row.pts}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trophies */}
              {club.trophies.length > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
                  <div className="px-4 py-3" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">🏆 Honours</h3>
                  </div>
                  <div style={{ background: '#0d0d1e' }}>
                    {club.trophies.map((t, i) => (
                      <div key={t.name} className="flex items-center justify-between px-4 py-3"
                        style={{ borderTop: i > 0 ? '1px solid #1a1a28' : undefined }}>
                        <span className="text-sm text-white">{t.name}</span>
                        <span className="text-base font-black" style={{ color: '#f59e0b' }}>{t.count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sidebar 300x600 Half Page Ad */}
              <div className="flex justify-center pt-2">
                <AdBanner size="halfpage" label="Club Merchandise & Partner Sponsor" />
              </div>
            </div>
          </div>
        )}

        {/* ── SQUAD ────────────────────────────────────────────────────── */}
        {tab === 'squad' && (
          <div className="space-y-6">
            {club.squad.length === 0 && (
              <p className="text-center py-16 text-gray-500">Squad data coming soon.</p>
            )}
            {GROUP_ORDER.filter(g => squadGroups[g]).map(grp => (
              <div key={grp} className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
                <div className="px-5 py-3" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
                  <h2 className="text-xs font-black uppercase tracking-widest text-white">{grp}</h2>
                </div>
                <div className="overflow-x-auto" style={{ background: '#0d0d1e' }}>
                  <table className="w-full" style={{ minWidth: 460 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1a1a28' }}>
                        <th className="px-5 py-2.5 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: '#4b4b6a' }}>Player</th>
                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest w-16" style={{ color: '#4b4b6a' }}>Pos</th>
                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest w-12" style={{ color: '#4b4b6a' }}>Age</th>
                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest w-12" style={{ color: '#4b4b6a' }}>Nat</th>
                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest w-16" style={{ color: '#22c55e' }}>⚽ Gls</th>
                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest w-16" style={{ color: '#3b82f6' }}>🅰️ Ast</th>
                      </tr>
                    </thead>
                    <tbody>
                      {squadGroups[grp].map((p, i) => {
                        const playerSlug = p.name.toLowerCase().split(' ').pop() || 'player'
                        return (
                          <tr key={p.name} style={{ borderTop: i > 0 ? '1px solid #1a1a28' : undefined }}
                            className="transition-colors hover:bg-white/5 cursor-pointer"
                            onClick={() => navigate(`/player/${playerSlug}`)}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-[9px] font-black text-white"
                                  style={{ background: `${club.primaryColor}33`, border: `1px solid ${club.primaryColor}55` }}>
                                  {p.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                                </div>
                                <span className="text-sm font-semibold text-white group-hover:text-[#00b341] transition-colors">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-sm text-[10px] font-black" style={{ background: '#1a1a28', color: club.primaryColor }}>{p.pos}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs" style={{ color: '#6b7280' }}>{p.age}</td>
                            <td className="px-4 py-3 text-center text-base">{p.nationality}</td>
                            <td className="px-4 py-3 text-center text-sm font-bold" style={{ color: p.goals ? '#22c55e' : '#3a3a55' }}>{p.goals ?? '—'}</td>
                            <td className="px-4 py-3 text-center text-sm font-bold" style={{ color: p.assists ? '#3b82f6' : '#3a3a55' }}>{p.assists ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RESULTS ─────────────────────────────────────────────────── */}
        {tab === 'results' && (
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
            <div className="px-5 py-3" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-white">Results</h2>
            </div>
            <div style={{ background: '#0d0d1e' }}>
              {club.results.length === 0 && <p className="text-center py-12 text-gray-500 text-sm">No results yet.</p>}
              {club.results.map((r, i) => {
                const isHome = r.home === club.shortName
                const won = isHome ? r.homeScore > r.awayScore : r.awayScore > r.homeScore
                const drew = r.homeScore === r.awayScore
                const result = drew ? 'D' : won ? 'W' : 'L'
                return (
                  <Link key={i} to={`/scores/${r.matchId}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
                    style={{ borderTop: i > 0 ? '1px solid #1a1a28' : undefined }}>
                    <span className="w-6 h-6 rounded-sm text-[11px] font-black flex items-center justify-center text-white flex-none"
                      style={{ background: FORM_COLORS[result] }}>{result}</span>
                    <div className="flex-1">
                      <p className="text-[11px] mb-1" style={{ color: '#4b4b6a' }}>{r.date} · {r.competition}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: r.home === club.shortName ? '#fff' : '#9ca3af' }}>{r.home}</span>
                        <span className="text-base font-black px-2 py-0.5 rounded" style={{ background: '#1a1a28', color: '#fff' }}>
                          {r.homeScore}–{r.awayScore}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: r.away === club.shortName ? '#fff' : '#9ca3af' }}>{r.away}</span>
                      </div>
                    </div>
                    <span className="text-lg" style={{ color: '#2a2a40' }}>›</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── UPCOMING FIXTURES ────────────────────────────────────────── */}
        {tab === 'fixtures' && (
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
            <div className="px-5 py-3" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
              <h2 className="text-xs font-black uppercase tracking-widest text-white">Upcoming Fixtures</h2>
            </div>
            <div style={{ background: '#0d0d1e' }}>
              {club.upcoming.length === 0 && <p className="text-center py-12 text-gray-500 text-sm">No upcoming fixtures available.</p>}
              {club.upcoming.map((f, i) => (
                <Link key={i} to={`/scores/${f.matchId}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
                  style={{ borderTop: i > 0 ? '1px solid #1a1a28' : undefined }}>
                  <div className="flex-none text-center w-16">
                    <p className="text-[10px] font-bold uppercase" style={{ color: '#00b341' }}>{f.date}</p>
                    <p className="text-base font-black text-white">{f.time}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] mb-1" style={{ color: '#4b4b6a' }}>{f.competition} · {f.venue}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: f.home === club.shortName ? '#fff' : '#9ca3af' }}>{f.home}</span>
                      <span className="text-xs font-black px-2 py-0.5 rounded" style={{ background: '#1a1a28', color: '#6b7280' }}>vs</span>
                      <span className="text-sm font-semibold" style={{ color: f.away === club.shortName ? '#fff' : '#9ca3af' }}>{f.away}</span>
                    </div>
                  </div>
                  <span className="text-lg" style={{ color: '#2a2a40' }}>›</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── STATS ───────────────────────────────────────────────────── */}
        {tab === 'stats' && (
          <div>
            {club.stats.length === 0 && <p className="text-center py-16 text-gray-500">Stats coming soon.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {club.stats.map(s => (
                <div key={s.label} className="rounded-lg px-5 py-5" style={{ background: '#0d0d1e', border: '1px solid #1e1e32' }}>
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#4b4b6a' }}>{s.label}</p>
                  <p className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display', color: club.primaryColor }}>{s.value}</p>
                  {s.sub && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Season W/D/L donut-style breakdown */}
            <div className="mt-6 rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e32' }}>
              <div className="px-5 py-3" style={{ background: '#12122a', borderBottom: '1px solid #1e1e32' }}>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Season Summary</h2>
              </div>
              <div className="px-5 py-6 flex gap-8 flex-wrap" style={{ background: '#0d0d1e' }}>
                {[
                  { label: 'Wins', value: club.w, color: '#22c55e', pct: Math.round(club.w/club.p*100) },
                  { label: 'Draws', value: club.d, color: '#6b7280', pct: Math.round(club.d/club.p*100) },
                  { label: 'Losses', value: club.l, color: '#e63946', pct: Math.round(club.l/club.p*100) },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-4">
                    <div className="relative w-14 h-14">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1a1a28" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke={s.color} strokeWidth="3"
                          strokeDasharray={`${s.pct} ${100 - s.pct}`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{s.value}</div>
                    </div>
                    <div>
                      <p className="text-lg font-black" style={{ color: s.color }}>{s.pct}%</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{s.label}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 ml-auto">
                  <div>
                    <p className="text-sm font-bold text-white mb-1">Goals Scored: <span style={{ color: '#22c55e' }}>{club.gf}</span></p>
                    <p className="text-sm font-bold text-white">Goals Conceded: <span style={{ color: '#e63946' }}>{club.ga}</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

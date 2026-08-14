import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'

interface RawQuestion {
  id: number
  text: string
  correct: string
  incorrect: string[]
  explanation: string
}

interface ActiveQuestion {
  id: number
  text: string
  options: string[]
  answerIndex: number
  explanation: string
}

const QUESTION_BANK: RawQuestion[] = [
  {
    id: 1,
    text: 'Which club won the Premier League title undefeated during the 2003/04 season?',
    correct: 'Arsenal',
    incorrect: ['Manchester United', 'Chelsea', 'Liverpool'],
    explanation: 'Arsenal went undefeated (26 wins, 12 draws) during the 2003/04 season under Arsène Wenger.',
  },
  {
    id: 2,
    text: 'Who holds the record for most goals scored in a single Premier League season (36 goals)?',
    correct: 'Erling Haaland',
    incorrect: ['Alan Shearer', 'Mohamed Salah', 'Thierry Henry'],
    explanation: 'Erling Haaland scored 36 goals in his debut 2022/23 Premier League season with Manchester City.',
  },
  {
    id: 3,
    text: 'Which country won the 2023 Africa Cup of Nations (AFCON) on home soil?',
    correct: 'Ivory Coast',
    incorrect: ['Nigeria', 'Egypt', 'Senegal'],
    explanation: 'Ivory Coast hosted and won AFCON 2023, defeating Nigeria 2-1 in the final.',
  },
  {
    id: 4,
    text: 'Which player has won the most UEFA Champions League titles in history (6 titles)?',
    correct: 'Luka Modrić & Dani Carvajal',
    incorrect: ['Cristiano Ronaldo', 'Lionel Messi', 'Karim Benzema'],
    explanation: 'Modrić and Carvajal won their 6th UEFA Champions League title with Real Madrid in 2024.',
  },
  {
    id: 5,
    text: 'Which club holds the record for the most Kenyan Premier League (KPL) titles?',
    correct: 'Gor Mahia FC',
    incorrect: ['AFC Leopards', 'Tusker FC', 'Sofapaka FC'],
    explanation: 'Gor Mahia FC hold the record with 21 Kenyan Premier League championships.',
  },
  {
    id: 6,
    text: 'Who is the all-time leading goalscorer in international men’s football history?',
    correct: 'Cristiano Ronaldo',
    incorrect: ['Ali Daei', 'Lionel Messi', 'Pele'],
    explanation: 'Cristiano Ronaldo holds the international record with over 130 goals for Portugal.',
  },
  {
    id: 7,
    text: 'Which country won the FIFA Men’s World Cup in 2022?',
    correct: 'Argentina',
    incorrect: ['France', 'Croatia', 'Brazil'],
    explanation: 'Argentina defeated France on penalties after a 3-3 thriller in Lusail, Qatar.',
  },
  {
    id: 8,
    text: 'Who won the 2024 Men’s Ballon d’Or award?',
    correct: 'Rodri',
    incorrect: ['Vinicius Jr.', 'Jude Bellingham', 'Dani Carvajal'],
    explanation: 'Manchester City and Spain midfielder Rodri won the 2024 Ballon d’Or following Euro 2024 victory.',
  },
  {
    id: 9,
    text: 'Which manager won the European Treble with Barcelona (2009) and Manchester City (2023)?',
    correct: 'Pep Guardiola',
    incorrect: ['Carlo Ancelotti', 'José Mourinho', 'Zinedine Zidane'],
    explanation: 'Pep Guardiola is the first manager in history to win continental trebles with two different clubs.',
  },
  {
    id: 10,
    text: 'Which stadium is known as "The Theatre of Dreams"?',
    correct: 'Old Trafford',
    incorrect: ['Anfield', 'San Siro', 'Camp Nou'],
    explanation: 'Old Trafford, home of Manchester United, was famously dubbed "The Theatre of Dreams" by Sir Bobby Charlton.',
  },
  {
    id: 11,
    text: 'Which African player scored in the 2019 UEFA Champions League final for Liverpool?',
    correct: 'Mohamed Salah',
    incorrect: ['Sadio Mané', 'Riyad Mahrez', 'Didier Drogba'],
    explanation: 'Mohamed Salah scored an early penalty for Liverpool in their 2-0 victory against Tottenham in Madrid.',
  },
  {
    id: 12,
    text: 'Who scored the winning goal in the 2014 World Cup final for Germany against Argentina?',
    correct: 'Mario Götze',
    incorrect: ['Thomas Müller', 'Miroslav Klose', 'Bastian Schweinsteiger'],
    explanation: 'Mario Götze scored a volley in extra-time (113th minute) to give Germany a 1-0 victory.',
  },
]

// Fisher-Yates Shuffle
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function generateFreshQuiz(): ActiveQuestion[] {
  const sampledQuestions = shuffle(QUESTION_BANK).slice(0, 5)
  return sampledQuestions.map(q => {
    const allOptions = shuffle([q.correct, ...q.incorrect])
    const answerIndex = allOptions.indexOf(q.correct)
    return {
      id: q.id,
      text: q.text,
      options: allOptions,
      answerIndex,
      explanation: q.explanation,
    }
  })
}

export default function Quiz() {
  const { t } = useApp()
  const [questions, setQuestions] = useState<ActiveQuestion[]>(() => generateFreshQuiz())
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

  const currentQ = questions[currentIdx]

  const handleSelectOption = (index: number) => {
    if (selectedOption !== null) return
    setSelectedOption(index)
    setShowExplanation(true)
    if (index === currentQ.answerIndex) {
      setScore(prev => prev + 1)
    }
  }

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1)
      setSelectedOption(null)
      setShowExplanation(false)
    } else {
      setIsFinished(true)
    }
  }

  const handleGenerateNewQuiz = () => {
    setQuestions(generateFreshQuiz())
    setCurrentIdx(0)
    setSelectedOption(null)
    setScore(0)
    setShowExplanation(false)
    setIsFinished(false)
  }

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#0a1a14 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">DYNAMIC TRIVIA ENGINE</span>
              <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                Endless Football Quiz
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Questions and options are dynamically generated every round. You’ll never see the same quiz twice!
              </p>
            </div>

            <button
              onClick={handleGenerateNewQuiz}
              className="px-4 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition-all hover:opacity-90 flex items-center gap-2"
              style={{ background: '#00b341' }}
            >
              🎲 New Random Quiz
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Leaderboard Ad */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        <div className="max-w-2xl mx-auto">
          {!isFinished && currentQ ? (
            <div className="p-6 sm:p-8 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              {/* Progress */}
              <div className="flex justify-between items-center text-xs mb-4">
                <span className="text-gray-400">Question {currentIdx + 1} of {questions.length}</span>
                <span className="font-bold text-[#00b341]">Current Score: {score}</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden bg-[#1a1a28] mb-6">
                <div
                  className="h-full bg-[#00b341] transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Text */}
              <h2 className="text-xl font-bold text-white mb-6 leading-snug">
                {currentQ.text}
              </h2>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {currentQ.options.map((opt, i) => {
                  let bg = '#0d0d1e'
                  let border = '#1e1e32'
                  if (selectedOption !== null) {
                    if (i === currentQ.answerIndex) {
                      bg = 'rgba(34,197,94,0.2)'
                      border = '#22c55e'
                    } else if (i === selectedOption) {
                      bg = 'rgba(239,68,68,0.2)'
                      border = '#ef4444'
                    }
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(i)}
                      disabled={selectedOption !== null}
                      className="w-full text-left p-4 rounded-xl border text-sm font-semibold text-white transition-all hover:border-[#00b341]"
                      style={{ background: bg, borderColor: border }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>

              {/* Explanation & Next */}
              {showExplanation && (
                <div className="p-4 rounded-xl border border-[#00b341]/40 mb-6" style={{ background: 'rgba(0,179,65,0.1)' }}>
                  <p className="text-xs text-gray-300 leading-relaxed">{currentQ.explanation}</p>
                </div>
              )}

              {selectedOption !== null && (
                <button
                  onClick={handleNext}
                  className="w-full py-3.5 text-xs font-bold text-white rounded-xl transition-all"
                  style={{ background: '#00b341' }}
                >
                  {currentIdx < questions.length - 1 ? 'Next Question →' : 'See Final Score 🏆'}
                </button>
              )}
            </div>
          ) : (
            /* Results Screen */
            <div className="p-8 rounded-2xl border border-[#00b341] text-center" style={{ background: '#131320' }}>
              <span className="text-5xl mb-4 block">🏆</span>
              <h2 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>
                Quiz Completed!
              </h2>
              <p className="text-lg font-bold text-[#00b341] mb-6">
                You scored {score} out of {questions.length} ({Math.round((score / questions.length) * 100)}%)
              </p>

              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={handleGenerateNewQuiz}
                  className="px-6 py-3 text-xs font-bold text-white rounded-xl shadow-lg"
                  style={{ background: '#00b341' }}
                >
                  🎲 Play Another Random Quiz
                </button>
                <Link
                  to="/news"
                  className="px-6 py-3 text-xs font-bold text-gray-300 rounded-xl border border-[#1e1e32] hover:text-white"
                >
                  Back to News
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

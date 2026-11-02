import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';
import { QuizItem } from '../types';

interface Props {
  onBack: () => void;
  token?: string | null;
  onRewardEarned?: (credits: number) => void;
}

export const QuizScreen: React.FC<Props> = ({ onBack, token, onRewardEarned }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({
    0: 'C' // matching mockup default selection!
  });
  const [timeLeft, setTimeLeft] = useState(107); // 01:47 as shown in mockup
  const [quizData, setQuizData] = useState<QuizItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<any>(null);

  const fallbackQuestions = [
    {
      questionNumber: 1,
      questionText: 'What combines the outward manifestation od the computer-based syatem, coupled with all supporting information thatdescribe system systax and semantics?',
      options: [
        { key: 'A', text: 'Mental Image' },
        { key: 'B', text: 'Interface Design' },
        { key: 'C', text: 'System Image' },
        { key: 'D', text: 'Interface Validation' }
      ],
      correctKey: 'C',
      explanation: 'System Image is the outward manifestation of the system including documentation and guides.'
    },
    {
      questionNumber: 2,
      questionText: 'Which principle ensures users can easily recognize actions, options, and objects rather than recalling information from memory?',
      options: [
        { key: 'A', text: 'Recognition rather than recall' },
        { key: 'B', text: 'Flexibility of use' },
        { key: 'C', text: 'Aesthetic and minimalist design' },
        { key: 'D', text: 'Error prevention' }
      ],
      correctKey: 'A',
      explanation: 'Minimize memory load by making objects and actions visible.'
    },
    {
      questionNumber: 3,
      questionText: 'What is the optimal thumb reach zone on modern touch smartphones according to Steven Hoober research?',
      options: [
        { key: 'A', text: 'Top left corner' },
        { key: 'B', text: 'Bottom natural sweep area' },
        { key: 'C', text: 'Top notification shade' },
        { key: 'D', text: 'Right bezel edge only' }
      ],
      correctKey: 'B',
      explanation: '75% of one-handed interactions occur in the bottom natural sweep zone.'
    },
    {
      questionNumber: 4,
      questionText: 'Which law describes how the time required to rapidly move to a target area is a function of the ratio between distance and width?',
      options: [
        { key: 'A', text: "Moore's Law" },
        { key: 'B', text: "Fitts's Law" },
        { key: 'C', text: "Hick's Law" },
        { key: 'D', text: "Miller's Rule" }
      ],
      correctKey: 'B',
      explanation: "Fitts's Law dictates that target size and distance control acquisition speed."
    },
    {
      questionNumber: 5,
      questionText: 'In mobile touch interface design, what is the recommended minimum touch target size according to modern HIG and Material Design?',
      options: [
        { key: 'A', text: '24 x 24 dp' },
        { key: 'B', text: '48 x 48 dp' },
        { key: 'C', text: '80 x 80 dp' },
        { key: 'D', text: '12 x 12 dp' }
      ],
      correctKey: 'B',
      explanation: '48x48 dp allows reliable human finger tapping.'
    },
    {
      questionNumber: 6,
      questionText: 'Which cognitive load type directly contributes to learning and building mental schemas?',
      options: [
        { key: 'A', text: 'Extraneous load' },
        { key: 'B', text: 'Germane load' },
        { key: 'C', text: 'Intrinsic overload' },
        { key: 'D', text: 'Distractive load' }
      ],
      correctKey: 'B',
      explanation: 'Germane load is the mental effort dedicated to processing and constructing understanding.'
    },
    {
      questionNumber: 7,
      questionText: 'What color contrast ratio is required for normal text under WCAG 2.1 Level AA standards?',
      options: [
        { key: 'A', text: '3:1' },
        { key: 'B', text: '4.5:1' },
        { key: 'C', text: '7:1' },
        { key: 'D', text: '10:1' }
      ],
      correctKey: 'B',
      explanation: 'WCAG 2.1 AA mandates at least 4.5:1 contrast for normal body text.'
    }
  ];

  useEffect(() => {
    loadQuiz();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, submitted]);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const res = await api.getQuizzes();
      if (res && res.success && res.data && res.data.length > 0) {
        const fullQuiz = await api.getQuiz(res.data[0]._id);
        if (fullQuiz && fullQuiz.data) {
          setQuizData(fullQuiz.data);
          setLoading(false);
          return;
        }
      }
    } catch {}

    setQuizData({
      _id: 'mock_quiz_1',
      title: 'HCI & System Interface Validation Quiz',
      subject: 'UI/UX Design',
      category: 'Design & Software Architecture',
      totalTimeSeconds: 120,
      questions: fallbackQuestions
    });
    setLoading(false);
  };

  const questions = quizData?.questions || fallbackQuestions;
  const currentQ = questions[currentIdx];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (key: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIdx]: key
    });
  };

  const handleNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Submit Quiz
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleSubmit = async () => {
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctKey) {
        correctCount += 1;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const earnedBonus = score >= 70 ? 10 : 0;

    setScoreResult({
      total: questions.length,
      correct: correctCount,
      score,
      bonus: earnedBonus
    });
    setSubmitted(true);

    if (earnedBonus > 0 && onRewardEarned) {
      onRewardEarned(earnedBonus);
    }

    try {
      if (quizData && quizData._id && !quizData._id.startsWith('mock')) {
        await api.submitQuiz(token || null, quizData._id, selectedAnswers);
      }
    } catch {}
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (submitted && scoreResult) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="close" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Results</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.resultContainer}>
          <View style={styles.resultBadge}>
            <Ionicons
              name={scoreResult.score >= 70 ? 'trophy' : 'ribbon-outline'}
              size={48}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.resultScoreText}>{scoreResult.score}%</Text>
          <Text style={styles.resultSubText}>
            You answered {scoreResult.correct} out of {scoreResult.total} questions correctly!
          </Text>

          {scoreResult.bonus > 0 ? (
            <View style={styles.rewardCard}>
              <Ionicons name="sparkles" size={20} color={COLORS.accent} />
              <Text style={styles.rewardText}>
                Congratulations! You earned +{scoreResult.bonus} Learning Credits!
              </Text>
            </View>
          ) : (
            <Text style={styles.tryAgainText}>Score 70% or higher to earn +10 Learning Credits.</Text>
          )}

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setSubmitted(false);
              setCurrentIdx(0);
              setTimeLeft(120);
            }}
          >
            <Text style={styles.retryButtonText}>Retake Quiz</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header with Progress Numbers (1) (2) (3) (4) [5] (6) (7) */}
      <View style={styles.topProgressWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.numbersRow}>
          {questions.map((_, index) => {
            const isCurrent = currentIdx === index;
            const isAnswered = selectedAnswers[index] !== undefined;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.numberCircle,
                  isCurrent && styles.numberCircleCurrent,
                  isAnswered && !isCurrent && styles.numberCircleAnswered
                ]}
                onPress={() => setCurrentIdx(index)}
              >
                <Text
                  style={[
                    styles.numberText,
                    isCurrent && styles.numberTextCurrent,
                    isAnswered && !isCurrent && styles.numberTextAnswered
                  ]}
                >
                  {index + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Timer Badge */}
        <View style={styles.timerRow}>
          <Text style={styles.timerText}>{formatTimer(timeLeft)}</Text>
        </View>

        {/* Question Text */}
        <Text style={styles.questionText}>{currentQ.questionText}</Text>

        {/* Options List */}
        <View style={styles.optionsList}>
          {currentQ.options.map((opt) => {
            const isSelected = selectedAnswers[currentIdx] === opt.key;

            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.85}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleSelectOption(opt.key)}
              >
                <Text style={[styles.optionKeyText, isSelected && styles.optionKeyTextSelected]}>
                  {opt.key}.
                </Text>
                <Text style={[styles.optionLabelText, isSelected && styles.optionLabelTextSelected]}>
                  {opt.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Navigation Buttons: Back and Next */}
      <View style={styles.bottomActionsBar}>
        <TouchableOpacity
          style={[styles.backNavBtn, currentIdx === 0 && { opacity: 0.5 }]}
          disabled={currentIdx === 0}
          onPress={handleBack}
        >
          <Text style={styles.backNavBtnText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextNavBtn} activeOpacity={0.85} onPress={handleNext}>
          <Text style={styles.nextNavBtnText}>
            {currentIdx === questions.length - 1 ? 'Submit' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  topProgressWrapper: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF'
  },
  numbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  numberCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  numberCircleCurrent: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primaryLight
  },
  numberCircleAnswered: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1'
  },
  numberText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  numberTextCurrent: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  numberTextAnswered: {
    color: COLORS.textPrimary
  },
  content: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30
  },
  timerRow: {
    marginBottom: 16
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 24
  },
  optionsList: {
    gap: 14
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#F0FDF4'
  },
  optionKeyText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 10
  },
  optionKeyTextSelected: {
    color: COLORS.primaryDark
  },
  optionLabelText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1
  },
  optionLabelTextSelected: {
    fontWeight: '700',
    color: COLORS.primaryDark
  },
  bottomActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 70
  },
  backNavBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14
  },
  backNavBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  nextNavBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 14
  },
  nextNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  resultBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  resultScoreText: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8
  },
  resultSubText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginBottom: 24
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E'
  },
  tryAgainText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 20
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  }
});

import { Colors, DementiaUX, Spacing } from '@/constants/theme';
import { soundManager } from '@/services/audio';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

interface CardSubject {
  typeId: string;
  name: string;
  image: any;
}

// 8 distinct image subjects - each appears exactly twice for a 4x4 grid (16 cards total)
const CARD_SUBJECTS: CardSubject[] = [
  {
    typeId: 'flower',
    name: 'ফুল',
    image: require('@/assets/images/cards/flower.png'),
  },
  {
    typeId: 'diya',
    name: 'প্রদীপ',
    image: require('@/assets/images/cards/diya.png'),
  },
  {
    typeId: 'radio',
    name: 'রেডিও',
    image: require('@/assets/images/cards/radio.png'),
  },
  {
    typeId: 'instrument',
    name: 'একতারা',
    image: require('@/assets/images/cards/instrument.png'),
  },
  {
    typeId: 'fruit',
    name: 'ফল',
    image: require('@/assets/images/cards/fruit.png'),
  },
  {
    typeId: 'bird',
    name: 'পাখি',
    image: require('@/assets/images/cards/bird.png'),
  },
  {
    typeId: 'teapot',
    name: 'কেতলি',
    image: require('@/assets/images/cards/teapot.png'),
  },
  {
    typeId: 'handfan',
    name: 'হাতপাখা',
    image: require('@/assets/images/cards/handfan.png'),
  },
];

interface GameCard {
  cardId: number;
  typeId: string;
  name: string;
  image: any;
}

/**
 * Creates 16 cards (8 pairs) and shuffles their positions using Fisher-Yates algorithm.
 */
function createShuffledDeck(): GameCard[] {
  const deck: GameCard[] = [];
  let idCounter = 1;

  // Each subject appears exactly twice
  CARD_SUBJECTS.forEach((subject) => {
    deck.push({
      cardId: idCounter++,
      typeId: subject.typeId,
      name: subject.name,
      image: subject.image,
    });
    deck.push({
      cardId: idCounter++,
      typeId: subject.typeId,
      name: subject.name,
      image: subject.image,
    });
  });

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }

  return deck;
}

export default function ChenaChobiScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  // Game state - deck initialized with initial shuffled cards
  const [cards, setCards] = useState<GameCard[]>(createShuffledDeck);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [matchedCardIds, setMatchedCardIds] = useState<number[]>([]);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const evaluationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize or reset game (called on "আবার খেলুন")
  const startNewGame = useCallback(() => {
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }
    soundManager.stop();
    setCards(createShuffledDeck());
    setSelectedCardIds([]);
    setMatchedCardIds([]);
    setIsEvaluating(false);
  }, []);

  // Cleanup timers & audio on unmount
  useEffect(() => {
    return () => {
      if (evaluationTimeoutRef.current) {
        clearTimeout(evaluationTimeoutRef.current);
      }
      soundManager.stop();
    };
  }, []);

  const handleBack = () => {
    soundManager.stop();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(patient)');
    }
  };

  const handleCardPress = (card: GameCard) => {
    // RAPID-TAP & INVALID SELECTION PROTECTION:
    // 1. Ignore if currently evaluating two cards
    if (isEvaluating) return;
    // 2. Ignore if card is already matched
    if (matchedCardIds.includes(card.cardId)) return;
    // 3. Ignore if card is already the first selected card
    if (selectedCardIds.includes(card.cardId)) return;

    if (selectedCardIds.length === 0) {
      // First card selected
      setSelectedCardIds([card.cardId]);
    } else if (selectedCardIds.length === 1) {
      // Second card selected
      const firstCardId = selectedCardIds[0];
      const firstCard = cards.find((c) => c.cardId === firstCardId);
      const newSelected = [firstCardId, card.cardId];
      setSelectedCardIds(newSelected);

      if (!firstCard) return;

      if (firstCard.typeId === card.typeId) {
        // MATCH:
        // Keep both permanently revealed, mark both matched
        const newMatched = [...matchedCardIds, firstCardId, card.cardId];
        setMatchedCardIds(newMatched);
        setSelectedCardIds([]);

        // Play short success chime, then Bengali voice "খুব ভালো"
        soundManager.playMatchSuccessSequence();
      } else {
        // NO MATCH:
        // Lock tapping, keep both visible briefly, then flip back gently.
        // No error sound, no red X, no negative feedback.
        setIsEvaluating(true);
        evaluationTimeoutRef.current = setTimeout(() => {
          setSelectedCardIds([]);
          setIsEvaluating(false);
        }, 1000);
      }
    }
  };

  const isGameCompleted = matchedCardIds.length === 16;
  const matchedPairsCount = matchedCardIds.length / 2;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* Dementia-Friendly Large Back Button */}
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel="ফিরে যান, খেলা তালিকায় ফেরত যাবেন"
        style={({ pressed }) => [
          styles.backButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}>
        <Text style={[styles.backButtonIcon, { color: colors.brand }]}>←</Text>
        <Text style={[styles.backButtonText, { color: colors.brand }]}>
          ফিরে যান • Back
        </Text>
      </Pressable>

      {/* Screen Title & Short Bengali Instruction */}
      <View style={styles.headerSection}>
        <Text style={[styles.title, { color: colors.text }]}>
          ছবি মেলানো
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Match Familiar Pictures
        </Text>

        {/* Gentle Bengali Instruction */}
        <View
          style={[
            styles.instructionBanner,
            { backgroundColor: colors.brandLight, borderColor: colors.border },
          ]}>
          <Text style={styles.instructionIcon}>🌸</Text>
          <Text style={[styles.instructionText, { color: colors.brand }]}>
            একই ছবির জোড়া খুঁজে নিন
          </Text>
        </View>
      </View>

      {/* Gentle Status Area */}
      <View
        style={[
          styles.statusCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}>
        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
          খেলার অগ্রগতি • 4x4 Grid
        </Text>
        <Text style={[styles.statusHint, { color: colors.text }]}>
          জোড়া মিলেছে: {matchedPairsCount} / ৮
        </Text>
      </View>

      {/* 4x4 Card Grid (16 Cards) */}
      <View style={styles.grid}>
        {cards.map((card) => {
          const isSelected = selectedCardIds.includes(card.cardId);
          const isMatched = matchedCardIds.includes(card.cardId);
          const isRevealed = isSelected || isMatched;

          return (
            <Pressable
              key={card.cardId}
              onPress={() => handleCardPress(card)}
              accessibilityRole="button"
              accessibilityLabel={
                isRevealed ? `${card.name} ছবি` : 'বন্ধ কার্ড'
              }
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isRevealed ? colors.brand : colors.border,
                  opacity: pressed && !isEvaluating && !isMatched ? 0.88 : 1,
                  transform: [
                    {
                      scale: pressed && !isEvaluating && !isMatched ? 0.96 : 1,
                    },
                  ],
                },
              ]}>
              {isRevealed ? (
                /* Revealed Card Content: Local Image Asset */
                <View style={styles.cardImageContainer}>
                  <Image
                    source={card.image}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                  <Text
                    style={[styles.cardLabel, { color: colors.text }]}
                    numberOfLines={1}>
                    {card.name}
                  </Text>
                </View>
              ) : (
                /* Hidden State: Simple, Dignified Card-Back Motif */
                <View
                  style={[
                    styles.cardBackInner,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.borderHighlight,
                    },
                  ]}>
                  <Text style={styles.cardBackMotif}>🌸</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Game Completion State */}
      {isGameCompleted && (
        <View
          style={[
            styles.completionCard,
            { backgroundColor: colors.surface, borderColor: colors.olive },
          ]}>
          <Text style={styles.completionEmoji}>🎉</Text>
          <Text style={[styles.completionTitle, { color: colors.olive }]}>
            খুব ভালো!
          </Text>
          <Text style={[styles.completionSubtitle, { color: colors.text }]}>
            সব ছবি মিলে গেছে।
          </Text>

          {/* Play Again Button */}
          <Pressable
            onPress={startNewGame}
            accessibilityRole="button"
            accessibilityLabel="আবার খেলুন"
            style={({ pressed }) => [
              styles.playAgainButton,
              {
                backgroundColor: colors.brand,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}>
            <Text style={styles.playAgainText}>আবার খেলুন</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Spacing.seven,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  backButtonIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSection: {
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 1,
    marginBottom: Spacing.two,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    gap: Spacing.two,
  },
  instructionIcon: {
    fontSize: 22,
  },
  instructionText: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  statusCard: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    marginBottom: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusHint: {
    fontSize: 14,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  card: {
    width: '23%',
    aspectRatio: 1,
    minHeight: 72,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: '72%',
    height: '72%',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  cardBackInner: {
    width: '100%',
    height: '100%',
    borderRadius: DementiaUX.borderRadiusMedium - 3,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackMotif: {
    fontSize: 26,
  },
  completionCard: {
    marginTop: Spacing.four,
    padding: Spacing.four,
    borderRadius: DementiaUX.borderRadiusLarge,
    borderWidth: 2,
    alignItems: 'center',
    gap: Spacing.two,
  },
  completionEmoji: {
    fontSize: 48,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '900',
  },
  completionSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  playAgainButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: DementiaUX.borderRadiusMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playAgainText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
});

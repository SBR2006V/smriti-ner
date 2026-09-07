import { Colors, DementiaUX, Spacing } from '@/constants/theme';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

export default function ListenScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const audioCategories = [
    {
      title: 'কে আমি?',
      english: 'Who Am I? • Personal Identity',
      emoji: '🪞',
      tag: 'স্মৃতি ও পরিচয়',
      desc: 'চেনা মানুষের কণ্ঠ, প্রিয়জনদের স্মৃতি ও নিজের পরিচয়',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* Friendly Warm Bengali Greeting */}
      <View style={[styles.welcomeCard, { backgroundColor: colors.oliveLight, borderColor: colors.border }]}>
        <Text style={styles.welcomeEmoji}>📻</Text>
        <View style={styles.welcomeTextGroup}>
          <Text style={[styles.welcomeGreeting, { color: colors.olive }]}>
            গান ও গল্প শুনুন
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.text }]}>
            আপনার প্রিয় মানুষজনের স্মৃতির কথা
          </Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          পছন্দের বিষয় বেছে নিন • Select Category
        </Text>
      </View>

      {/* Oversized Cultural Audio Cards (Placeholders) */}
      <View style={styles.cardList}>
        {audioCategories.map((item, idx) => (
          <Pressable
            key={idx}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.backgroundElement },
              ]}>
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
            </View>
            <View style={styles.cardTextGroup}>
              <View style={styles.tagRow}>
                <Text style={[styles.tag, { backgroundColor: colors.oliveLight, color: colors.olive }]}>
                  {item.tag}
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.cardEnglish, { color: colors.textSecondary }]}>
                {item.english}
              </Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                {item.desc}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Spacing.six,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: DementiaUX.borderRadiusLarge,
    borderWidth: 1.5,
    marginBottom: Spacing.four,
    gap: Spacing.three,
  },
  welcomeEmoji: {
    fontSize: 42,
  },
  welcomeTextGroup: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 26,
    fontWeight: '900',
  },
  welcomeSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },

  sectionHeader: {
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  cardList: {
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    padding: Spacing.four,
    borderRadius: DementiaUX.borderRadiusLarge,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: Spacing.four,
    minHeight: 110,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 36,
  },
  cardTextGroup: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  cardEnglish: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#0f0f0f']}
        style={StyleSheet.absoluteFill}
      />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>c</Text>
          <View style={styles.logoAccent} />
        </View>
        <Text style={styles.appName}>cSocial</Text>
        <Text style={styles.tagline}>Track every send.{'\n'}Build your legacy.</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {[
          { emoji: '🧗', text: 'Log every climb & track your progression' },
          { emoji: '📊', text: 'Grade pyramids, heatmaps & deep stats' },
          { emoji: '🏆', text: 'Compete on leaderboards with friends' },
          { emoji: '⚡', text: 'Earn XP, unlock achievements & level up' },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Text style={styles.featureEmoji}>{f.emoji}</Text>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <SafeAreaView style={styles.ctas}>
        <Button
          title="Get Started"
          onPress={() => router.push('/(auth)/register')}
          size="lg"
          style={styles.primaryBtn}
        />
        <Button
          title="I already have an account"
          onPress={() => router.push('/(auth)/login')}
          variant="ghost"
          size="lg"
          style={styles.secondaryBtn}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  logoContainer: { position: 'relative', marginBottom: Spacing.md },
  logoText: {
    fontSize: 80,
    fontWeight: FontWeight.heavy,
    color: Colors.primary,
    letterSpacing: -4,
  },
  logoAccent: {
    position: 'absolute',
    bottom: 10,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  appName: {
    fontSize: FontSize.xxxl + 8,
    fontWeight: FontWeight.heavy,
    color: Colors.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 30,
  },
  features: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureEmoji: { fontSize: 24 },
  featureText: { color: Colors.text, fontSize: FontSize.md, flex: 1 },
  ctas: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  primaryBtn: { width: '100%' },
  secondaryBtn: { width: '100%' },
});

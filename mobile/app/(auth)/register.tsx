import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, GRADES } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { GradeBadge } from '../../src/components/ui/Badge';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Step 2 (optional)
  const [yearsClimbing, setYearsClimbing] = useState('');
  const [hardestSend, setHardestSend] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !displayName.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await api.auth.register({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
      });

      if (result.success && result.data) {
        await setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);

        // Update optional info
        if (yearsClimbing || hardestSend) {
          await api.users.updateMe({
            yearsClimbing: yearsClimbing ? parseInt(yearsClimbing) : undefined,
            hardestSend: hardestSend || undefined,
          });
        }

        router.replace('/(tabs)');
      } else {
        Alert.alert('Registration Failed', result.message ?? 'Please try again');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => (step > 1 ? setStep(step - 1) : router.back())}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Progress */}
        <View style={styles.progress}>
          {[1, 2].map((s) => (
            <View key={s} style={[styles.progressDot, step >= s && styles.progressDotActive]} />
          ))}
        </View>

        {step === 1 && (
          <>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Join thousands of climbers tracking their progression</Text>

            <Input label="Display Name" value={displayName} onChangeText={setDisplayName} icon="person-outline" placeholder="Your Name" autoCapitalize="words" />
            <Input label="Username" value={username} onChangeText={setUsername} icon="at-outline" placeholder="username" autoCapitalize="none" autoCorrect={false} />
            <Input label="Email" value={email} onChangeText={setEmail} icon="mail-outline" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry icon="lock-closed-outline" placeholder="8+ characters" />

            <Button title="Continue" onPress={() => setStep(2)} size="lg" style={styles.btn} disabled={!username || !email || !password || !displayName} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>Climbing profile</Text>
            <Text style={styles.subtitle}>Tell us about your climbing (optional)</Text>

            <Input
              label="Years Climbing"
              value={yearsClimbing}
              onChangeText={setYearsClimbing}
              keyboardType="number-pad"
              icon="calendar-outline"
              placeholder="e.g. 3"
            />

            <Text style={styles.gradeLabel}>Hardest Send</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gradeScroll} contentContainerStyle={styles.gradeScrollContent}>
              {GRADES.slice(1).map((grade) => (
                <TouchableOpacity key={grade} onPress={() => setHardestSend(grade === hardestSend ? '' : grade)} style={styles.gradeBtn}>
                  <GradeBadge grade={grade} size="md" />
                  {grade === hardestSend && <Ionicons name="checkmark-circle" size={14} color={Colors.success} style={styles.gradeCheck} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button title="Create Account" onPress={handleRegister} loading={loading} size="lg" style={styles.btn} />
            <Button title="Skip for now" onPress={handleRegister} variant="ghost" size="md" style={{ marginTop: Spacing.sm }} />
          </>
        )}

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl },
  back: { marginBottom: Spacing.md },
  progress: { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
  progressDot: { width: 32, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  progressDotActive: { backgroundColor: Colors.primary },
  title: { fontSize: FontSize.xxxl, fontWeight: FontWeight.heavy, color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  btn: { width: '100%', marginTop: Spacing.md },
  gradeLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  gradeScroll: { marginBottom: Spacing.xl },
  gradeScrollContent: { gap: 8, paddingBottom: 8 },
  gradeBtn: { position: 'relative' },
  gradeCheck: { position: 'absolute', top: -4, right: -4 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  loginText: { color: Colors.textSecondary, fontSize: FontSize.md },
  loginLink: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});

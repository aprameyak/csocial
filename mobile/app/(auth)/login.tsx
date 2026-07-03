import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.includes('@')) newErrors.email = 'Enter a valid email';
    if (password.length < 6) newErrors.password = 'Password is too short';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await api.auth.login(email.trim().toLowerCase(), password);
      if (result.success && result.data) {
        await setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', result.message ?? 'Invalid credentials');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Login failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to your cSocial account</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          icon="mail-outline"
          error={errors.email}
          containerStyle={styles.input}
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          icon="lock-closed-outline"
          error={errors.password}
          containerStyle={styles.input}
          placeholder="••••••••"
        />

        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button
          title="Log In"
          onPress={handleLogin}
          loading={loading}
          size="lg"
          style={styles.submitBtn}
        />

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl },
  back: { marginBottom: Spacing.xl },
  title: { fontSize: FontSize.xxxl, fontWeight: FontWeight.heavy, color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  input: { marginBottom: Spacing.sm },
  forgotRow: { alignItems: 'flex-end', marginBottom: Spacing.xl },
  forgotText: { color: Colors.primary, fontSize: FontSize.sm },
  submitBtn: { width: '100%', marginBottom: Spacing.xl },
  signupRow: { flexDirection: 'row', justifyContent: 'center' },
  signupText: { color: Colors.textSecondary, fontSize: FontSize.md },
  signupLink: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
